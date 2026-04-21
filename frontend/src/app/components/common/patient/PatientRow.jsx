import { Mail, Phone, Calendar } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import { AvatarImage } from "@radix-ui/react-avatar";

export default function PatientRow({ patient }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        {/* Left */}
        <div className="flex items-center gap-4">
          <Avatar className="text-white">
            <AvatarImage src={patient.imageSrc} />
            <AvatarFallback className="bg-linear-to-r from-indigo-500 to-teal-600">
              {patient.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>

          <div>
            <p className="font-semibold">{patient.name}</p>

            <div className="text-sm text-gray-500 flex flex-wrap gap-4 mt-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> {patient.email}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {patient.age} years old
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> {patient.phone}
              </span>
            </div>

            <div className="text-xs text-gray-500 mt-1">
              Last Visit: {patient.lastVisit} • {patient.visits} total visits
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <Badge
            variant="secondary"
            className={
              patient.type === "Regular"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }
          >
            {patient.type} Patient
          </Badge>

          <Button size="sm">View Records</Button>
        </div>
      </CardContent>
    </Card>
  );
}
