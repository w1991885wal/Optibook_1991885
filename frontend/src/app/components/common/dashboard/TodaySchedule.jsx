import React from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "../../ui/avatar";
import { Clock, TrendingUp } from "lucide-react";

export default function TodaysSchedule({ setActive }) {
  // Dummy appointments
  const appointments = [
    {
      id: 1,
      name: "John Smith",
      type: "Standard Eye Test",
      time: "9:00 AM",
      duration: "30 min",
      room: "Room 2",
      age: 45,
      visit: "First Visit",
      status: "Completed",
      statusColor: "bg-blue-500",
      completed: true,
    },
    {
      id: 2,
      name: "Sarah Johnson",
      type: "Standard Eye Test",
      time: "2:00 PM",
      duration: "30 min",
      room: "Room 2",
      age: 36,
      visit: "Regular Patient",
      status: "Next",
      statusColor: "bg-green-500",
      completed: false,
    },
    {
      id: 3,
      name: "David Brown",
      type: "PCO Test",
      time: "3:00 PM",
      duration: "40 min",
      room: "Room 2",
      age: 58,
      visit: "High Priority",
      status: "Upcoming",
      statusColor: "bg-yellow-500",
      completed: false,
    },
  ];

  return (
    <Card className="py-4">
      <CardContent className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">
            Today's Schedule - January 13, 2026
          </h2>
          <Button size="sm" onClick={() => setActive("diary")}>
            View Full Diary
          </Button>
        </div>

        {/* Appointment List */}
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md shadow-sm ${
                appt.completed ? "opacity-70" : ""
              }`}
            >
              {/* Left Info */}
              <div className="flex gap-3 flex-1">
                <Avatar>
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${appt.name}`}
                  />
                  <AvatarFallback>
                    {appt.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1">
                  <div className="font-semibold text-sm">{appt.name}</div>
                  <div className="text-gray-500 text-sm">{appt.type}</div>
                  <div className="text-gray-400 text-xs flex gap-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {appt.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {appt.duration}
                    </span>
                    {/* {appt.time} • {appt.duration} */}
                  </div>
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <Button size="sm">Start Appointment</Button>
                    <Button size="sm" variant="outline">
                      View History
                    </Button>
                    <Button size="sm" variant="outline">
                      Reschedule
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right status and buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 sm:mt-0">
                <span
                  className={`text-white px-2 py-1 rounded-md text-xs font-medium ${appt.statusColor}`}
                >
                  {appt.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
