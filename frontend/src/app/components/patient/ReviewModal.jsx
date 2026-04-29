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

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitting) onClose?.();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "view" ? "Your review" : "Review your appointment"}
          </DialogTitle>
          <DialogDescription>
            {appointment.appointmentType} with {optomName} ·{" "}
            {fmtDate(appointment.date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {REVIEW_QUESTIONS.map((q, i) => (
            <div key={i} className="space-y-2">
              <Label className="text-sm">
                {i + 1}. {q}
              </Label>
              <div className="flex flex-wrap gap-2">
                {ALLOWED_RATINGS.map((value) => {
                  const selected = ratings[i] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={mode === "view" || submitting}
                      onClick={() => setRatingAt(i, value)}
                      className={[
                        "px-3 py-1 rounded-md text-sm border transition",
                        selected
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
                        mode === "view" && !selected
                          ? "opacity-40 cursor-default"
                          : "",
                        mode === "view" && selected
                          ? "cursor-default"
                          : "",
                      ].join(" ")}
                    >
                      {value.toFixed(1)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <Label className="text-sm" htmlFor="reviewComment">
              Comment (optional)
            </Label>
            <textarea
              id="reviewComment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={mode === "view" || submitting}
              placeholder="Anything you'd like to share about your visit?"
              className="w-full border rounded-md px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-700"
            />
            <div className="flex justify-end text-[11px] text-gray-500">
              {comment.length}/500
            </div>
          </div>

          {/* Live average preview only after all 5 questions answered. */}
          <div className="rounded-md border bg-gray-50 p-3 text-sm">
            {mode === "view" ? (
              <div>
                <span className="text-gray-500">Submitted average:</span>{" "}
                <span className="font-semibold">
                  {existingReview
                    ? Number(existingReview.averageRating).toFixed(1)
                    : "—"}
                  {" "}/ 5
                </span>
              </div>
            ) : allAnswered ? (
              <div>
                <span className="text-gray-500">Your average:</span>{" "}
                <span className="font-semibold">
                  {liveAverage.toFixed(1)} / 5
                </span>
              </div>
            ) : (
              <div className="text-gray-500">
                Answer all 5 questions to see the average and submit.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onClose?.()}
            disabled={submitting}
          >
            {mode === "view" ? "Close" : "Cancel"}
          </Button>
          {mode === "create" && (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
            >
              {submitting ? "Submitting…" : "Submit review"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
