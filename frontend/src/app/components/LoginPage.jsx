import { useEffect, useState } from "react";
import { Eye, User, Shield, Stethoscope, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Link, useNavigate, useParams } from "react-router-dom";
import { loginUser } from "../../lib/auth";
import { toast } from "sonner";

// Split-screen login page. Role is taken from the URL (/login/:role).
// For optometrist + admin roles we additionally send the clinic gate credentials
// stashed in sessionStorage by StaffGatePage. The backend re-validates both.
//
// If a user lands on /login/optometrist or /login/admin without passing the
// staff gate, we bounce them to /staff-gate.

const ROLE_META = {
  patient: {
    title: "Patient",
    subtitle: "Sign in to book and manage your appointments.",
    icon: User,
    accent: "from-blue-600 via-indigo-600 to-teal-600",
    panelText: "Welcome back. Your appointments are a click away.",
  },
  optometrist: {
    title: "Optometrist",
    subtitle: "Sign in to view your clinical diary.",
    icon: Stethoscope,
    accent: "from-teal-600 via-emerald-700 to-slate-800",
    panelText: "Diary, patient records, and recall lists — all in one place.",
  },
  admin: {
    title: "Admin",
    subtitle: "Sign in to manage the clinic.",
    icon: Shield,
    accent: "from-slate-800 via-indigo-900 to-purple-900",
    panelText: "Clinic-wide oversight, analytics and staff management.",
  },
};

export function LoginPage() {
  const navigate = useNavigate();
  const { role: roleParam } = useParams();
  const role = ROLE_META[roleParam] ? roleParam : "patient";
  const meta = ROLE_META[role];
  const RoleIcon = meta.icon;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Bounce to staff gate if a staff role is selected without the gate creds.
  useEffect(() => {
    if (role === "optometrist" || role === "admin") {
      const u = sessionStorage.getItem("staffGateUser");
      const p = sessionStorage.getItem("staffGatePass");
      if (!u || !p) {
        navigate("/staff-gate", { replace: true });
      }
    }
  }, [role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = { email, password };

      if (role === "optometrist" || role === "admin") {
        payload.staffGateUser = sessionStorage.getItem("staffGateUser") || "";
        payload.staffGatePass = sessionStorage.getItem("staffGatePass") || "";
      }

      const res = await loginUser(payload);
      const { token, user } = res.data;

      // Role safety check — user must match the portal they chose.
      if (user.role !== role) {
        throw new Error(`This account is not registered as ${meta.title}.`);
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Staff gate creds are single-session; clear after successful login.
      if (role === "optometrist" || role === "admin") {
        sessionStorage.removeItem("staffGateUser");
        sessionStorage.removeItem("staffGatePass");
      }

      navigate("/dashboard");
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || "Login failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className={`relative hidden lg:flex items-center justify-center bg-linear-to-br ${meta.accent} overflow-hidden`}
      >
        <svg
          className="absolute inset-0 w-full h-full opacity-20"
          viewBox="0 0 600 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="300" cy="400" r="260" stroke="white" strokeWidth="1.5" />
          <circle cx="300" cy="400" r="200" stroke="white" strokeWidth="1.5" />
          <circle cx="300" cy="400" r="140" stroke="white" strokeWidth="1.5" />
          <circle cx="300" cy="400" r="80" stroke="white" strokeWidth="1.5" />
          <circle cx="300" cy="400" r="30" fill="white" fillOpacity="0.15" />
          <line x1="40" y1="400" x2="560" y2="400" stroke="white" strokeWidth="1" />
          <line x1="300" y1="140" x2="300" y2="660" stroke="white" strokeWidth="1" />
        </svg>

        <div className="relative z-10 px-12 text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center ring-1 ring-white/25">
              <Eye className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-semibold tracking-tight">OptiBook</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            {meta.panelText}
          </h2>
        </div>
      </div>

      {/* Form column */}
      <div className="flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-teal-50 p-6">
        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={() => navigate(role === "patient" ? "/" : "/staff-gate")}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 bg-white rounded-xl ring-1 ring-gray-200 flex items-center justify-center">
              <RoleIcon className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Sign in — {meta.title}
              </h1>
              <p className="text-sm text-gray-500">{meta.subtitle}</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {role === "patient" && (
            <p className="text-center text-sm text-gray-500 mt-6">
              New here?{" "}
              <Link
                className="text-blue-600 font-medium hover:underline"
                to="/register"
              >
                Create an account
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
