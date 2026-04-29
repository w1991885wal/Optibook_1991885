import API from "./api";

// Phase Reviews-Patient-UI helpers.
// Backend gates these to patient role only — see routes/reviews.js.

export const createReview = (payload) => API.post("/reviews", payload);

export const getMyReview = (appointmentId) =>
  API.get(`/reviews/appointment/${appointmentId}`);

export const REVIEW_QUESTIONS = [
  "How satisfied were you with the overall appointment experience?",
  "How clearly did the optometrist explain your eye health or results?",
  "How professional and respectful was the optometrist?",
  "How well did the optometrist listen to your concerns or questions?",
  "How likely would you be to see this optometrist again?",
];

export const ALLOWED_RATINGS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

// Phase Reviews-Display — satisfaction summary helpers.
// Optom self-view → optom dashboard KPI card.
export const getMyOptometristReviewSummary = () =>
  API.get("/reviews/optometrist/me/summary");

// Per-id summary → admin staff management Satisfaction column.
export const getOptometristReviewSummary = (optometristId) =>
  API.get(`/reviews/optometrist/${optometristId}/summary`);
