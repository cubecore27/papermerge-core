import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

type Props = {
  labels: string[];
  dataPoints: number[];
  chartTitle?: string;
};

export default function PieChart({ labels, dataPoints, chartTitle }: Props) {
  const data = {
    labels,
    datasets: [
      {
        label: chartTitle || "Active User Documents",
        data: dataPoints,
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#9966FF",
          "#4BC0C0",
        ],
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      title: { display: true, text: chartTitle || "Active Users Document Count" },
    },
  };

  return (
    <div className="chartCardCont">
      <Pie data={data} options={options} />
    </div>
  );
}
