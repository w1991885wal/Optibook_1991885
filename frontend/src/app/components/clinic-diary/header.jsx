export default function DiaryHeader({ date, onPrev, onNext, onToday }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="font-semibold text-lg">{date} – Multi-Clinician View</h2>
        <p className="text-sm text-gray-500">3 Optometrists Active Today</p>
      </div>

      <div className="flex gap-2">
        <button onClick={onPrev} className="btn-outline">
          ‹ Previous
        </button>
        <button onClick={onToday} className="btn-outline">
          Today
        </button>
        <button onClick={onNext} className="btn-outline">
          Next ›
        </button>
      </div>
    </div>
  );
}
