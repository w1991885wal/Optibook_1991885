import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { toast } from "sonner";
import { createOptometrist } from "../../../../lib/optometrist";

// Specialty list shown in the Add Optometrist dialog. The Optometrist model
// enum still includes "Pediatric" for legacy data, but it is intentionally
// omitted from the visible UI per product direction — admins should not be
// able to provision a new account under that specialty going forward.
const SPECIALTIES = ["General", "Contact Lens", "Senior"];

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  specialty: "General",
  languages: "English",
  roomNumber: "",
  yearsExperience: "",
};

// Admin-only modal for provisioning a new optometrist account. Submits to
// the Phase B endpoint (POST /api/optometrists). On 4xx the backend's
// errors[] array is mapped to per-field messages so the admin can see
// exactly which input was rejected.
export default function AddStaffDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const close = () => {
    setForm(EMPTY);
    setFieldErrors({});
    onOpenChange?.(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const langs = form.languages
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
      specialty: form.specialty,
      languages: langs,
      roomNumber: form.roomNumber.trim(),
    };
    const yrs = String(form.yearsExperience).trim();
    if (yrs !== "") {
      const n = Number(yrs);
      if (!Number.isFinite(n)) {
        setFieldErrors({ yearsExperience: "Must be a number" });
        return;
      }
      payload.yearsExperience = n;
    }

    setSubmitting(true);
    try {
      const res = await createOptometrist(payload);
      const o = res?.data?.data?.optometrist;
      const name = o
        ? `${o.firstName} ${o.lastName}`.trim()
        : `${form.firstName} ${form.lastName}`.trim();
      toast.success(`Optometrist ${name} created`);
      close();
      onCreated?.();
    } catch (err) {
      const errors = err?.response?.data?.errors;
      const message =
        err?.response?.data?.message || "Failed to create optometrist";
      if (Array.isArray(errors) && errors.length) {
        const map = {};
        for (const e2 of errors) {
          if (e2.field && !map[e2.field]) map[e2.field] = e2.message;
        }
        setFieldErrors(map);
        toast.error("Please fix the highlighted fields");
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (v ? onOpenChange?.(true) : close())}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Optometrist</DialogTitle>
          <DialogDescription>
            Creates the auth account and the linked optometrist profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                required
                aria-invalid={!!fieldErrors.firstName}
              />
              {fieldErrors.firstName && (
                <p className="text-xs text-red-600">{fieldErrors.firstName}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                required
                aria-invalid={!!fieldErrors.lastName}
              />
              {fieldErrors.lastName && (
                <p className="text-xs text-red-600">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
              aria-invalid={!!fieldErrors.password}
            />
            <p className="text-xs text-gray-500">
              8+ characters, must include a letter and a number.
            </p>
            {fieldErrors.password && (
              <p className="text-xs text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="specialty">Specialty</Label>
              <Select
                value={form.specialty}
                onValueChange={(v) => set("specialty", v)}
              >
                <SelectTrigger
                  id="specialty"
                  aria-invalid={!!fieldErrors.specialty}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.specialty && (
                <p className="text-xs text-red-600">{fieldErrors.specialty}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="roomNumber">Room number</Label>
              <Input
                id="roomNumber"
                value={form.roomNumber}
                onChange={(e) => set("roomNumber", e.target.value)}
                required
                aria-invalid={!!fieldErrors.roomNumber}
                placeholder="Room 4"
              />
              {fieldErrors.roomNumber && (
                <p className="text-xs text-red-600">{fieldErrors.roomNumber}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="languages">Languages</Label>
              <Input
                id="languages"
                value={form.languages}
                onChange={(e) => set("languages", e.target.value)}
                placeholder="English, French"
                aria-invalid={!!fieldErrors.languages}
              />
              <p className="text-xs text-gray-500">Comma-separated.</p>
              {fieldErrors.languages && (
                <p className="text-xs text-red-600">{fieldErrors.languages}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="yearsExperience">Years of experience</Label>
              <Input
                id="yearsExperience"
                type="number"
                min="0"
                max="60"
                value={form.yearsExperience}
                onChange={(e) => set("yearsExperience", e.target.value)}
                placeholder="Optional"
                aria-invalid={!!fieldErrors.yearsExperience}
              />
              {fieldErrors.yearsExperience && (
                <p className="text-xs text-red-600">
                  {fieldErrors.yearsExperience}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create optometrist"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
