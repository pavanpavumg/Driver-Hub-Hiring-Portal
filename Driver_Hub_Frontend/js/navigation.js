import { $, api, clearSession, getSession, run, setSession, state, toast } from "./core.js";

let viewRenderers = {};

export function setViewRenderers(renderers) {
  viewRenderers = renderers;
}

export function syncHeader() {
  const activeSession = getSession();
  const loggedIn = Boolean(activeSession?.access_token);
  document.querySelectorAll(".header-actions [data-view]").forEach(button => {
    if (button.id !== "workspaceButton") button.classList.toggle("hidden", loggedIn);
  });

  const workspaceButton = $("workspaceButton");
  const role = activeSession?.user?.role;
  workspaceButton.dataset.view = role === "admin" ? "admin" : role === "employer" ? "employer" : "driver";
  workspaceButton.textContent = role === "employer"
    ? "Employer workspace"
    : role === "admin"
      ? "Admin workspace"
      : "My workspace";
  workspaceButton.classList.toggle("hidden", !loggedIn);
  $("logoutButton").classList.toggle("hidden", !loggedIn);
}


export function showView(name) {
  if (!$(`view-${name}`)) name = "home";

  document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
  $(`view-${name}`).classList.add("active");
  $("mainNav").classList.remove("open");
  $("menuToggle").setAttribute("aria-expanded", "false");
  $("menuToggle").setAttribute("aria-label", "Open navigation");
  syncHeader();
  window.scrollTo({ top: 0, behavior: "smooth" });

  const render = viewRenderers[name];
  if (render) run(render);
}

export function openWorkspaceFor(user) {
  showView(user.role === "admin" ? "admin" : user.role === "employer" ? "employer" : "driver");
}

export function initializeNavigation() {
  document.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const switcher = target.closest("[data-switch-role]");
    if (switcher) {
      event.preventDefault();
      const role = switcher.dataset.switchRole;
      const creds = {
        driver: { email: "driver@driverhub.com", password: "Password123!" },
        employer: { email: "employer@driverhub.com", password: "Password123!" },
        admin: { email: "admin@driverhub.com", password: "Password123!" }
      }[role];
      if (creds) {
        run(async () => {
          const result = await api("/auth/login", { method: "POST", body: creds });
          setSession(result);
          toast(`Switched persona to: ${result.user.name || role}`);
          syncHeader();
          openWorkspaceFor(result.user);
        }, switcher);
      }
      return;
    }

    if (target.closest("[data-apply], [data-app-status], [data-job-details], [data-quick-category], .apply-btn, .details-btn, .notif-action-btn, #modalApplyBtn")) return;

    const nav = target.closest("[data-view]");
    if (!nav) return;

    event.preventDefault();
    const view = nav.dataset.view;
    if (["driver", "employer", "admin"].includes(view)) {
      const activeSession = getSession();
      if (!activeSession?.access_token) {
        $("loginRole").value = view;
        showView("login");
        return;
      }
      if (activeSession.user?.role !== view) {
        toast(`Log in as a ${view} to open this workspace.`);
        return;
      }
    }
    showView(view);
  });

  $("menuToggle").addEventListener("click", () => {
    const isOpen = $("mainNav").classList.toggle("open");
    $("menuToggle").setAttribute("aria-expanded", String(isOpen));
    $("menuToggle").setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });

  $("logoutButton").addEventListener("click", () => {
    clearSession();
    state.currentProfile = {};
    syncHeader();
    showView("home");
    toast("You have logged out.");
  });

  window.addEventListener("scroll", () => {
    const header = document.querySelector(".site-header");
    if (header) {
      header.classList.toggle("is-scrolled", window.scrollY > 10);
    }
  }, { passive: true });

  window.addEventListener("driverhub:session-expired", syncHeader);
  syncHeader();
}
