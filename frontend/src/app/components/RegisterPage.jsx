import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { registerUser } from "../../lib/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function RegisterPage() {
  const [role, setRole] = useState("patient");
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    roomNumber: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = { ...form, role };

      await registerUser(payload);

      toast.success("Account created successfully. Please sign in.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto mt-16">
      <CardHeader>
        <Button
          variant="ghost"
          className="w-fit mb-2"
          onClick={() => navigate("/login")}
        >
          ← Back
        </Button>
        <CardTitle>Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <Label>Role</Label>
          <select
            className="w-full border rounded p-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="patient">Patient</option>
            <option value="optometrist">Optometrist</option>
          </select>

          <Input
            name="email"
            placeholder="Email"
            onChange={handleChange}
            required
          />
          <Input
            name="password"
            type="password"
            placeholder="Password"
            onChange={handleChange}
            required
          />
          <Input
            name="firstName"
            placeholder="First Name"
            onChange={handleChange}
            required
          />
          <Input
            name="lastName"
            placeholder="Last Name"
            onChange={handleChange}
            required
          />

          {role === "optometrist" && (
            <Input
              name="roomNumber"
              placeholder="Room Number"
              onChange={handleChange}
              required
            />
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Register"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
