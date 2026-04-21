import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";

export default function WaitlistRow({ patient }) {
  return (
    <Card className="">
      <CardContent className="flex items-center justify-between p-4">
        {/* Left */}
        <div className="flex items-center gap-4">
          <div>
            <p className="font-semibold">{patient.name}</p>

            <div className="text-sm text-gray-500 flex flex-wrap gap-1  mt-1">
              <span className="font-semibold">{patient.appointmentType}</span>
              <span className="opacity-90">• {patient.addDate}</span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={
              patient.type === "High Priority"
                ? "bg-red-100 text-black"
                : "bg-blue-100 text-blue-700"
            }
          >
            {patient.type} Patient
          </Badge>

          <Button size="sm">Confirm Booking</Button>
          <Button size="sm" variant="outline">
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
