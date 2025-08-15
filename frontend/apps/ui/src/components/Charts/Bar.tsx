// install this -> npm install chart.js react-chartjs-2

// style
import "./chartStyle.css";

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const data = {
  labels: ['Receipt', 'Application Form', 'Contracts', 'Invoices'],
  datasets: [
    {
      label: 'Documents',
      data: [300, 500, 400, 600],
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
    },
  ],
};

const options = {
  responsive: true,
  plugins: {
    legend: { position: 'top' },
    title: { display: true, text: 'User Document Upload' },
  },
};

export default function BarChart() {
  return (
    <div className="chartCardCont">
      <Bar data={data} options={options} />
    </div>
  );
}

