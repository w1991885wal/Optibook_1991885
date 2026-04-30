import API from "./api";

// Phase E helpers for the optometrist schedule settings page.
export const getMeOptom = () => API.get("/optometrists/me");
export const updateMeOptom = (payload) => API.put("/optometrists/me", payload);

// Phase F helpers for the admin staff page.
export const listOptometrists = () => API.get("/optometrists");
export const createOptometrist = (payload) => API.post("/optometrists", payload);
