export default function DayTabs({ days, active, onChange }) {
  return (
    <div className="flex gap-2 mb-6">
      {days.map((day) => (
        <button
          key={day.key}
          onClick={() => onChange(day.key)}
          className={`px-4 py-2 rounded-md text-sm border cursor-pointer
            ${
              active === day.key
                ? "bg-black text-white"
                : "bg-white hover:bg-gray-100"
            }`}
        >
          {day.label}
        </button>
      ))}
    </div>
  );
}
