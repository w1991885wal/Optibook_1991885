import { useState } from "react";
import { Eye, User, Shield, Stethoscope } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginUser } from "../../lib/auth";
import { toast } from "sonner";

export function LoginPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [selectedRole] = useState(state?.role || "patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roles = [
    { type: "patient", title: "Patient", icon: User },
    { type: "optometrist", title: "Optometrist", icon: Stethoscope },
    { type: "admin", title: "Admin", icon: Shield },
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await loginUser({
        email,
        password,
      });

      const { token, user } = res.data;

      // role safety check
      if (user.role !== selectedRole) {
        throw new Error(`You are not registered as ${selectedRole}`);
      }

      // persist auth
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // redirect
      navigate("/dashboard");
      // if (user.role === "patient") navigate("/dashboard");
      // if (user.role === "optometrist") navigate("/optometrist");
      // if (user.role === "admin") navigate("/admin");
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
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-teal-600 rounded-xl flex items-center justify-center">
              <Eye className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-linear-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              OptiBook
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Professional Eye Care Appointment Management
          </p>
        </div>

        {/* Login Card */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <Button
              variant="ghost"
              className="w-fit mb-2"
              onClick={() => navigate("/")}
            >
              ← Back
            </Button>

            <CardTitle className="text-2xl">
              Sign in as {roles.find((r) => r.type === selectedRole)?.title}
            </CardTitle>
            <CardDescription>
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center mt-4">
          Don’t have an account?{" "}
          <Link className="text-blue-600 font-medium" to="/register">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
