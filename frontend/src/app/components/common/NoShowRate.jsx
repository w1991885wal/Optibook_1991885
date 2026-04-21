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
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.parsed.y}% no-show`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 20,
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
