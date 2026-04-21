import axios from "axios";

const url =
  import.meta.env.VITE_API_URL ||
  "https://optibook-backend-w1991885-production.up.railway.app/api";
const API = axios.create({
  baseURL: url,
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
    return Promise.reject(err);
  },
);

export default API;
