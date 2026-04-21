import { Bar } from "react-chartjs-2";

const defaultData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  datasets: [
    {
      label: "Appointments",
      data: [12, 19, 8, 15, 22],
      backgroundColor: "#0066CC",
      borderRadius: 6,
    },
  ],
};

const defaultOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
  },
};

export default function BarChart({ data, options } = {}) {
  return <Bar data={data || defaultData} options={options || defaultOptions} />;
}
