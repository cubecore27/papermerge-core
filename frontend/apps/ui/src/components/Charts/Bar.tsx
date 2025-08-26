// BarChart.tsx

import React from 'react';
import { Bar } from 'react-chartjs-2';
import './chartStyle.css';

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

// Props: labels (file types), dataPoints (counts)
interface BarChartProps {
  labels: string[];
  dataPoints: number[];
}

const BarChart: React.FC<BarChartProps> = ({ labels, dataPoints }) => {
  const data = {
    labels,
    datasets: [
      {
        label: 'File Type Count',
        data: dataPoints,
        backgroundColor: 'rgba(17, 171, 242, 0.86)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Document File Types Count' },
    },
  };

  return (
    <div className="chartCardCont">
      <Bar data={data} options={options} />
    </div>
  );
};

export default BarChart;
