import {
  Calendar,
  Check,
  ClockPlus,
  FolderPlus,
  Mail,
  Phone,
  Search,
  UsersRound,
} from "lucide-react";
import { patients, patientTabStatsAdmin } from "../../common/mock-data";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "../../ui/avatar";
import { ToggleButton } from "../../common/toggle";

export default function PatientsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold mb-2">Patient Management</h2>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-3 mb-8">
        <Card className="border-l-4 rounded-md border-l-[#0066CC] [box-shadow:0_4px_6px_-1px_rgba(0,102,204,0.4),0_2px_4px_-2px_rgba(0,102,204,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Total Patients</p>
                  <p className="text-2xl font-bold">
                    {patientTabStatsAdmin.activePatients}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#0066CC] rounded-sm flex items-center justify-center">
                  <UsersRound className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs">
                {patientTabStatsAdmin.activePatientsLabel}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#FFD93D] [box-shadow:0_4px_6px_-1px_rgba(255,217,61,0.4),0_2px_4px_-2px_rgba(255,217,61,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Active Patients</p>
                  <p className="text-2xl font-bold">
                    {patientTabStatsAdmin.activePatients}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#FFD93D] rounded-sm flex items-center justify-center">
                  <Check className="w-6 h-6 text-black" />
                </div>
              </div>
              <p className="text-xs text-[#51CF66]">
                {patientTabStatsAdmin.activePatientsLabel}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#51CF66] [box-shadow:0_4px_6px_-1px_rgba(81,207,102,0.4),0_2px_4px_-2px_rgba(81,207,102,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Due for Recall</p>
                  <p className="text-2xl font-bold">
                    {patientTabStatsAdmin.duePatient}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#51CF66] rounded-sm flex items-center justify-center">
                  <ClockPlus className="w-6 h-6 text-black" />
                </div>
              </div>
              <p className="text-xs text-[#51CF66]">
                {patientTabStatsAdmin.duePatientLabel}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#FF6B6B] [box-shadow:0_4px_6px_-1px_rgba(255,107,107,0.4),0_2px_4px_-2px_rgba(255,107,107,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">New This Month</p>
                  <p className="text-2xl font-bold">
                    {patientTabStatsAdmin.thisMonth}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#FF6B6B] rounded-sm flex items-center justify-center">
                  <FolderPlus className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs">{patientTabStatsAdmin.thisMonthLabel}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-4 ">
        <div className="flex items-center flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search patients by name or id..."
            className="flex-1 px-4 py-2 border rounded-md text-sm"
          />

          <Button size="sm">
            <Search className="w-4 h-4 mr-1" />
            Search
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold">
          Patient List ({patients.length} Total)
        </h2>

        <div className="space-y-3">
          {patients.map((patient) => (
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
                      Last Visit: {patient.lastVisit} • {patient.visits} total
                      visits • Dr. Emma Wilson
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1 items-center justify-center">
                    <ToggleButton
                      defaultOn={patient.status}
                      onChange={(status) => {
                        // alert("Chagne", status);
                      }}
                    />
                    <span className="text-sm">
                      {patient.status ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    variant={"outline"}
                  >
                    View/Edit Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
