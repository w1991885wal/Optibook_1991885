import React, { useMemo, useState } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import {
  Building,
  Calendar,
  ClockArrowUp,
  GraduationCap,
  Mail,
  Search,
  Sparkles,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { ToggleButton } from "../../common/toggle";
import { staffData } from "../../common/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";

export default function StaffManagement({ onLogout }) {
  const [staff, setStaff] = useState(staffData);

  /* ------------------ SEARCH ------------------ */
  const [query, setQuery] = useState("");

  const filteredStaff = useMemo(() => {
    return staff.filter((member) =>
      member.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [query, staff]);

  return (
    <main className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Staff Management 👨‍⚕️</h1>
        <p className="text-sm text-gray-500">Dashboard / Staff Management</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-3 mb-8">
        <Card className="border-l-4 rounded-md border-l-[#0066CC] [box-shadow:0_4px_6px_-1px_rgba(0,102,204,0.4),0_2px_4px_-2px_rgba(0,102,204,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Total Staff</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
                <div className="w-10 h-10 bg-[#0066CC] rounded-sm flex items-center justify-center">
                  <UsersRound className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs">All active optometrists</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#FFD93D] [box-shadow:0_4px_6px_-1px_rgba(255,217,61,0.4),0_2px_4px_-2px_rgba(255,217,61,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Avg Utilization</p>
                  <p className="text-2xl font-bold">88%</p>
                </div>
                <div className="w-10 h-10 bg-[#FFD93D] rounded-sm flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-black" />
                </div>
              </div>
              <p className="text-xs text-[#51CF66]">↗ Above target of 85%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#51CF66] [box-shadow:0_4px_6px_-1px_rgba(81,207,102,0.4),0_2px_4px_-2px_rgba(81,207,102,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">
                    Total Appointments Today
                  </p>
                  <p className="text-2xl font-bold">24</p>
                </div>
                <div className="w-10 h-10 bg-[#51CF66] rounded-sm flex items-center justify-center">
                  <ClockArrowUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-[#51CF66]">Across all staff</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Add */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search optometrist by name or ID..."
            className="flex-1 px-4 py-2 border rounded-md text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button size="sm">
            <Search className="w-4 h-4 mr-1" />
            Search
          </Button>
        </div>
      </Card>

      {/* Staff List */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">
              Optometrists ({filteredStaff.length})
            </h2>

            <Button size="sm" className="cursor-pointer">
              <UserRoundPlus className="w-4 h-4" />
              Add Staff Member
            </Button>
          </div>

          {filteredStaff.length === 0 && (
            <p className="text-sm text-gray-500">No staff members found.</p>
          )}

          {filteredStaff.map((member) => (
            <div
              key={member.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 border rounded-md p-4"
            >
              {/* Avatar + Info */}
              <div className="flex items-center gap-4">
                <Avatar className="text-white">
                  <AvatarImage src={member.imageSrc} />
                  <AvatarFallback className="bg-linear-to-r from-indigo-500 to-teal-600">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <p className="font-semibold">{member.name}</p>

                  <div className="text-sm text-gray-500 flex flex-wrap gap-4 mt-1">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" /> {member.role}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" /> {member.room}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {member.experience}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 mt-1">
                    Today: {member.today} • This Week: {member.week} •
                    Utilization: {member.utilization}%
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1">
                <div className="flex gap-1 items-center justify-center">
                  <ToggleButton
                    defaultOn={member.status}
                    onChange={(status) => {
                      setStaff((prev) =>
                        prev.map((item) =>
                          item.id === member.id ? { ...item, status } : item,
                        ),
                      );
                    }}
                  />
                  <span className="text-sm">
                    {member.status ? "Active" : "Inactive"}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="bg-blue-500 text-white hover:bg-blue-500/90 cursor-pointer"
                >
                  View Schedule
                </Button>
                <Button size="sm" variant="outline">
                  Edit Profile
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Performance Table */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-4">
            Staff Performance Comparison
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Staff</th>
                  <th className="text-center p-3">Today</th>
                  <th className="text-center p-3">Week</th>
                  <th className="text-center p-3">Month</th>
                  <th className="text-center p-3">Utilization</th>
                  <th className="text-center p-3">Satisfaction</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member, i) => (
                  <tr key={member.id} className="border-b">
                    <td className="p-3 font-medium">{member.name}</td>
                    <td className="p-3 text-center">{member.today}</td>
                    <td className="p-3 text-center">{member.week}</td>
                    <td className="p-3 text-center">{member.week * 4}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          member.utilization >= 90
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {member.utilization}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                        4.{8 - i}/5.0 ⭐
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
