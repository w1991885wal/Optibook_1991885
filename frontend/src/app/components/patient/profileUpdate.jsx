import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Mail, Phone, MapPin } from "lucide-react";
import axios from "axios";
import API from "../../../lib/api";

export default function ProfileTab({ user, profile }) {
  const [patient, setPatient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  // Fetch patient data
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await API.get(`/patients/${profile?._id}`);
        setPatient(res.data.data);

        console.log(res);

        // Initialize form data
        setFormData({
          firstName: res.data.data.firstName || "",
          lastName: res.data.data.lastName || "",
          phone: res.data.data.phone || "",
          address: res.data.data.address || "",
          dateOfBirth: res.data.data.dateOfBirth
            ? new Date(res.data.data.dateOfBirth).toISOString().split("T")[0]
            : "",
          languagePreference: res.data.data.languagePreference || "English",
          accessibilityNeeds: res.data.data.accessibilityNeeds || "",
          email: res.data.data.user?.email || user?.email || "",
        });
      } catch (error) {
        console.error("Error fetching patient data:", error);
      }
    };

    fetchPatient();
  }, [profile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const userId = profile?._id;
      const res = await API.put(`/patients/${userId}`, formData);
      setPatient(res.data.data);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating patient:", error);
    }
  };

  if (!patient) return <p>Loading...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          Manage your profile and contact information
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20">
            <AvatarImage
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${patient._id}`}
            />
            <AvatarFallback>{formData.firstName?.[0]}</AvatarFallback>
          </Avatar>

          <div>
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name"
                />
                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last Name"
                />
              </div>
            ) : (
              <h3 className="font-semibold text-lg">
                {patient.firstName} {patient.lastName}
              </h3>
            )}
            <p className="text-gray-600">Patient ID: {patient._id}</p>
          </div>
        </div>

        {/* Contact & Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              {isEditing ? (
                <span>{formData.email}</span>
              ) : (
                <span>{formData.email}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              {isEditing ? (
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 555 123 4567"
                />
              ) : (
                <span>{patient.phone || "—"}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              {isEditing ? (
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Address"
                />
              ) : (
                <span>{patient.address || "—"}</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {isEditing ? (
              <>
                <Input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  placeholder="Date of Birth"
                />
                <Input
                  name="languagePreference"
                  value={formData.languagePreference}
                  onChange={handleChange}
                  placeholder="Language Preference"
                />
                <Input
                  name="accessibilityNeeds"
                  value={formData.accessibilityNeeds}
                  onChange={handleChange}
                  placeholder="Accessibility Needs"
                />
              </>
            ) : (
              <>
                <p className="text-sm">
                  <span className="font-medium">Date of Birth:</span>{" "}
                  {patient.dateOfBirth
                    ? new Date(patient.dateOfBirth).toLocaleDateString()
                    : "—"}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Language Preference:</span>{" "}
                  {patient.languagePreference}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Accessibility Needs:</span>{" "}
                  {patient.accessibilityNeeds || "—"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {isEditing ? (
            <>
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
