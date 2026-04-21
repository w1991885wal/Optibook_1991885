import { Card, CardContent } from "../../ui/card";

export default function DashboardStats() {
  const quickStats = [
    { label: "Average Consultation Time", value: "28 min" },
    { label: "Patient Satisfaction", value: "4.8/5.0 ⭐" },
    { label: "No-Show Rate", value: "3.2%" },
    { label: "Total Patients Seen", value: "1,247" },
  ];

  const notifications = [
    {
      type: "New Booking",
      message: "Sarah Johnson booked for Jan 16 at 2:00 PM",
    },
    {
      type: "Cancellation",
      message: "Robert Lee cancelled appointment for today 4:30 PM",
    },
    {
      type: "Waitlist Update",
      message: "2 patients added to waitlist this morning",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
      {/* Quick Stats Card */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Stats</h2>
          <div className="space-y-2">
            {quickStats.map((stat, idx) => (
              <div
                key={idx}
                className={`flex justify-between items-center px-3 py-2 ${
                  idx !== quickStats.length - 1
                    ? "border-b border-gray-200"
                    : ""
                }`}
              >
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications Card */}
      <Card className="py-4">
        <CardContent className="space-y-2">
          <h2 className="text-lg font-semibold">Recent Notifications</h2>
          <div className="flex flex-col gap-2">
            {notifications.map((note, idx) => (
              <div key={idx} className="p-3 bg-gray-100 rounded-md">
                <strong>{note.type}</strong>
                <br />
                <span className="text-gray-500 text-sm">{note.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
