import { useEffect, useState } from "react";
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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Mail, Phone, MapPin, Calendar, StickyNote } from "lucide-react";
import API from "../../../lib/api";

// Admin-only patient detail modal.
// Opens in view mode; admin can flip to edit mode to change details and
// the internal note. Notification preferences are read-only in this phase.
// Reuses PUT /patients/:id — no new endpoint or API helper.

const NOTES_MAX = 2000;

const emptyForm = () => ({
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  phone: "",
  address: "",
  languagePreference: "English",
  accessibilityNeeds: "",
  internalNotes: "",
});

const fmtDateLong = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const initials = (first, last) =>
  `${(first || "").charAt(0)}${(last || "").charAt(0)}`.toUpperCase() || "?";

export default function AdminPatientDetailModal({
  open,
  patientId,
  onClose,
  onSaved,
}) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());

  // Reset + fetch fresh whenever the modal opens for a (possibly new) patient.
  useEffect(() => {
    if (!open || !patientId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setIsEditing(false);
        setPatient(null);
        setForm(emptyForm());
        const res = await API.get(`/patients/${patientId}`);
        if (cancelled) return;
        const data = res.data?.data;
        setPatient(data);
        setForm({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          dateOfBirth: data.dateOfBirth
            ? new Date(data.dateOfBirth).toISOString().split("T")[0]
            : "",
          phone: data.phone || "",
          address: data.address || "",
          languagePreference: data.languagePreference || "English",
          accessibilityNeeds: data.accessibilityNeeds || "",
          internalNotes: data.internalNotes || "",
        });
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to load patient",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, patientId]);

  const handleField = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCancel = () => {
    if (!patient) {
      setIsEditing(false);
      return;
    }
    // Roll back form to loaded patient.
    setForm({
      firstName: patient.firstName || "",
      lastName: patient.lastName || "",
      dateOfBirth: patient.dateOfBirth
        ? new Date(patient.dateOfBirth).toISOString().split("T")[0]
        : "",
      phone: patient.phone || "",
      address: patient.address || "",
      languagePreference: patient.languagePreference || "English",
      accessibilityNeeds: patient.accessibilityNeeds || "",
      internalNotes: patient.internalNotes || "",
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!patientId) return;
    try {
      setSaving(true);
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth || null,
        phone: form.phone.trim(),
        address: form.address.trim(),
        languagePreference: form.languagePreference,
        accessibilityNeeds: form.accessibilityNeeds.trim(),
        internalNotes: form.internalNotes,
      };
      const res = await API.put(`/patients/${patientId}`, payload);
      const updated = res.data?.data;
      setPatient(updated);
      setIsEditing(false);
      toast.success("Patient updated");
      onSaved?.(updated);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update patient",
      );
    } finally {
      setSaving(false);
    }
  };

  const requestClose = () => {
    if (saving) return;
    onClose?.();
  };

  const notes = form.internalNotes || "";
  const notesNearLimit = notes.length >= NOTES_MAX - 100;
  const notesOverLimit = notes.length > NOTES_MAX;
  const notifPrefs = patient?.notificationPreferences || {};

  return (
    <Dialog open={open} onOpenChange={(v) => !v && requestClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-0">
        {/* Header band */}
        <div className="rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-white px-6 pt-6 pb-5 border-b border-gray-100">
          <DialogHeader className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                {patient && (
                  <Avatar className="w-12 h-12">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${patient._id}`}
                    />
                    <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-teal-600 text-white">
                      {initials(patient.firstName, patient.lastName)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-gray-900 truncate">
                    {patient
                      ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() ||
                        "Patient"
                      : "Patient details"}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600">
                    {patient?.patientNumber != null && (
                      <span className="tabular-nums">
                        #{patient.patientNumber}
                      </span>
                    )}
                    {patient?.user?.email && (
                      <>
                        {patient?.patientNumber != null && " · "}
                        {patient.user.email}
                      </>
                    )}
                  </DialogDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  isEditing
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }
              >
                {isEditing ? "Editing" : "View"}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        {loading && (
          <div className="px-6 py-10 text-sm text-gray-500 text-center">
            Loading patient…
          </div>
        )}

        {!loading && patient && (
          <div className="px-6 py-5 space-y-5">
            {/* Personal details card */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Personal details
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Names */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1">
                    First name
                  </Label>
                  {isEditing ? (
                    <Input
                      name="firstName"
                      value={form.firstName}
                      onChange={handleField}
                    />
                  ) : (
                    <p className="text-sm">{patient.firstName || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1">
                    Last name
                  </Label>
                  {isEditing ? (
                    <Input
                      name="lastName"
                      value={form.lastName}
                      onChange={handleField}
                    />
                  ) : (
                    <p className="text-sm">{patient.lastName || "—"}</p>
                  )}
                </div>

                {/* DOB + Language */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Date of birth
                  </Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      name="dateOfBirth"
                      value={form.dateOfBirth}
                      onChange={handleField}
                    />
                  ) : (
                    <p className="text-sm">{fmtDateLong(patient.dateOfBirth)}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1">
                    Language preference
                  </Label>
                  {isEditing ? (
                    <select
                      name="languagePreference"
                      value={form.languagePreference}
                      onChange={handleField}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      <option value="English">English</option>
                      <option value="Urdu">Urdu</option>
                      <option value="Punjabi">Punjabi</option>
                      <option value="Arabic">Arabic</option>
                    </select>
                  ) : (
                    <p className="text-sm">
                      {patient.languagePreference || "English"}
                    </p>
                  )}
                </div>

                {/* Phone + Address */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Phone
                  </Label>
                  {isEditing ? (
                    <Input
                      name="phone"
                      value={form.phone}
                      onChange={handleField}
                      placeholder="+44 7700 900000"
                    />
                  ) : (
                    <p className="text-sm">{patient.phone || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Address
                  </Label>
                  {isEditing ? (
                    <Input
                      name="address"
                      value={form.address}
                      onChange={handleField}
                      placeholder="Street, city, postcode"
                    />
                  ) : (
                    <p className="text-sm">{patient.address || "—"}</p>
                  )}
                </div>

                {/* Accessibility */}
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-500 mb-1">
                    Accessibility needs
                  </Label>
                  {isEditing ? (
                    <Input
                      name="accessibilityNeeds"
                      value={form.accessibilityNeeds}
                      onChange={handleField}
                      placeholder="e.g. wheelchair access, step-free entrance"
                    />
                  ) : (
                    <p className="text-sm">
                      {patient.accessibilityNeeds || "—"}
                    </p>
                  )}
                </div>

                {/* Email (always read-only) */}
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </Label>
                  <p className="text-sm">{patient.user?.email || "—"}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Email is managed on the User account, not editable here.
                  </p>
                </div>
              </div>
            </div>

            {/* Clinical / visit context — read-only always */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Clinical context
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Visits</p>
                  <p className="font-medium tabular-nums">
                    {patient.visitCount ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Attendance rate</p>
                  <p className="font-medium tabular-nums">
                    {patient.attendanceRate != null
                      ? `${patient.attendanceRate}%`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Eye test recall</p>
                  <p className="font-medium">
                    {fmtDateLong(patient.eyeTestRecallDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Contact-lens recall</p>
                  <p className="font-medium">
                    {fmtDateLong(patient.contactLensRecallDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Internal notes — admin-only field */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <StickyNote className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-semibold text-amber-900">
                  Internal note
                </h3>
                <span className="text-[11px] text-amber-700/80 ml-1">
                  Admin-only · not visible to the patient
                </span>
              </div>
              {isEditing ? (
                <>
                  <textarea
                    name="internalNotes"
                    value={form.internalNotes}
                    onChange={handleField}
                    rows={4}
                    maxLength={NOTES_MAX}
                    placeholder="Add an internal note about this patient…"
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
                  />
                  <div className="flex justify-end mt-1">
                    <span
                      className={[
                        "text-[11px] tabular-nums font-medium transition",
                        notesOverLimit
                          ? "text-red-700"
                          : notesNearLimit
                          ? "text-amber-700"
                          : "text-gray-500",
                      ].join(" ")}
                    >
                      {notes.length}/{NOTES_MAX}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm whitespace-pre-wrap text-gray-800">
                  {patient.internalNotes?.trim() ? (
                    patient.internalNotes
                  ) : (
                    <span className="text-gray-400">
                      No internal note yet.
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Notification preferences — read-only in this phase */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  Notification preferences
                </h3>
                <span className="text-[11px] text-gray-500">Read-only</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Email reminders</p>
                    <p className="text-xs text-gray-500">
                      Confirmations and day-before reminders by email.
                    </p>
                  </div>
                  <Switch
                    checked={!!notifPrefs.email}
                    disabled
                    aria-label="Email reminders (read-only)"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">SMS reminders</p>
                    <p className="text-xs text-gray-500">
                      Text-message reminders to the patient's phone.
                    </p>
                  </div>
                  <Switch
                    checked={!!notifPrefs.sms}
                    disabled
                    aria-label="SMS reminders (read-only)"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Calendar sync</p>
                    <p className="text-xs text-gray-500">
                      Attach an .ics invite to confirmation emails.
                    </p>
                  </div>
                  <Switch
                    checked={!!notifPrefs.calendarSync}
                    disabled
                    aria-label="Calendar sync (read-only)"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="px-6 pb-5 pt-1 gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || notesOverLimit}
                className="rounded-full bg-blue-600 hover:bg-blue-700"
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={requestClose}
                className="rounded-full"
              >
                Close
              </Button>
              <Button
                onClick={() => setIsEditing(true)}
                disabled={!patient}
                className="rounded-full bg-blue-600 hover:bg-blue-700"
              >
                Edit patient
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
