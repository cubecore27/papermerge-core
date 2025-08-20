// LineChart.tsx

import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import "./chartStyle.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type LineChartProps = {
  labels: string[];
  dataPoints: number[];
};

export default function LineChart({ labels, dataPoints }: LineChartProps) {
  const data = {
    labels,
    datasets: [
      {
        label: "Documents",
        data: dataPoints,
        fill: false,
        borderColor: "rgba(75,192,192,1)",
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Monthly Document Uploads" },
    },
  };

  return (
    <div className="chartCardCont">
      <Line data={data} options={options} />
    </div>
  );
}
