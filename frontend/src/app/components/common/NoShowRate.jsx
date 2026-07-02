import { Line } from "react-chartjs-2";
import { noShowData } from "./mock-data";

const buildDefaultData = () => ({
  labels: noShowData.labels,
  datasets: [
    {
      label: "No-Show Rate (%)",
      data: noShowData.rates,
      borderColor: "#004FFF",
      backgroundColor: "rgba(239,68,68,0.15)",
      fill: true,
      tension: 0.4,
      pointRadius: 5,
      pointHoverRadius: 7,
    },
  ],
});

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: "bottom",
      labels: { usePointStyle: true, boxWidth: 8 },
    },
    tooltip: {
      callbacks: {
        label: (ctx) =>
          `${ctx.dataset.label || "No-show rate"}: ${Number(
            ctx.parsed.y,
          ).toFixed(1)}%`,
      },
    },
  },
  scales: {
    y: {
      // Auto-scale to the data (sparse days can legitimately hit 100%),
      // but keep a sensible floor so quiet periods don't look jagged.
      beginAtZero: true,
      suggestedMax: 20,
      ticks: {
        callback: (value) => `${value}%`,
      },
      grid: {
        color: "#E5E7EB",
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
};

export default function NoShowLineChart({ data, options } = {}) {
  return (
    <div className="h-64">
      <Line data={data || buildDefaultData()} options={options || defaultOptions} />
    </div>
  );
}
