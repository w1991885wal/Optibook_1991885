import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";

import "react-day-picker/dist/style.css";

export default function Calendar({ value, onChange }) {
  const [selected, setSelected] = React.useState(value ?? undefined);

  const handleSelect = (date) => {
    setSelected(date);
    onChange?.(date);
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <CalendarIcon className="h-4 w-4" />
          {selected ? format(selected, "PPP") : "Pick a date"}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          className="z-50 mt-2 rounded-xl border bg-white p-3 shadow-lg"
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            className="rounded-md"
            modifiersClassNames={{
              selected: "bg-blue-600 text-white",
              today: "border border-blue-600",
            }}
          />

          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
