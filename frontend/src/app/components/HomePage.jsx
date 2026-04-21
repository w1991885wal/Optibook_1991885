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
import { useNavigate } from "react-router-dom";

export function HomePage({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const navigate = useNavigate();

  const roles = [
    {
      type: "patient",
      title: "Patient",
      description: "Book appointments and manage your eye health",
      icon: User,
      color: "bg-blue-500",
    },
    {
      type: "optometrist",
      title: "Optometrist",
      description: "Manage appointments and patient care",
      icon: Stethoscope,
      color: "bg-teal-500",
    },
    {
      type: "admin",
      title: "Admin",
      description: "System administration and oversight",
      icon: Shield,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
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

        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.type}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-blue-300"
                onClick={() => setSelectedRole(role.type)}
              >
                <CardHeader className="text-center">
                  <div
                    className={`w-16 h-16 ${role.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">{role.title}</CardTitle>
                  <CardDescription className="text-base">
                    {role.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      navigate("/login", {
                        state: { role: role.type },
                      });
                    }}
                  >
                    Sign in as {role.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
