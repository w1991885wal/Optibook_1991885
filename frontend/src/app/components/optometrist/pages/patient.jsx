import { patients } from "../../common/mock-data";
import PatientRow from "../../common/patient/PatientRow";
import PatientsToolbar from "../../common/patient/PatientToolbar";
import { Card } from "../../ui/card";

export default function PatientsPage() {
  return (
    <div className="space-y-4">
      <h1 className="mb-2 text-gray-400 font-normal">My Patients</h1>

      <Card className="p-4 ">
        <PatientsToolbar />
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold">
          Patient List ({patients.length} Total)
        </h2>

        <div className="space-y-3">
          {patients.map((patient) => (
            <PatientRow key={patient.id} patient={patient} />
          ))}
        </div>
      </Card>
    </div>
  );
}
