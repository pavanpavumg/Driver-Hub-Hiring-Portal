import { api, clearSession, getSession, run, setApiStatus, setSession, toast } from "./core.js";
import { initializeNavigation, setViewRenderers, syncHeader } from "./navigation.js";
import { initializeJobs, renderFeatured, renderJobs } from "./jobs.js";
import { initializeAuth } from "./auth.js";
import { initializeDriver, renderDriver } from "./driver.js";
import { initializeEmployer, renderEmployer } from "./employer.js";
import { initializeAdmin, renderAdmin } from "./admin.js";

const viewNames = ["home", "jobs", "login", "register", "driver", "employer", "admin"];

async function loadMarkup(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load frontend template "${path}" (${response.status}).`);
  return response.text();
}

async function loadAppShell() {
  const [header, footer, ...views] = await Promise.all([
    loadMarkup("partials/header.html"),
    loadMarkup("partials/footer.html"),
    ...viewNames.map(name => loadMarkup(`views/${name}.html`))
  ]);

  document.querySelector("#headerMount").innerHTML = header;
  document.querySelector("#mainContent").innerHTML = views.join("\n");
  document.querySelector("#footerMount").innerHTML = footer;
}

async function initializeApp() {
  await loadAppShell();

  setViewRenderers({
    jobs: renderJobs,
    driver: renderDriver,
    employer: renderEmployer,
    admin: renderAdmin
  });

  initializeNavigation();
  initializeJobs();
  initializeAuth();
  initializeDriver();
  initializeEmployer();
  initializeAdmin();

  setApiStatus(false, "Connecting");
  const activeSession = getSession();
  if (activeSession?.access_token) {
    try {
      activeSession.user = await api("/auth/me");
      setSession(activeSession);
    } catch (error) {
      if (error.name === "NetworkError") {
        setApiStatus(false, "API unavailable");
      } else if (error.message?.includes("Invalid or expired") || error.message?.includes("Please log in") || error.message?.includes("Account unavailable")) {
        clearSession();
      }
    }
  }

  syncHeader();
  run(renderFeatured);
}

initializeApp().catch(error => {
  if (document.querySelector("#apiIndicator")) setApiStatus(false, "API unavailable");
  const loadError = document.querySelector("#appLoadError");
  if (loadError) {
    loadError.hidden = false;
    loadError.textContent = error.message || "Driver Hub could not start. Refresh the page to try again.";
  }
  throw error;
});
