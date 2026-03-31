const API_BASE = "/api";
const TOKEN_KEY = "roomradar_token";
const USER_KEY = "roomradar_user";

export const session = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (_error) {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  },
  set(authData) {
    localStorage.setItem(TOKEN_KEY, authData.token);
    localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

const request = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = session.getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.message ||
      data.errors?.[0]?.msg ||
      "Something went wrong while talking to RoomRadar.";
    throw new Error(message);
  }

  return data;
};

export const fetchPublicConfig = () => request("/config/public");
export const loginUser = (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
export const signupUser = (payload) => request("/auth/signup", { method: "POST", body: JSON.stringify(payload) });
export const fetchCurrentUser = () => request("/auth/me");
export const fetchProperties = (params) => request(`/properties?${new URLSearchParams(params).toString()}`);
export const fetchProperty = (id) => request(`/properties/${id}`);
export const createProperty = (payload) => request("/properties", { method: "POST", body: JSON.stringify(payload) });
export const updateProperty = (id, payload) =>
  request(`/properties/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteProperty = (id) => request(`/properties/${id}`, { method: "DELETE" });
export const fetchMyProperties = () => request("/properties/mine");
export const verifyProperty = (id, verificationStatus) =>
  request(`/properties/${id}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ verificationStatus })
  });
export const createMessage = (payload) => request("/messages", { method: "POST", body: JSON.stringify(payload) });
export const fetchInbox = () => request("/messages");
export const markMessageAsRead = (id) => request(`/messages/${id}/read`, { method: "PATCH" });
