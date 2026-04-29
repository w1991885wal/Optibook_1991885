import { useState } from "react";
import { Eye, ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { registerUser } from "../../lib/auth";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

// Patient-only registration. Staff accounts are created via seed or admin flows.
// Collects: firstName, lastName, dateOfBirth, address, email, password.
export function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    address: "",
    email: "",
    password: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await registerUser({ ...form, role: "patient" });
      toast.success("Account created. Please sign in.");
      navigate("/login/patient");
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex items-center justify-center bg-linear-to-br from-blue-600 via-indigo-600 to-teal-600 overflow-hidden">
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
            Create your patient account.
          </h2>
          <p className="text-white/80 text-lg">
            Book appointments online and let the clinic match you with the right
            optometrist automatically.
          </p>
        </div>
      </div>

      {/* Form column */}
      <div className="flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-teal-50 p-6">
        <div className="w-full max-w-lg">
          <button
            type="button"
            onClick={() => navigate("/login/patient")}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 bg-white rounded-xl ring-1 ring-gray-200 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
              <p className="text-sm text-gray-500">
                Tell us a bit about you to open your patient file.
              </p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                placeholder="Street, city, postcode"
                value={form.address}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="At least 8 characters, with a letter and a number"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already registered?{" "}
            <Link
              className="text-blue-600 font-medium hover:underline"
              to="/login/patient"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
