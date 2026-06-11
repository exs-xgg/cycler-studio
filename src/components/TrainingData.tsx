import React from 'react';
import {
  Zap, Gauge, CircleDot, Heart, Timer, Play, Square, RotateCcw,
  BluetoothOff, Activity, TrendingUp, Route, Clock, Award, Download,
  ArrowRight,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import type { TrainerData, TrainerDataPoint, TrainerConfig, SessionStats, ConnectionStatus } from '../hooks/useBluetoothTrainer';
import { getPowerZone } from '../hooks/useBluetoothTrainer';

interface TrainingDataProps {
  status: ConnectionStatus;
  currentData: TrainerData;
  dataHistory: TrainerDataPoint[];
  config: TrainerConfig;
  isSessionActive: boolean;
  elapsedTime: number;
  sessionStats: SessionStats | null;
  workoutPlan?: { power: number; duration: number }[];
  activeWorkoutStepIndex?: number;
  workoutStepRemainingTime?: number;
  onStartSession: () => void;
  onStopSession: () => void;
  onResetSession: () => void;
  onNavigateSettings: () => void;
  onAddWorkoutStep?: (power: number, duration: number) => void;
}

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const TrainingData: React.FC<TrainingDataProps> = ({
  status, currentData, dataHistory, config,
  isSessionActive, elapsedTime, sessionStats,
  workoutPlan = [],
  activeWorkoutStepIndex = -1,
  workoutStepRemainingTime = 0,
  onStartSession, onStopSession, onResetSession, onNavigateSettings,
  onAddWorkoutStep,
}) => {
  const [stepPower, setStepPower] = React.useState('');
  const [stepMin, setStepMin] = React.useState('');
  const [stepSec, setStepSec] = React.useState('');

  const handleAddStep = () => {
    const p = parseInt(stepPower) || 0;
    const m = parseInt(stepMin) || 0;
    const s = parseInt(stepSec) || 0;
    if (p > 0 && (m > 0 || s > 0) && onAddWorkoutStep) {
      onAddWorkoutStep(p, m * 60 + s);
      setStepPower('');
      setStepMin('');
      setStepSec('');
    }
  };
  const isConnected = status === 'connected';
  const zone = getPowerZone(currentData.power, config.ftp);
  const ftpPercent = config.ftp > 0 ? Math.round((currentData.power / config.ftp) * 100) : 0;

  if (!isConnected) {
    return (
      <div className="training-page">
        <div className="training-not-connected glass-panel">
          <div className="not-connected-icon">
            <BluetoothOff size={64} />
          </div>
          <h2>No Trainer Connected</h2>
          <p>Connect your indoor bike trainer to start viewing live training data.</p>
          <button className="action-btn scan-btn" onClick={onNavigateSettings} id="training-goto-settings">
            Go to Settings <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="training-page">
      {/* Power Zone Banner */}
      <div className="zone-banner" style={{ borderColor: zone.color, background: `${zone.color}12` }}>
        <div className="zone-banner-left">
          <span className="zone-number" style={{ color: zone.color }}>Z{zone.zone}</span>
          <span className="zone-name-label">{zone.name}</span>
        </div>
        <div className="zone-banner-right">
          <span className="ftp-percent" style={{ color: zone.color }}>{ftpPercent}%</span>
          <span className="ftp-label">of FTP</span>
        </div>
      </div>


      {/* Workout Session Builder */}
      {!isSessionActive && !sessionStats && onAddWorkoutStep && (
        <div className="workout-builder glass-panel">
          <h3>Workout Plan</h3>
          <div className="add-step-form" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input type="number" placeholder="Watts" value={stepPower} onChange={e => setStepPower(e.target.value)} style={{ width: '80px', padding: '4px' }} />
            <input type="number" placeholder="Min" value={stepMin} onChange={e => setStepMin(e.target.value)} style={{ width: '60px', padding: '4px' }} />
            <input type="number" placeholder="Sec" value={stepSec} onChange={e => setStepSec(e.target.value)} style={{ width: '60px', padding: '4px' }} />
            <button onClick={handleAddStep} style={{ padding: '4px 8px' }}>Add Step</button>
          </div>
          {workoutPlan.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {workoutPlan.map((step, idx) => (
                <li key={idx} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {step.power}W for {formatTime(step.duration)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Active Workout Display */}
      {isSessionActive && workoutPlan.length > 0 && (
        <div className="active-workout glass-panel">
          <h3>Current Workout Step</h3>
          {activeWorkoutStepIndex < workoutPlan.length ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1.2rem', color: '#00f0ff' }}>
                  Target: {workoutPlan[activeWorkoutStepIndex].power}W
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                  Step {activeWorkoutStepIndex + 1} of {workoutPlan.length}
                </div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>
                {formatTime(workoutStepRemainingTime)}
              </div>
            </div>
          ) : (
            <div>Workout Complete!</div>
          )}
        </div>
      )}

      {/* Main Metrics */}
      <div className="training-metrics-grid">
        <div className="training-metric-card primary glass-panel" id="training-power-card">
          <div className="metric-icon" style={{ color: '#00f0ff' }}>
            <Zap size={20} />
          </div>
          <div className="training-metric-value" style={{ color: zone.color }}>
            {currentData.power}
          </div>
          <div className="training-metric-unit">watts</div>
          <div className="training-metric-label">Power</div>
        </div>

        <div className="training-metric-card glass-panel" id="training-cadence-card">
          <div className="metric-icon" style={{ color: '#a78bfa' }}>
            <CircleDot size={20} />
          </div>
          <div className="training-metric-value">{currentData.cadence}</div>
          <div className="training-metric-unit">rpm</div>
          <div className="training-metric-label">Cadence</div>
        </div>

        <div className="training-metric-card glass-panel" id="training-speed-card">
          <div className="metric-icon" style={{ color: '#34d399' }}>
            <Gauge size={20} />
          </div>
          <div className="training-metric-value">{currentData.speed.toFixed(1)}</div>
          <div className="training-metric-unit">km/h</div>
          <div className="training-metric-label">Speed</div>
        </div>

        {currentData.heartRate !== null && (
          <div className="training-metric-card glass-panel" id="training-hr-card">
            <div className="metric-icon" style={{ color: '#f87171' }}>
              <Heart size={20} />
            </div>
            <div className="training-metric-value">{currentData.heartRate}</div>
            <div className="training-metric-unit">bpm</div>
            <div className="training-metric-label">Heart Rate</div>
          </div>
        )}

        <div className="training-metric-card glass-panel" id="training-time-card">
          <div className="metric-icon" style={{ color: '#fbbf24' }}>
            <Timer size={20} />
          </div>
          <div className="training-metric-value time-value">{formatTime(elapsedTime)}</div>
          <div className="training-metric-unit">&nbsp;</div>
          <div className="training-metric-label">Elapsed</div>
        </div>
      </div>

      {/* Live Charts */}
      <div className="training-charts glass-panel">
        <h3><Activity size={16} /> Live Data</h3>
        <div className="training-chart-grid">
          <div className="training-chart-card">
            <div className="chart-card-header">
              <span className="chart-dot" style={{ backgroundColor: '#00f0ff' }} />
              <span className="chart-label">Power</span>
              <span className="chart-range">{currentData.power}W</span>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataHistory}>
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 17, 21, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                    formatter={(value: any) => [`${value}W`, 'Power']}
                    labelFormatter={(label: any) => formatTime(Number(label))}
                  />
                  <ReferenceLine y={config.ftp} stroke="#eab30866" strokeDasharray="4 4" label="" />
                  <Line
                    type="monotone"
                    dataKey="power"
                    stroke="#00f0ff"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="training-chart-card">
            <div className="chart-card-header">
              <span className="chart-dot" style={{ backgroundColor: '#a78bfa' }} />
              <span className="chart-label">Cadence</span>
              <span className="chart-range">{currentData.cadence} rpm</span>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataHistory}>
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 17, 21, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                    formatter={(value: any) => [`${value} rpm`, 'Cadence']}
                    labelFormatter={(label: any) => formatTime(Number(label))}
                  />
                  <Line
                    type="monotone"
                    dataKey="cadence"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Session Controls */}
      <div className="training-controls glass-panel">
        {!isSessionActive && !sessionStats ? (
          <button className="action-btn start-btn" onClick={onStartSession} id="training-start-btn">
            <Play size={18} /> Start Session
          </button>
        ) : isSessionActive ? (
          <button className="action-btn stop-btn" onClick={onStopSession} id="training-stop-btn">
            <Square size={18} /> Stop Session
          </button>
        ) : (
          <div className="session-done-controls">
            <button className="action-btn start-btn" onClick={onResetSession} id="training-reset-btn">
              <RotateCcw size={18} /> New Session
            </button>
          </div>
        )}
      </div>

      {/* Session Summary */}
      {sessionStats && !isSessionActive && (
        <div className="session-summary glass-panel" id="training-session-summary">
          <h3><Award size={18} /> Session Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-icon"><Zap size={16} /></div>
              <div className="summary-data">
                <span className="summary-value">{sessionStats.avgPower}</span>
                <span className="summary-label">Avg Power (W)</span>
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-icon"><TrendingUp size={16} /></div>
              <div className="summary-data">
                <span className="summary-value">{sessionStats.maxPower}</span>
                <span className="summary-label">Max Power (W)</span>
              </div>
            </div>
            <div className="summary-item highlight">
              <div className="summary-icon"><Activity size={16} /></div>
              <div className="summary-data">
                <span className="summary-value">{sessionStats.normalizedPower}</span>
                <span className="summary-label">Normalized (W)</span>
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-icon"><CircleDot size={16} /></div>
              <div className="summary-data">
                <span className="summary-value">{sessionStats.avgCadence}</span>
                <span className="summary-label">Avg Cadence</span>
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-icon"><Gauge size={16} /></div>
              <div className="summary-data">
                <span className="summary-value">{sessionStats.avgSpeed}</span>
                <span className="summary-label">Avg Speed (km/h)</span>
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-icon"><Route size={16} /></div>
              <div className="summary-data">
                <span className="summary-value">{sessionStats.totalDistance}</span>
                <span className="summary-label">Distance (km)</span>
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-icon"><Clock size={16} /></div>
              <div className="summary-data">
                <span className="summary-value">{formatTime(sessionStats.elapsedTime)}</span>
                <span className="summary-label">Duration</span>
              </div>
            </div>

            {/* Export FIT action */}
            <div className="summary-item" style={{ gridColumn: '1 / -1', marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
              <button
                className="action-btn"
                onClick={() => { import('../utils/fitFile').then(m => m.exportToFit(dataHistory, sessionStats)) }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                <Download size={16} /> Export to FIT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
