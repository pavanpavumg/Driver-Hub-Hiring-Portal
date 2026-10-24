import { $, api, run, setSession, state, toast } from "./core.js";
import { openWorkspaceFor } from "./navigation.js";

export function initializeAuth() {
  $("loginForm").addEventListener("submit", event => {
    event.preventDefault();
    run(async () => {
      const result = await api("/auth/login", {
        method: "POST",
        body: {
          email: $("loginEmail").value.trim(),
          password: $("loginPassword").value
        }
      }, event.submitter);

      if (result.user.role !== $("loginRole").value) {
        throw new Error(`This account is registered as ${result.user.role}. Choose that role and try again.`);
      }

      setSession(result);
      toast(`Welcome back, ${result.user.name || result.user.role}!`);
      openWorkspaceFor(result.user);
    }, event.submitter);
  });

  document.querySelectorAll("[data-role]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-role]").forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
      state.currentRole = button.dataset.role;
      $("companyField").classList.toggle("hidden", state.currentRole !== "employer");
    });
  });

  $("registerForm").addEventListener("submit", event => {
    event.preventDefault();
    run(async () => {
      const body = {
        name: $("regName").value.trim(),
        email: $("regEmail").value.trim(),
        phone: $("regPhone").value.trim(),
        password: $("regPassword").value,
        role: state.currentRole,
        company: $("regCompany").value.trim()
      };

      await api("/auth/register", { method: "POST", body });
      const result = await api("/auth/login", {
        method: "POST",
        body: { email: body.email, password: body.password }
      });

      setSession(result);
      toast("Account created successfully.");
      event.target.reset();
      openWorkspaceFor(result.user);
    }, event.submitter);
  });
}
