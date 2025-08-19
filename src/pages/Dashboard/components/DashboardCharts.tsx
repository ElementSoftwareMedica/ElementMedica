import React from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';

export const DashboardCharts: React.FC = () => {
  // Chart data
  const doughnutData = {
    labels: ['Complete', 'In Progress', 'Not Started'],
    datasets: [
      {
        data: [65, 25, 10],
        backgroundColor: ['#4ade80', '#facc15', '#f87171'],
        borderColor: ['#4ade80', '#facc15', '#f87171'],
        borderWidth: 1,
      },
    ],
  };

  const barData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'New Employees',
        data: [12, 19, 8, 15, 12, 18],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
      },
      {
        label: 'Completed Courses',
        data: [7, 11, 5, 8, 3, 14],
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Training Status Overview</h2>
        <div className="h-64 flex items-center justify-center">
          <Doughnut data={doughnutData} options={chartOptions} />
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Statistics</h2>
        <div className="h-64">
          <Bar data={barData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};