import { fetchCurrentUser, loginUser, signupUser, session } from "./api.js";

const toastElement = document.getElementById("appToast");

const showToast = (message, isError = false) => {
  toastElement.textContent = message;
  toastElement.style.background = isError ? "rgba(193, 67, 67, 0.95)" : "rgba(23, 54, 48, 0.92)";
  toastElement.classList.remove("hidden");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toastElement.classList.add("hidden");
  }, 3200);
};

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidPhone = (value) => /^\d{10}$/.test(value);
const setButtonLoading = (form, isLoading, label) => {
  const submitButton = form?.querySelector('button[type="submit"]');
  if (!submitButton) {
    return;
  }

  if (!submitButton.dataset.defaultLabel) {
    submitButton.dataset.defaultLabel = submitButton.textContent;
  }

  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? label : submitButton.dataset.defaultLabel;
};

const ensureSessionState = async () => {
  if (!session.getToken()) {
    return;
  }

  try {
    await fetchCurrentUser();
    window.location.replace("/");
  } catch (_error) {
    session.clear();
  }
};

const showQueryToast = () => {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");

  if (error) {
    showToast(error, true);
    params.delete("error");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }
};

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const payload = Object.fromEntries(formData.entries());
    payload.email = normalizeEmail(payload.email);
    payload.password = String(payload.password || "");

    if (!isValidEmail(payload.email)) {
      showToast("Enter a valid email address.", true);
      return;
    }

    if (!payload.password) {
      showToast("Enter your password.", true);
      return;
    }

    try {
      setButtonLoading(loginForm, true, "Logging in...");
      const data = await loginUser(payload);
      session.set(data);
      showToast("Logged in successfully.");
      window.setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      showToast(error.message, true);
    } finally {
      setButtonLoading(loginForm, false);
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(signupForm);
    const payload = Object.fromEntries(formData.entries());
    payload.name = String(payload.name || "").trim();
    payload.email = normalizeEmail(payload.email);
    payload.phone = normalizePhone(payload.phone);
    payload.password = String(payload.password || "");

    if (payload.name.length < 2) {
      showToast("Enter your full name.", true);
      return;
    }

    if (!isValidEmail(payload.email)) {
      showToast("Enter a valid email address.", true);
      return;
    }

    if (payload.password.length < 6) {
      showToast("Password must be at least 6 characters long.", true);
      return;
    }

    if (!isValidPhone(payload.phone)) {
      showToast("Enter a valid 10-digit phone number.", true);
      return;
    }

    try {
      setButtonLoading(signupForm, true, "Creating account...");
      const data = await signupUser(payload);
      session.set(data);
      showToast("Account created successfully.");
      window.setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      showToast(error.message, true);
    } finally {
      setButtonLoading(signupForm, false);
    }
  });
}

ensureSessionState();
showQueryToast();
