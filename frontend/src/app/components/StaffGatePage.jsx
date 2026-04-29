import { useState } from "react";
import { Eye, Lock, Stethoscope, Shield, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Client-side staff gate. Stashes clinic keyword + password in sessionStorage,
// which the login page reads back and sends with every staff login request.
// Backend is the real authority — it re-validates both credentials on POST /auth/login.
//
// sessionStorage (not localStorage) so the gate clears when the tab closes.
export function StaffGatePage() {
  const navigate = useNavigate();
  const [gateUser, setGateUser] = useState("");
  const [gatePass, setGatePass] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (!gateUser.trim() || !gatePass.trim()) {
      toast.error("Enter both clinic keyword and password");
      return;
    }
    // Stash; backend re-checks on login.
    sessionStorage.setItem("staffGateUser", gateUser.trim());
    sessionStorage.setItem("staffGatePass", gatePass);
    setUnlocked(true);
  };

  const chooseRole = (role) => {
    navigate(`/login/${role}`);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex items-center justify-center bg-linear-to-br from-slate-800 via-slate-900 to-blue-950 overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-15"
          viewBox="0 0 600 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="300" cy="400" r="260" stroke="white" strokeWidth="1.5" />
          <circle cx="300" cy="400" r="180" stroke="white" strokeWidth="1.5" />
          <circle cx="300" cy="400" r="100" stroke="white" strokeWidth="1.5" />
          <rect x="100" y="200" width="400" height="400" stroke="white" strokeWidth="1" opacity="0.5" />
        </svg>

        <div className="relative z-10 px-12 text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center ring-1 ring-white/20">
              <Eye className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-semibold tracking-tight">OptiBook</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-3">Staff access</h2>
          <p className="text-white/70 text-base">
            Enter the clinic keyword to continue to the optometrist or admin
            login.
          </p>
        </div>
      </div>

      {/* Form column */}
      <div className="flex items-center justify-center bg-linear-to-br from-slate-50 via-white to-blue-50 p-6">
        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {!unlocked ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Clinic keyword
                </h1>
              </div>
              <p className="text-gray-600 mb-8">
                Required for all staff logins.
              </p>

              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gateUser">Clinic keyword</Label>
                  <Input
                    id="gateUser"
                    autoComplete="off"
                    placeholder="e.g. optibook"
                    value={gateUser}
                    onChange={(e) => setGateUser(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gatePass">Clinic password</Label>
                  <Input
                    id="gatePass"
                    type="password"
                    autoComplete="off"
                    value={gatePass}
                    onChange={(e) => setGatePass(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Continue
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Choose your role
              </h1>
              <p className="text-gray-600 mb-8">
                Continue to the appropriate login page.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => chooseRole("optometrist")}
                  className="group w-full text-left border-2 border-teal-200 bg-white hover:border-teal-400 hover:shadow-md rounded-2xl p-5 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Optometrist</p>
                      <p className="text-sm text-gray-500">
                        Clinical diary & patient records
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => chooseRole("admin")}
                  className="group w-full text-left border-2 border-purple-200 bg-white hover:border-purple-400 hover:shadow-md rounded-2xl p-5 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Admin</p>
                      <p className="text-sm text-gray-500">
                        Clinic management & analytics
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem("staffGateUser");
                  sessionStorage.removeItem("staffGatePass");
                  setUnlocked(false);
                  setGateUser("");
                  setGatePass("");
                }}
                className="text-xs text-gray-500 hover:text-gray-700 mt-6"
              >
                Clear and re-enter keyword
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
