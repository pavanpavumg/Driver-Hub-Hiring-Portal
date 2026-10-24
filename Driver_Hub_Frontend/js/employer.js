import { $, api, escapeHtml, money, run, toast } from "./core.js";
import { renderFeatured } from "./jobs.js";

export async function renderEmployer() {
  const [jobs, apps, candidates] = await Promise.all([
    api("/employer/jobs"),
    api("/employer/applications"),
    api("/profile/candidates").catch(() => [])
  ]);

  $("employerJobsStat").textContent = jobs.length;
  $("employerAppsStat").textContent = apps.length;
  $("employerShortlistStat").textContent = apps.filter(app => app.status === "Shortlisted").length;
  
  $("employerJobList").innerHTML = jobs.length
    ? jobs.map(job => `<div class="application-item">
        <div><h4>${escapeHtml(job.title)}</h4><p>${escapeHtml(job.location)} · ${money(job.salary)}/month · ${escapeHtml(job.working_hours || "Regular")}</p></div>
        <div class="application-actions"><span class="status-label">${job.application_count} applicants</span></div>
      </div>`).join("")
    : `<div class="empty-inline">You haven't posted a job yet. Use the form to publish your first vacancy.</div>`;

  $("employerApplications").innerHTML = apps.length
    ? apps.map(app => `<div class="application-item">
        <div>
          <h4>${escapeHtml(app.candidate_name)}</h4>
          <p>${escapeHtml(app.job_title)} · ${escapeHtml(app.driver_category || "Driver")} · ${escapeHtml(app.experience ?? 0)} yrs experience</p>
          <p>${escapeHtml(app.candidate_location || "Bengaluru")} · Licence: ${escapeHtml(app.licence_category || "LMV")} · ${escapeHtml(app.skills || "")}</p>
          <div class="contact-links">
            <a href="tel:${escapeHtml(app.candidate_phone)}" class="contact-tag">📞 Call ${escapeHtml(app.candidate_phone)}</a>
            <a href="mailto:${encodeURIComponent(app.candidate_email)}" class="contact-tag">✉️ ${escapeHtml(app.candidate_email)}</a>
          </div>
        </div>
        <div class="application-actions">
          <span class="status-label ${app.status === "Shortlisted" ? "shortlisted" : app.status === "Hired" ? "hired" : "review"}">${escapeHtml(app.status)}</span>
          ${app.status !== "Shortlisted" ? `<button class="mini-action" type="button" data-app-status="${app.id}" data-status="Shortlisted">Shortlist</button>` : ""}
          ${app.status !== "Hired" ? `<button class="mini-action hire" type="button" data-app-status="${app.id}" data-status="Hired">Hire</button>` : ""}
          ${app.status !== "Rejected" ? `<button class="mini-action danger" type="button" data-app-status="${app.id}" data-status="Rejected">Reject</button>` : ""}
        </div>
      </div>`).join("")
    : `<div class="empty-inline">Applications for your posted jobs will appear here.</div>`;

  renderTalentPool(candidates);
}

function renderTalentPool(candidates) {
  const container = $("candidatePoolList");
  if (!container) return;
  container.innerHTML = candidates.length
    ? candidates.map(c => `
      <div class="candidate-card">
        <div class="candidate-card-top">
          <div class="candidate-avatar">👨🏽‍✈️</div>
          <div>
            <h4>${escapeHtml(c.name)}</h4>
            <span class="status-chip">${escapeHtml(c.category || "Car Driver")}</span>
          </div>
        </div>
        <div class="candidate-info-rows">
          <div><small>Experience:</small> <b>${c.experience ?? 0}+ years</b></div>
          <div><small>Location:</small> <b>${escapeHtml(c.location || "Bengaluru")}</b></div>
          <div><small>Licence:</small> <b>${escapeHtml(c.licence_category || "LMV Commercial")}</b></div>
        </div>
        <p class="candidate-skills-text"><small>Skills:</small> ${escapeHtml(c.skills || "Safe driving, route knowledge, punctuality")}</p>
        <div class="candidate-contact-bar">
          <a class="btn btn-primary btn-sm" href="tel:${escapeHtml(c.phone)}">📞 Call Driver</a>
          <a class="btn btn-plain btn-sm" href="mailto:${encodeURIComponent(c.email)}">✉️ Email</a>
        </div>
      </div>
    `).join("")
    : `<div class="empty-inline span-two">No candidate profiles found matching your search criteria.</div>`;
}

export function initializeEmployer() {
  $("focusPostJob").addEventListener("click", () => $("jobTitle").focus());

  $("talentSearchBtn")?.addEventListener("click", () => {
    run(async () => {
      const loc = $("talentLocation").value.trim();
      const cat = $("talentCategory").value;
      const params = new URLSearchParams();
      if (loc) params.append("location", loc);
      if (cat) params.append("category", cat);
      const candidates = await api(`/profile/candidates?${params}`);
      renderTalentPool(candidates);
      toast(`Found ${candidates.length} candidate${candidates.length === 1 ? "" : "s"}.`);
    });
  });

  $("jobForm").addEventListener("submit", event => {
    event.preventDefault();
    run(async () => {
      await api("/jobs", {
        method: "POST",
        body: {
          title: $("jobTitle").value.trim(),
          category: $("jobCategory").value,
          company: $("jobCompany").value.trim(),
          location: $("jobLocation").value.trim(),
          salary: Number($("jobSalary").value),
          experience: Number($("jobExperience").value),
          working_hours: $("jobHours").value.trim(),
          required_documents: $("jobDocuments").value.trim(),
          description: $("jobDescription").value.trim()
        }
      });

      event.target.reset();
      toast("Your driver vacancy has been published!");
      await Promise.all([renderEmployer(), renderFeatured()]);
    }, event.submitter);
  });

  document.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("[data-app-status]");
    if (!button) return;

    event.preventDefault();
    run(async () => {
      await api(`/applications/${encodeURIComponent(button.dataset.appStatus)}/status`, {
        method: "PATCH",
        body: { status: button.dataset.status }
      });
      toast(`Candidate status changed to: ${button.dataset.status}`);
      await renderEmployer();
    }, button);
  });
}

