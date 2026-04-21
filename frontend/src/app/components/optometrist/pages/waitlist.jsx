import { waitlistPatients } from "../../common/mock-data";
import { Check, Sigma, WatchIcon } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import WaitlistRow from "../../common/waitlist/WaitlistRow";

export default function WaitListPage() {
  return (
    <div className="space-y-4">
      <h1 className="mb-2 text-gray-400 font-normal">Waitlist</h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="border-l-4 border-l-[#FF6B6B]">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3 ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Total Waitlist</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
                <div className="w-12 h-12 bg-[#FF6B6B] rounded-lg flex items-center justify-center">
                  <Sigma className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs">2 high Priority</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#FFD93D]">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3 ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Avg Wait Time</p>
                  <p className="text-2xl font-bold">4d</p>
                </div>
                <div className="w-12 h-12 bg-[#FFD93D] rounded-lg flex items-center justify-center">
                  <WatchIcon className="w-6 h-6 text-black" />
                </div>
              </div>
              <p className="text-xs">Within target</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#51CF66]">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3 ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Auto Filled</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
                <div className="w-12 h-12 bg-[#51CF66] rounded-lg flex items-center justify-center">
                  <Check className="w-6 h-6 text-black" />
                </div>
              </div>
              <p className="text-xs text-[#51CF66]">
                ↗ System working efficiently
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold">
          Active Waitlist ({waitlistPatients.length} Total)
        </h2>

        <div className="space-y-3">
          {waitlistPatients.map((patient) => (
            <WaitlistRow key={patient.id} patient={patient} />
          ))}
        </div>
      </Card>
    </div>
  );
}
