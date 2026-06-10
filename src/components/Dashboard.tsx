import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { BikeFitMetrics } from '../utils/angles';
import type { ConnectionStatus, TrainerData } from '../hooks/useBluetoothTrainer';

interface DashboardProps {
  metrics: BikeFitMetrics | null;
  history: BikeFitMetrics[];
  trainerStatus?: ConnectionStatus;
  trainerData?: TrainerData;
}

const JOINT_CONFIG = [
  { key: 'elbowAngle', label: 'Elbow Angle', color: '#00f0ff', idealMin: 150, idealMax: 160 },
  { key: 'hipAngle', label: 'Hip Angle', color: '#ff003c', idealMin: 60, idealMax: 110 },
  { key: 'kneeAngle', label: 'Knee Angle', color: '#39ff14', idealMin: 65, idealMax: 145 },
] as const;

export const Dashboard: React.FC<DashboardProps> = ({ metrics, history, trainerStatus, trainerData }) => {
  return (
    <div className="dashboard-panel glass-panel">
      <h2>Live Telemetry</h2>

      {trainerStatus === 'connected' && trainerData && (
        <div className="metrics-grid" style={{ marginBottom: '1rem' }}>
          <MetricCard title="Power" value={trainerData.power} unit="W" color="#eab308" />
          <MetricCard title="Cadence" value={trainerData.cadence} unit="rpm" color="#a78bfa" />
          <MetricCard title="Speed" value={trainerData.speed} unit="km/h" color="#34d399" />
          <MetricCard title="Heart Rate" value={trainerData.heartRate} unit="bpm" color="#f87171" na={trainerData.heartRate === null} />
        </div>
      )}

      <div className="metrics-grid">
        <MetricCard title="Elbow" value={metrics?.elbowAngle} unit="°" color="#00f0ff" />
        <MetricCard title="Hip" value={metrics?.hipAngle} unit="°" color="#ff003c" />
        <MetricCard title="Knee" value={metrics?.kneeAngle} unit="°" color="#39ff14" />
        <MetricCard title="Ankle" value={metrics?.anklingRange} unit="°" na />
      </div>

      <div className="charts-grid">
        {history.length > 0 ? (
          JOINT_CONFIG.map(joint => {
            const data = history.slice(-200).map((m, i) => ({
              t: i,
              value: Math.round(m[joint.key] as number),
            }));
            return (
              <div key={joint.key} className="chart-card">
                <div className="chart-card-header">
                  <span className="chart-dot" style={{ background: joint.color }}></span>
                  <span className="chart-label">{joint.label}</span>
                  <span className="chart-range">{joint.idealMin}°–{joint.idealMax}°</span>
                </div>
                <div className="chart-body">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="t" hide />
                      <YAxis
                        domain={[
                          (min: number) => Math.min(min, joint.idealMin) - 10,
                          (max: number) => Math.max(max, joint.idealMax) + 10,
                        ]}
                        stroke="#555"
                        fontSize={10}
                        tickCount={4}
                      />
                      <Tooltip
                        contentStyle={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '12px' }}
                        labelStyle={{ display: 'none' }}
                        formatter={(v: any) => [`${v}°`, joint.label]}
                      />
                      <ReferenceLine y={joint.idealMin} stroke={joint.color} strokeDasharray="4 4" strokeOpacity={0.4} />
                      <ReferenceLine y={joint.idealMax} stroke={joint.color} strokeDasharray="4 4" strokeOpacity={0.4} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={joint.color}
                        dot={false}
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-chart" style={{ gridColumn: '1 / -1' }}>Waiting for data...</div>
        )}
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, unit, color, na }: { title: string; value?: number | null; unit: string; color?: string; na?: boolean }) => (
  <div className="metric-card">
    <div className="metric-title">{title}</div>
    <div className="metric-value" style={color && value != null ? { color } : undefined}>
      {value != null ? Math.round(value) : na ? 'N/A' : '--'}<span className="metric-unit">{value != null ? unit : ''}</span>
    </div>
  </div>
);
