import { Button } from "../../ui/button";

export default function DiaryHeader({
  title = "Week of January 13–19, 2026",
  subtitle = "Dr. Emma Wilson • Room 2",
  onPrev,
  onToday,
  onNext,
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="font-semibold text-lg">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onPrev}>
          ‹ Previous
        </Button>
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={onNext}>
          Next ›
        </Button>
      </div>
    </div>
  );
}
