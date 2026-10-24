import { $, api, escapeHtml, getSession, money, run, setSession, state, toast } from "./core.js";

export async function renderDriver() {
  const [user, profile, apps, allJobs] = await Promise.all([
    api("/auth/me"),
    api("/profile/me"),
    api("/applications/me"),
    api("/jobs").catch(() => [])
  ]);

  state.currentProfile = profile;
  $("driverWelcome").textContent = `Welcome, ${user.name || "Driver"}!`;
  $("profileName").value = user.name || "";
  $("profilePhone").value = user.phone || "";
  $("profileLocation").value = profile.location || "";
  $("profileCategory").value = profile.category || "Car Driver";
  $("profileExperience").value = profile.experience ?? 0;
  $("profileLicence").value = profile.licence_category || "";
  $("profileSkills").value = profile.skills || "";
  $("fileName").textContent = profile.resume_filename ? `Saved filename: ${profile.resume_filename}` : "";
  $("applicationStat").textContent = apps.length;
  $("shortlistStat").textContent = apps.filter(app => app.status === "Shortlisted").length;

  const profileFields = [user.name, user.phone, profile.location, profile.licence_category, profile.skills];
  const completedFields = profileFields.filter(value => String(value || "").trim()).length;
  $("profileStatus").textContent = completedFields === profileFields.length
    ? "Complete"
    : `${completedFields}/5 complete`;

  // Dynamic Relevant Notifications & Alerts
  const appliedJobIds = new Set(apps.map(a => a.job_id));
  const categoryMatches = allJobs.filter(j => j.category === (profile.category || "Car Driver") && !appliedJobIds.has(j.id));
  const otherMatches = allJobs.filter(j => !appliedJobIds.has(j.id) && j.category !== profile.category);

  const notifications = [];

  // Application status alerts
  apps.forEach(app => {
    if (app.status === "Shortlisted") {
      notifications.push({
        type: "success",
        badge: "SHORTLISTED",
        title: `Congratulations! ${app.company} shortlisted your application`,
        desc: `Your application for ${app.job_title} was reviewed and shortlisted for contact. Expect a call or email soon!`,
        actionText: null
      });
    }
  });

  // Matched job opportunity alerts
  categoryMatches.slice(0, 2).forEach(job => {
    notifications.push({
      type: "match",
      badge: "OPPORTUNITY MATCH",
      title: `New ${job.category} opening: ${job.title}`,
      desc: `${job.company} is hiring in ${job.location} · ${money(job.salary)}/mo · Exp req: ${job.experience ?? 0}+ yrs`,
      jobId: job.id,
      actionText: "View & Apply"
    });
  });

  if (notifications.length === 0 && otherMatches.length > 0) {
    const job = otherMatches[0];
    notifications.push({
      type: "info",
      badge: "EXPLORE",
      title: `Featured vacancy: ${job.title} at ${job.company}`,
      desc: `${job.location} · ${money(job.salary)}/mo. Fresh opportunity open for drivers.`,
      jobId: job.id,
      actionText: "View details"
    });
  }

  const notifContainer = $("driverNotificationList");
  if (notifContainer) {
    $("notificationCount").textContent = `${notifications.length} update${notifications.length === 1 ? "" : "s"}`;
    notifContainer.innerHTML = notifications.length
      ? notifications.map(n => `
        <div class="notification-item ${n.type}">
          <div class="notif-content">
            <div class="notif-top">
              <span class="notif-badge">${n.badge}</span>
              <h4>${escapeHtml(n.title)}</h4>
            </div>
            <p>${escapeHtml(n.desc)}</p>
          </div>
          ${n.actionText && n.jobId ? `<button type="button" class="btn btn-plain notif-action-btn" data-job-details="${n.jobId}">${n.actionText} →</button>` : ""}
        </div>
      `).join("")
      : `<div class="empty-inline">No pending alerts. You're up to date!</div>`;
  }

  $("myApplications").innerHTML = apps.length
    ? apps.map(app => `<div class="application-item">
        <div><h4>${escapeHtml(app.job_title)}</h4><p>${escapeHtml(app.company)} · Applied ${escapeHtml(app.applied_at)}</p></div>
        <span class="status-label ${app.status === "Shortlisted" ? "shortlisted" : app.status === "Rejected" ? "" : "review"}">${escapeHtml(app.status)}</span>
      </div>`).join("")
    : `<div class="empty-inline">No applications yet. Browse jobs and apply to get started.</div>`;
}


export function initializeDriver() {
  $("profileForm").addEventListener("submit", event => {
    event.preventDefault();
    run(async () => {
      const selectedFile = $("profileFile").files[0]?.name;
      state.currentProfile = await api("/profile/me", {
        method: "PUT",
        body: {
          name: $("profileName").value.trim(),
          phone: $("profilePhone").value.trim(),
          location: $("profileLocation").value.trim(),
          category: $("profileCategory").value,
          experience: Number($("profileExperience").value),
          licence_category: $("profileLicence").value.trim(),
          skills: $("profileSkills").value.trim(),
          resume_filename: selectedFile || state.currentProfile.resume_filename || ""
        }
      });

      const activeSession = getSession();
      activeSession.user.name = $("profileName").value.trim();
      activeSession.user.phone = $("profilePhone").value.trim();
      setSession(activeSession);
      $("fileName").textContent = state.currentProfile.resume_filename
        ? `Saved filename: ${state.currentProfile.resume_filename}`
        : "";
      toast("Profile saved.");
      await renderDriver();
    }, event.submitter);
  });

  $("profileFile").addEventListener("change", () => {
    const file = $("profileFile").files[0];
    $("fileName").textContent = file
      ? `Selected: ${file.name} (filename only; file content is not uploaded)`
      : "";
  });
}
