const API_BASE_URL = window.DRIVER_HUB_API_URL !== undefined
  ? window.DRIVER_HUB_API_URL
  : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? (window.location.port === "8000" ? "" : "http://127.0.0.1:8000")
    : "";
const SESSION_KEY = "driverHubApiSession";

export const state = {
  currentRole: "driver",
  currentProfile: {}
};

export const $ = id => document.getElementById(id);
export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[character]));
export const money = amount => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

let toastTimer;

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function setSession(value) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(value));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 3200);
}

export function setApiStatus(connected, label) {
  const indicator = $("apiIndicator");
  if (indicator) {
    indicator.classList.toggle("is-online", connected);
    indicator.classList.toggle("is-offline", !connected && label !== "Connecting");
  }
  const text = $("apiStatusText");
  if (text) text.textContent = label;
}


export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined) headers.set("Content-Type", "application/json");

  const activeSession = getSession();
  if (activeSession?.access_token) {
    headers.set("Authorization", `Bearer ${activeSession.access_token}`);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch {
    const error = new Error(`Cannot reach the Driver Hub API at ${API_BASE_URL}. Start the backend and retry.`);
    error.name = "NetworkError";
    throw error;
  }

  setApiStatus(true, "API connected");
  const result = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && activeSession) {
      clearSession();
      window.dispatchEvent(new Event("driverhub:session-expired"));
    }

    const detail = result?.detail;
    const message = typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map(item => item.msg).filter(Boolean).join(" ")
        : `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return result;
}

export function run(action, control) {
  if (control) {
    control.disabled = true;
    control.setAttribute("aria-busy", "true");
  }

  Promise.resolve()
    .then(action)
    .catch(error => {
      if (error.name === "NetworkError") setApiStatus(false, "API unavailable");
      toast(error.message || "Something went wrong. Please try again.");
    })
    .finally(() => {
      if (!control) return;
      control.disabled = false;
      control.removeAttribute("aria-busy");
    });
}
