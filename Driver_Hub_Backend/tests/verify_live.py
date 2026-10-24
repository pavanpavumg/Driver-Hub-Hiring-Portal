import urllib.request
import json

def post(url, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def get(url, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def patch(url, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers, method='PATCH')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

if __name__ == '__main__':
    print("=== TESTING DRIVER HUB END-TO-END WORKFLOWS ===")
    
    # 1. Driver Login & Profile
    driver_login = post('http://127.0.0.1:8000/auth/login', {'email': 'driver@driverhub.com', 'password': 'Password123!'})
    d_tok = driver_login['access_token']
    print(f"[OK] Driver Login: {driver_login['user']['name']} ({driver_login['user']['role']})")
    
    driver_profile = get('http://127.0.0.1:8000/profile/me', d_tok)
    print(f"[OK] Driver Profile: Category={driver_profile.get('category')}, Exp={driver_profile.get('experience')} yrs, Skills={driver_profile.get('skills')}")
    
    driver_apps = get('http://127.0.0.1:8000/applications/me', d_tok)
    print(f"[OK] Driver Applications Sent: {len(driver_apps)}")

    # 2. Employer Login & Actions
    emp_login = post('http://127.0.0.1:8000/auth/login', {'email': 'employer@driverhub.com', 'password': 'Password123!'})
    e_tok = emp_login['access_token']
    print(f"[OK] Employer Login: {emp_login['user']['name']} ({emp_login['user']['company']})")

    emp_jobs = get('http://127.0.0.1:8000/employer/jobs', e_tok)
    print(f"[OK] Employer Active Job Postings: {len(emp_jobs)}")

    emp_apps = get('http://127.0.0.1:8000/employer/applications', e_tok)
    print(f"[OK] Employer Applications Received: {len(emp_apps)}")

    if emp_apps:
        app_id = emp_apps[0]['id']
        upd = patch(f'http://127.0.0.1:8000/applications/{app_id}/status', {'status': 'Shortlisted'}, e_tok)
        print(f"[OK] Candidate Status Updated to: {upd.get('status')}")

    candidates = get('http://127.0.0.1:8000/profile/candidates?category=Car+Driver', e_tok)
    print(f"[OK] Employer Candidate Talent Search: Found {len(candidates)} drivers in Car Driver category")

    # 3. Admin Login & Stats
    admin_login = post('http://127.0.0.1:8000/auth/login', {'email': 'admin@driverhub.com', 'password': 'Password123!'})
    a_tok = admin_login['access_token']
    print(f"[OK] Admin Login: {admin_login['user']['name']}")

    stats = get('http://127.0.0.1:8000/admin/stats', a_tok)
    print(f"[OK] Admin Stats: Total Users={stats['users']}, Drivers={stats['drivers']}, Employers={stats['employers']}, Jobs={stats['active_jobs']}, Apps={stats['applications']}")

    admin_apps = get('http://127.0.0.1:8000/admin/applications', a_tok)
    print(f"[OK] Admin Applications Oversight: {len(admin_apps)} applications listed")

    admin_users = get('http://127.0.0.1:8000/admin/users', a_tok)
    print(f"[OK] Admin User Management: {len(admin_users)} users managed")

    print("\n>>> ALL TEST WORKFLOWS PASSED 100% SUCCESSFULLY! <<<")
