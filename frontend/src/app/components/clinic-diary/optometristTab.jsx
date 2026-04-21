export default function OptometristTabs({ items, active, setActive }) {
  const list =
    items && items.length > 0
      ? [{ id: "all", label: "All Optometrists" }, ...items]
      : [
          { id: "all", label: "All Optometrists" },
          { id: "emma", label: "Dr. Emma" },
          { id: "james", label: "Dr. James" },
          { id: "sarah", label: "Dr. Sarah" },
        ];

  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {list.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActive(tab.id)}
          className={`px-4 py-2 rounded-md text-sm border
            ${active === tab.id ? "bg-black text-white" : "bg-white"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
