// style
import "./chartStyle.css";

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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const options = {
  responsive: true,
  plugins: {
    legend: { position: "top" },
    title: { display: true, text: "Monthly Document Uploads" },
  },
};

// Updated LineChart Component to receive labels and dataPoints as props
export default function LineChart({ labels, dataPoints }) {
  // Handle case when no data is provided
  const data = {
    labels: labels || [],
    datasets: [
      {
        label: "Documents",
        data: dataPoints || [],
        fill: false,
        borderColor: "rgba(75,192,192,1)",
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="chartCardCont">
      {/* Only render chart if both labels and dataPoints are available */}
      {labels?.length && dataPoints?.length ? (
        <Line data={data} options={options} />
      ) : (
        <div className="noDataText">No data available for document growth.</div>
      )}
    </div>
  );
}
