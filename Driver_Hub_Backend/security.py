import os, time, json, base64, hashlib, hmac
SECRET = os.getenv("DRIVER_HUB_SECRET", "dev-only-change-this-secret")

def hash_password(password):
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200000)
    return base64.b64encode(salt + digest).decode()

def verify_password(password, stored):
    try:
        raw = base64.b64decode(stored)
        return hmac.compare_digest(raw[16:], hashlib.pbkdf2_hmac("sha256", password.encode(), raw[:16], 200000))
    except Exception:
        return False

def b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def create_token(user):
    now = int(time.time())
    header = b64(json.dumps({"alg":"HS256","typ":"JWT"},separators=(",",":")).encode())
    payload = b64(json.dumps({"sub":user["id"],"role":user["role"],"email":user["email"],"iat":now,"exp":now+43200},separators=(",",":")).encode())
    msg = f"{header}.{payload}"
    sig = b64(hmac.new(SECRET.encode(),msg.encode(),hashlib.sha256).digest())
    return f"{msg}.{sig}"

def read_token(token):
    try:
        head,payload,sig = token.split(".")
        msg=f"{head}.{payload}"
        expected=b64(hmac.new(SECRET.encode(),msg.encode(),hashlib.sha256).digest())
        if not hmac.compare_digest(sig,expected): return None
        data=json.loads(base64.urlsafe_b64decode(payload+"="*(-len(payload)%4)))
        return data if data["exp"] >= int(time.time()) else None
    except Exception:
        return None
