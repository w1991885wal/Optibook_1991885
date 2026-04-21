import { Search } from "lucide-react";
import { Button } from "../../ui/button";

export default function PatientsToolbar() {
  return (
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

      <select className="px-4 py-2 border rounded-md text-sm">
        <option>All patients</option>
        <option>Regular</option>
        <option>New</option>
      </select>
    </div>
  );
}
