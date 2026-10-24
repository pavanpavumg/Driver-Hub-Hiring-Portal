import { $, api, escapeHtml, money, run, toast } from "./core.js";
import { renderFeatured } from "./jobs.js";

export async function renderAdmin() {
  const [stats, jobs, users, apps] = await Promise.all([
    api("/admin/stats"),
    api("/admin/jobs"),
    api("/admin/users"),
    api("/admin/applications").catch(() => [])
  ]);

  if ($("adminUsersStat")) $("adminUsersStat").textContent = stats.users;
  if ($("adminDriversStat")) $("adminDriversStat").textContent = stats.drivers ?? users.filter(u => u.role === "driver").length;
  if ($("adminEmployersStat")) $("adminEmployersStat").textContent = stats.employers ?? users.filter(u => u.role === "employer").length;
  if ($("adminJobsStat")) $("adminJobsStat").textContent = stats.active_jobs;
  if ($("adminAppsStat")) $("adminAppsStat").textContent = stats.applications;

  const drivers = users.filter(u => u.role === "driver");
  const employers = users.filter(u => u.role === "employer");

  if ($("adminDriverCount")) $("adminDriverCount").textContent = `${drivers.length} candidate${drivers.length === 1 ? "" : "s"}`;
  if ($("adminEmployerCount")) $("adminEmployerCount").textContent = `${employers.length} employer${employers.length === 1 ? "" : "s"}`;

  // Candidates / Drivers List
  $("adminCandidateList").innerHTML = drivers.length
    ? drivers.map(user => `<div class="admin-row">
        <div>
          <b>${escapeHtml(user.name)}</b>
          <small>${escapeHtml(user.email)} · 📞 ${escapeHtml(user.phone || "No phone")} · Registered ${escapeHtml(user.created_at || "")}</small>
        </div>
        <div class="application-actions">
          <span class="status-label ${user.is_active ? "shortlisted" : "danger"}">${user.is_active ? "Active" : "Blocked"}</span>
          <button class="mini-action ${user.is_active ? "danger" : "hire"}" type="button" data-toggle-user="${user.id}" data-active="${user.is_active}">
            ${user.is_active ? "Block Access" : "Approve / Unblock"}
          </button>
        </div>
      </div>`).join("")
    : `<div class="empty-inline">No candidate drivers registered yet.</div>`;

  // Employers List
  $("adminEmployerList").innerHTML = employers.length
    ? employers.map(user => `<div class="admin-row">
        <div>
          <b>${escapeHtml(user.company || user.name)}</b>
          <small>Contact: ${escapeHtml(user.name)} (${escapeHtml(user.email)}) · 📞 ${escapeHtml(user.phone || "")}</small>
        </div>
        <div class="application-actions">
          <span class="status-label ${user.is_active ? "shortlisted" : "danger"}">${user.is_active ? "Active" : "Blocked"}</span>
          <button class="mini-action ${user.is_active ? "danger" : "hire"}" type="button" data-toggle-user="${user.id}" data-active="${user.is_active}">
            ${user.is_active ? "Block Employer" : "Approve / Unblock"}
          </button>
        </div>
      </div>`).join("")
    : `<div class="empty-inline">No employers registered yet.</div>`;

  // Job Postings List
  $("adminJobList").innerHTML = jobs.length
    ? jobs.map(job => `<div class="admin-row">
        <div>
          <b>${escapeHtml(job.title)}</b>
          <small>${escapeHtml(job.company)} · ${escapeHtml(job.location)} · ${money(job.salary)}/mo · Exp: ${job.experience ?? 0}+ yrs</small>
        </div>
        <button class="danger-btn" type="button" data-delete-job="${job.id}">Delete Vacancy</button>
      </div>`).join("")
    : `<div class="empty-inline">No job postings available.</div>`;

  // Platform Applications List
  if ($("adminApplicationList")) {
    $("adminApplicationList").innerHTML = apps.length
      ? apps.map(app => `<div class="admin-row">
          <div>
            <b>${escapeHtml(app.job_title)}</b>
            <small>Candidate: <b>${escapeHtml(app.candidate_name)}</b> (${escapeHtml(app.candidate_email)}) · ${escapeHtml(app.company)}</small>
          </div>
          <span class="status-label ${app.status === "Shortlisted" ? "shortlisted" : app.status === "Hired" ? "hired" : "review"}">${escapeHtml(app.status)}</span>
        </div>`).join("")
      : `<div class="empty-inline">No applications submitted yet.</div>`;
  }
}


export function initializeAdmin() {
  document.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const deleteButton = target.closest("[data-delete-job]");
    if (deleteButton) {
      if (!window.confirm("Remove this job posting? Its applications will also be deleted.")) return;
      run(async () => {
        await api(`/admin/jobs/${encodeURIComponent(deleteButton.dataset.deleteJob)}`, { method: "DELETE" });
        toast("Job posting removed.");
        await Promise.all([renderAdmin(), renderFeatured()]);
      }, deleteButton);
      return;
    }

    const userButton = target.closest("[data-toggle-user]");
    if (!userButton) return;

    const action = userButton.dataset.active === "1" ? "block" : "unblock";
    if (action === "block" && !window.confirm("Block this user's access to Driver Hub?")) return;
    run(async () => {
      await api(`/admin/users/${encodeURIComponent(userButton.dataset.toggleUser)}/${action}`, { method: "PATCH" });
      toast(action === "block" ? "User blocked." : "User unblocked.");
      await renderAdmin();
    }, userButton);
  });
}
