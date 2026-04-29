import API from "./api";

// Phase E helpers for the optometrist schedule settings page.
export const getMeOptom = () => API.get("/optometrists/me");
export const updateMeOptom = (payload) => API.put("/optometrists/me", payload);
