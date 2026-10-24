import { $, api, escapeHtml, getSession, money, run, toast } from "./core.js";
import { showView } from "./navigation.js";
import { renderDriver } from "./driver.js";

async function getDriverAppliedJobIds() {
  const activeSession = getSession();
  if (activeSession?.access_token && activeSession.user?.role === "driver") {
    try {
      const myApps = await api("/applications/me");
      return new Set(myApps.map(a => a.job_id));
    } catch {
      return new Set();
    }
  }
  return new Set();
}

function jobCard(job, appliedJobIds = new Set()) {
  const company = job.company || "Driver Hub";
  const logo = company.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const posted = job.created_at
    ? new Date(`${job.created_at.replace(" ", "T")}Z`).toLocaleDateString()
    : "Recently";
  const isApplied = appliedJobIds.has(job.id);

  return `<article class="job-card" data-card-job-id="${escapeHtml(job.id)}">
    <div>
      <div class="job-card-top"><div class="company-logo">${escapeHtml(logo)}</div><span class="job-type">${escapeHtml(job.category)}</span></div>
      <h3 class="job-card-title"><button type="button" class="job-title-btn" data-job-details="${escapeHtml(job.id)}">${escapeHtml(job.title)}</button></h3>
      <div class="company-name">${escapeHtml(company)}</div>
      <div class="job-details"><span>⌖ ${escapeHtml(job.location)}</span><span>◷ ${escapeHtml(job.experience ?? 0)}+ yrs</span><span>◴ ${escapeHtml(job.working_hours || "As discussed")}</span></div>
      <div class="job-salary">${money(job.salary)} <small>/ month</small></div>
      <p>${escapeHtml(job.description)}</p>
      <p><b>Required documents:</b> ${escapeHtml(job.required_documents || "As discussed")}</p>
    </div>
    <div class="job-card-bottom">
      <span class="posted-time">◷ ${escapeHtml(posted)}</span>
      <div class="job-card-actions">
        <button class="details-btn" type="button" data-job-details="${escapeHtml(job.id)}">Details</button>
        ${isApplied
          ? `<button class="apply-btn applied" type="button" disabled>✓ Applied</button>`
          : `<button class="apply-btn" type="button" data-apply="${escapeHtml(job.id)}">Apply now →</button>`
        }
      </div>
    </div>
  </article>`;
}


export async function renderFeatured() {
  const container = $("featuredJobs");
  container.setAttribute("aria-busy", "true");
  $("featuredStatus").textContent = "Loading current opportunities…";
  $("featuredStatus").classList.remove("is-error");

  try {
    const [jobs, appliedJobIds] = await Promise.all([
      api("/jobs"),
      getDriverAppliedJobIds()
    ]);
    container.innerHTML = jobs.slice(0, 3).map(job => jobCard(job, appliedJobIds)).join("");
    $("featuredStatus").textContent = jobs.length
      ? `${jobs.length} current ${jobs.length === 1 ? "opportunity" : "opportunities"} available.`
      : "No opportunities are listed yet. Check back soon.";
    container.classList.toggle("hidden", jobs.length === 0);
  } catch (error) {
    container.innerHTML = "";
    container.classList.add("hidden");
    $("featuredStatus").textContent = "Job listings are temporarily unavailable. Check that the API is running, then refresh.";
    $("featuredStatus").classList.add("is-error");
    throw error;
  } finally {
    container.setAttribute("aria-busy", "false");
  }
}

export async function renderJobs() {
  const container = $("allJobs");
  container.setAttribute("aria-busy", "true");
  $("resultsCount").textContent = "Loading jobs…";
  $("emptyJobs").classList.add("hidden");

  const params = new URLSearchParams({
    keyword: $("filterKeyword").value.trim(),
    location: $("filterLocation").value.trim(),
    category: $("filterCategory").value,
    min_salary: $("filterSalary").value || "0",
    sort: $("sortJobs").value
  });

  try {
    const [jobs, appliedJobIds] = await Promise.all([
      api(`/jobs?${params}`),
      getDriverAppliedJobIds()
    ]);
    $("emptyJobs").querySelector("h3").textContent = "No jobs found";
    $("emptyJobs").querySelector("p").textContent = "Try changing your search or clearing a filter.";
    container.innerHTML = jobs.map(job => jobCard(job, appliedJobIds)).join("");
    $("resultsCount").textContent = `${jobs.length} job${jobs.length === 1 ? "" : "s"} found`;
    $("emptyJobs").classList.toggle("hidden", jobs.length !== 0);
  } catch (error) {
    container.innerHTML = "";
    $("resultsCount").textContent = "Jobs could not be loaded";
    $("emptyJobs").querySelector("h3").textContent = "Unable to load jobs";
    $("emptyJobs").querySelector("p").textContent = "Check your connection to Driver Hub and try again.";
    $("emptyJobs").classList.remove("hidden");
    throw error;
  } finally {
    container.setAttribute("aria-busy", "false");
  }
}

async function applyForJob(jobId) {
  const activeSession = getSession();
  if (!activeSession?.access_token) {
    $("loginRole").value = "driver";
    showView("login");
    toast("Please log in as a driver to apply for this job.");
    return;
  }
  if (activeSession.user?.role !== "driver") {
    toast(`You are currently logged in as an ${activeSession.user.role || "user"}. Switch to a Driver account to apply.`);
    return;
  }

  await api(`/jobs/${encodeURIComponent(jobId)}/apply`, { method: "POST" });
  toast("Application submitted successfully!");
  closeJobDetails();

  // Instantly mark the applied job in place across all visible cards without navigating away
  document.querySelectorAll(`[data-apply="${jobId}"]`).forEach(btn => {
    btn.outerHTML = '<button class="apply-btn applied" type="button" disabled>✓ Applied</button>';
  });

  if ($("view-driver").classList.contains("active")) await renderDriver();
}

export async function openJobDetails(jobId) {
  const modal = $("jobModal");
  if (!modal) return;
  const [job, appliedJobIds] = await Promise.all([
    api(`/jobs/${encodeURIComponent(jobId)}`),
    getDriverAppliedJobIds()
  ]);

  $("modalJobCategory").textContent = (job.category || "Car Driver").toUpperCase();
  $("modalJobTitle").textContent = job.title;
  $("modalJobCompany").textContent = `${job.company || "Driver Hub Partner"} · ${job.location || "Location not specified"}`;
  $("modalJobSalary").textContent = `${money(job.salary)} / month`;
  $("modalJobExp").textContent = `${job.experience ?? 0}+ years`;
  $("modalJobHours").textContent = job.working_hours || "Standard shift";
  $("modalJobLocation").textContent = job.location || "Bengaluru";
  $("modalJobDocs").textContent = job.required_documents || "Driving licence, Government Photo ID";
  $("modalJobDesc").textContent = job.description || "No description provided.";

  const applyBtn = $("modalApplyBtn");
  if (applyBtn) {
    if (appliedJobIds.has(Number(job.id)) || appliedJobIds.has(String(job.id))) {
      applyBtn.disabled = true;
      applyBtn.textContent = "✓ Applied";
      applyBtn.classList.add("applied");
      delete applyBtn.dataset.apply;
    } else {
      applyBtn.disabled = false;
      applyBtn.innerHTML = 'Apply for this Job <span>→</span>';
      applyBtn.classList.remove("applied");
      applyBtn.dataset.apply = job.id;
    }
  }

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

export function closeJobDetails() {
  const modal = $("jobModal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
}

export function initializeJobs() {
  $("heroSearch").addEventListener("submit", event => {
    event.preventDefault();
    $("filterKeyword").value = $("heroKeyword").value;
    $("filterLocation").value = $("heroLocation").value;
    showView("jobs");
  });

  $("applyFilters").addEventListener("click", () => run(renderJobs));
  $("sortJobs").addEventListener("change", () => run(renderJobs));
  $("clearFilters").addEventListener("click", () => {
    $("filterKeyword").value = "";
    $("filterLocation").value = "";
    $("filterCategory").value = "";
    $("filterSalary").value = "0";
    $("emptyJobs").querySelector("h3").textContent = "No jobs found";
    $("emptyJobs").querySelector("p").textContent = "Try changing your search or clearing a filter.";
    run(renderJobs);
  });

  document.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    // View Job Details
    const detailsBtn = target.closest("[data-job-details]");
    if (detailsBtn) {
      event.preventDefault();
      run(() => openJobDetails(detailsBtn.dataset.jobDetails), detailsBtn);
      return;
    }

    // Quick Category Filter Click
    const catBtn = target.closest("[data-quick-category]");
    if (catBtn) {
      event.preventDefault();
      const cat = catBtn.dataset.quickCategory;
      $("filterCategory").value = cat;
      $("filterKeyword").value = "";
      showView("jobs");
      run(renderJobs);
      return;
    }

    // Modal Close
    if (target.closest("#modalCloseBtn, #modalDismissBtn") || target === $("jobModal")) {
      closeJobDetails();
      return;
    }

    // Apply button (on card or in modal)
    const button = target.closest("[data-apply]");
    if (!button) return;
    event.preventDefault();
    run(() => applyForJob(button.dataset.apply), button);
  });

  // ESC to close modal
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("jobModal")?.classList.contains("hidden")) {
      closeJobDetails();
    }
  });
}

