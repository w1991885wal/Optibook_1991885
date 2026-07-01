import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  ALLOWED_RATINGS,
  REVIEW_QUESTIONS,
  createReview,
  getMyReview,
} from "../../../lib/review";

// Phase Reviews-Patient-UI.
// Modal supports two modes:
//   mode === "create" — patient submits ratings + optional comment
//   mode === "view"   — read-only display of an already-submitted review
//
// Adjustment lock-in: no default ratings. The live average and Submit
// remain inactive until all 5 questions are answered.

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const round2 = (n) => Math.round(n * 100) / 100;

export default function ReviewModal({
  open,
  appointment,
  existingReview,
  onClose,
  onSubmitted,
}) {
  // Initial mode determined by whether a review already exists.
  const initialMode = existingReview ? "view" : "create";
  const [mode, setMode] = useState(initialMode);

  // ratings is an array of 5 entries; null = unanswered.
  const [ratings, setRatings] = useState(
    existingReview ? existingReview.ratings : [null, null, null, null, null],
  );
  const [comment, setComment] = useState(
    existingReview ? existingReview.comment || "" : "",
  );
  const [submitting, setSubmitting] = useState(false);

  // Reset whenever the modal is reopened with a different appointment / review.
  useEffect(() => {
    if (!open) return;
    if (existingReview) {
      setMode("view");
      setRatings(existingReview.ratings);
      setComment(existingReview.comment || "");
    } else {
      setMode("create");
      setRatings([null, null, null, null, null]);
      setComment("");
    }
    setSubmitting(false);
  }, [open, appointment?._id, existingReview?._id]);

  const allAnswered = useMemo(
    () => ratings.every((r) => typeof r === "number"),
    [ratings],
  );

  const liveAverage = useMemo(() => {
    if (!allAnswered) return null;
    return round2(ratings.reduce((a, b) => a + b, 0) / ratings.length);
  }, [allAnswered, ratings]);

  const setRatingAt = (i, value) => {
    if (mode !== "create") return;
    setRatings((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!appointment?._id) return;
    if (!allAnswered) {
      toast.error("Please answer all 5 questions before submitting.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await createReview({
        appointmentId: appointment._id,
        ratings,
        comment: comment.trim() || undefined,
      });
      toast.success("Review submitted — thank you");
      onSubmitted?.(res.data?.data || null);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || "Could not submit review";

      // Layer 3 frontend handling — duplicate detected by backend.
      // Re-fetch the existing review and switch the modal into view mode.
      if (status === 409) {
        toast.warning("This appointment has already been reviewed.");
        try {
          const refetch = await getMyReview(appointment._id);
          const review = refetch.data?.data;
          if (review) {
            setMode("view");
            setRatings(review.ratings);
            setComment(review.comment || "");
            onSubmitted?.(review);
            return;
          }
        } catch {
          /* fall through to error toast */
        }
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!appointment) return null;

  const optomName = appointment.optometrist
    ? `Dr. ${appointment.optometrist.firstName || ""}${
        appointment.optometrist.lastName
          ? " " + appointment.optometrist.lastName
          : ""
      }`
    : "your optometrist";

  // Derived purely from `ratings` — no new state. Used for the unanswered
  // progress hint and to keep the header chip in sync.
  const answeredCount = ratings.filter((r) => typeof r === "number").length;
  const commentNearLimit = comment.length >= 450;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitting) onClose?.();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-0">
        {/* Header band — softer gradient, larger title, status chip on the right */}
        <div className="rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-white px-6 pt-6 pb-5 border-b border-gray-100">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="text-2xl font-semibold tracking-tight text-gray-900">
                  {mode === "view" ? "Your review" : "Review your appointment"}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  {appointment.appointmentType} · {optomName} ·{" "}
                  {fmtDate(appointment.date)}
                </DialogDescription>
              </div>
              <span
                aria-live="polite"
                className={[
                  "shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1",
                  mode === "view"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : allAnswered
                    ? "bg-blue-50 text-blue-700 ring-blue-200"
                    : "bg-gray-50 text-gray-600 ring-gray-200",
                ].join(" ")}
              >
                {mode === "view"
                  ? "Submitted"
                  : `${answeredCount}/5 answered`}
              </span>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4">
          {REVIEW_QUESTIONS.map((q, i) => {
            const answered = typeof ratings[i] === "number";
            return (
              <div
                key={i}
                className={[
                  "rounded-xl border bg-white p-4 shadow-sm transition",
                  mode === "create"
                    ? answered
                      ? "border-blue-200"
                      : "border-gray-200 hover:border-gray-300"
                    : "border-gray-200",
                ].join(" ")}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span
                    className={[
                      "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold",
                      answered
                        ? "bg-blue-600 text-white"
                        : "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <Label className="text-sm font-medium text-gray-800 leading-snug pt-0.5">
                    {q}
                  </Label>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Rating: 1 to 5, half-step increments"
                  aria-readonly={mode === "view" ? "true" : undefined}
                  className="pl-9"
                >
                  {/* Label row — only major ticks (1–5) carry a number */}
                  <div className="grid grid-cols-9 mb-1 select-none">
                    {ALLOWED_RATINGS.map((value) => {
                      const isMajor = Number.isInteger(value);
                      const isSelectedMajor = ratings[i] === value && isMajor;
                      return (
                        <div
                          key={`lbl-${value}`}
                          className={[
                            "text-center text-xs tabular-nums transition",
                            isMajor
                              ? isSelectedMajor
                                ? mode === "view"
                                  ? "font-bold text-emerald-700"
                                  : "font-bold text-blue-700"
                                : "font-semibold text-gray-700"
                              : "text-transparent",
                          ].join(" ")}
                          aria-hidden="true"
                        >
                          {isMajor ? value : "·"}
                        </div>
                      );
                    })}
                  </div>

                  {/* Tick row — 9 clickable cells over a shared baseline */}
                  <div className="relative grid grid-cols-9">
                    <div
                      className="absolute left-0 right-0 bottom-2 h-px bg-gray-200"
                      aria-hidden="true"
                    />
                    {ALLOWED_RATINGS.map((value) => {
                      const isMajor = Number.isInteger(value);
                      const selected = ratings[i] === value;
                      const readOnly = mode === "view";
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={`Rate ${value} out of 5`}
                          disabled={readOnly || submitting}
                          onClick={() => setRatingAt(i, value)}
                          className={[
                            "relative z-10 flex flex-col items-center justify-end py-2.5 group rounded-md transition",
                            readOnly
                              ? "cursor-default"
                              : "hover:bg-blue-50/40 cursor-pointer",
                          ].join(" ")}
                        >
                          {/* Selected dot — fixed-height slot keeps ticks aligned whether selected or not */}
                          <span
                            className={[
                              "block w-3 h-3 rounded-full mb-1 transition",
                              selected
                                ? readOnly
                                  ? "bg-emerald-600 ring-2 ring-emerald-600/25"
                                  : "bg-blue-600 ring-2 ring-blue-600/20"
                                : "bg-transparent",
                            ].join(" ")}
                            aria-hidden="true"
                          />
                          {/* Tick line — taller for majors, also taller when selected */}
                          <span
                            className={[
                              "block transition-colors",
                              isMajor ? "w-0.5" : "w-px",
                              selected
                                ? "h-7"
                                : isMajor
                                ? "h-6"
                                : "h-3",
                              selected
                                ? readOnly
                                  ? "bg-emerald-600"
                                  : "bg-blue-600"
                                : isMajor
                                ? readOnly
                                  ? "bg-gray-300"
                                  : "bg-gray-400 group-hover:bg-blue-400"
                                : readOnly
                                ? "bg-gray-200"
                                : "bg-gray-300 group-hover:bg-blue-300",
                            ].join(" ")}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Readout — explicit value (esp. helpful for half-steps) */}
                  <div className="mt-2 text-xs tabular-nums">
                    {typeof ratings[i] === "number" ? (
                      <span
                        className={
                          mode === "view"
                            ? "text-emerald-700 font-medium"
                            : "text-blue-700 font-medium"
                        }
                      >
                        Selected:{" "}
                        <span className="font-semibold">
                          {ratings[i].toFixed(1)} / 5
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-400">No rating selected</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
            <Label
              className="text-sm font-medium text-gray-800"
              htmlFor="reviewComment"
            >
              Comment{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <textarea
              id="reviewComment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={mode === "view" || submitting}
              placeholder="Anything you'd like to share about your visit?"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-700 transition"
            />
            <div className="flex justify-end">
              <span
                className={[
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums transition",
                  commentNearLimit
                    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                    : "text-gray-500",
                ].join(" ")}
              >
                {comment.length}/500
              </span>
            </div>
          </div>

          {/* Live average preview only after all 5 questions answered. */}
          <div
            className={[
              "rounded-xl border p-4 transition",
              mode === "view"
                ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100"
                : allAnswered
                ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100"
                : "bg-gray-50 border-gray-200",
            ].join(" ")}
          >
            {mode === "view" ? (
              <div className="flex items-baseline gap-3">
                <span className="text-xs uppercase tracking-wide text-emerald-700/80 font-semibold">
                  Submitted average
                </span>
                <span className="ml-auto text-3xl font-bold text-emerald-700 tabular-nums">
                  {existingReview
                    ? Number(existingReview.averageRating).toFixed(1)
                    : "—"}
                </span>
                <span className="text-sm text-emerald-700/70 font-medium">
                  / 5
                </span>
              </div>
            ) : allAnswered ? (
              <div className="flex items-baseline gap-3">
                <span className="text-xs uppercase tracking-wide text-blue-700/80 font-semibold">
                  Your average
                </span>
                <span className="ml-auto text-3xl font-bold text-blue-700 tabular-nums">
                  {liveAverage.toFixed(1)}
                </span>
                <span className="text-sm text-blue-700/70 font-medium">
                  / 5
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-600">
                  Answer all 5 questions to see your average and submit.
                </span>
                <span className="shrink-0 text-xs font-medium text-gray-500 tabular-nums">
                  {answeredCount}/5
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 pb-5 pt-1 gap-2">
          <Button
            variant="outline"
            onClick={() => onClose?.()}
            disabled={submitting}
            className="rounded-full"
          >
            {mode === "view" ? "Close" : "Cancel"}
          </Button>
          {mode === "create" && (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="rounded-full bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              {submitting ? "Submitting…" : "Submit review"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
