import axios from "axios";

const url =
  import.meta.env.VITE_API_URL ||
  "https://optibook-backend.onrender.com/api";
const API = axios.create({
  baseURL: url,
  timeout: 90000,
});

// attach token automatically
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// on 401, clear auth and bounce to /login
// on 429, surface a clear rate-limit message instead of the generic one
// on timeout, surface a clear cold-start message instead of "Network Error"
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        window.location.href = "/login";
      }
    }
    if (err.response?.status === 429) {
      err.message =
        err.response.data?.message ||
        "Too many attempts — please wait 15 minutes and try again.";
    }
    if (err.code === "ECONNABORTED") {
      err.message =
        "Server is taking too long to respond — it may be waking up. Please try again in a moment.";
    }
    return Promise.reject(err);
  },
);

export default API;
