import { useEffect, useState } from "react";
import { ArrowLeft, Eye, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { getMe } from "../../../lib/patient";
import ProfileTab from "./profileUpdate";

// Dedicated route-level profile page. Mounts the existing ProfileTab form with
// its own page chrome — header, back button, logout. Reached from the avatar
// icon on the patient dashboard.
export default function PatientProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMe();
        setUser(res.data.user);
        setProfile(res.data.profile);
      } catch (_) {
        logout();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                OptiBook
              </h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="cursor-pointer"
              aria-label="Log out"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </button>

        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-1">Your profile</h2>
          <p className="text-gray-600">
            Update your contact details, language preference and notification
            settings.
          </p>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading your profile...</p>
        ) : (
          <ProfileTab user={user} profile={profile} />
        )}
      </div>
    </div>
  );
}
