import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { BikeFitMetrics } from '../utils/angles';

interface DashboardProps {
  metrics: BikeFitMetrics | null;
  history: BikeFitMetrics[];
}

export const Dashboard: React.FC<DashboardProps> = ({ metrics, history }) => {
  // Format data for Recharts
  const chartData = history.map((m, index) => ({
    time: index, // In a real app we'd use actual timestamps
    Elbow: Math.round(m.elbowAngle),
    Hip: Math.round(m.hipAngle),
    Knee: Math.round(m.kneeAngle),
    Ankle: Math.round(m.anklingRange)
  })).slice(-100); // Keep last 100 points for performance

  return (
    <div className="dashboard-panel glass-panel">
      <h2>Live Telemetry</h2>
      
      <div className="metrics-grid">
        <MetricCard title="Elbow Angle" value={metrics?.elbowAngle} unit="°" />
        <MetricCard title="Hip Angle" value={metrics?.hipAngle} unit="°" />
        <MetricCard title="Knee Angle" value={metrics?.kneeAngle} unit="°" />
        <MetricCard title="Ankling Range" value={metrics?.anklingRange} unit="°" />
      </div>

      <div className="chart-container">
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" hide />
              <YAxis domain={['auto', 'auto']} stroke="#a1a1aa" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 17, 21, 0.9)', border: '1px solid rgba(255,255,255,0.1)' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="Elbow" stroke="#00f0ff" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line type="monotone" dataKey="Hip" stroke="#ff003c" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line type="monotone" dataKey="Knee" stroke="#39ff14" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line type="monotone" dataKey="Ankle" stroke="#ffb800" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-chart">Waiting for data...</div>
        )}
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, unit }: { title: string, value?: number, unit: string }) => (
  <div className="metric-card">
    <div className="metric-title">{title}</div>
    <div className="metric-value">
      {value !== undefined ? Math.round(value) : '--'}<span className="metric-unit">{unit}</span>
    </div>
  </div>
);
