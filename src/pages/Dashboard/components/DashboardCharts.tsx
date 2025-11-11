import React from 'react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';

export const DashboardCharts: React.FC = () => {
  // Pie chart data
  const pieData = [
    { name: 'Complete', value: 65, color: '#4ade80' },
    { name: 'In Progress', value: 25, color: '#facc15' },
    { name: 'Not Started', value: 10, color: '#f87171' },
  ];

  // Bar chart data
  const barData = [
    { month: 'Jan', newEmployees: 12, completedCourses: 7 },
    { month: 'Feb', newEmployees: 19, completedCourses: 11 },
    { month: 'Mar', newEmployees: 8, completedCourses: 5 },
    { month: 'Apr', newEmployees: 15, completedCourses: 8 },
    { month: 'May', newEmployees: 12, completedCourses: 3 },
    { month: 'Jun', newEmployees: 18, completedCourses: 14 },
  ];

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Training Status Overview</h2>
        <div className="h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Statistics</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="newEmployees" fill="rgba(59, 130, 246, 0.8)" name="New Employees" />
              <Bar dataKey="completedCourses" fill="rgba(16, 185, 129, 0.8)" name="Completed Courses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
