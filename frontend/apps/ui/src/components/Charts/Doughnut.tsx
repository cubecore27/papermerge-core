// style
import "./chartStyle.css";

// DoughnutChart.tsx
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

type Props = {
  labels: string[];
  values: number[];
};

export default function DoughnutChart({ labels, values }: Props) {
  const data = {
    labels,
    datasets: [
      {
        // label: "Tag Distribution",
        label: "Item Distribution",
        data: values,
        backgroundColor: [
          "#4BC0C0",
          "#FF9F40",
          "#9966FF",
          "#FF6384",
          "#36A2EB",
          "#FFCD56",
        ],
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "right" },
      title: { display: true, text: "Item Distribution" },
    },
  };

  return (
    <div className="chartCardCont">
      <Doughnut data={data} options={options} />
    </div>
  );
}
