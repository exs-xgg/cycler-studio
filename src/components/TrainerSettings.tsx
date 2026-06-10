import React, { useState } from 'react';
import {
  Bluetooth, BluetoothOff, BluetoothConnected, Loader, Wifi, WifiOff,
  Settings, Zap, Gauge, CircleDot, SlidersHorizontal, ChevronDown, ChevronUp,
  AlertTriangle, Heart, Activity,
} from 'lucide-react';
import type { ConnectionStatus, TrainerConfig, TrainerData, ResistanceMode } from '../hooks/useBluetoothTrainer';
import { getPowerZone } from '../hooks/useBluetoothTrainer';

interface TrainerSettingsProps {
  status: ConnectionStatus;
  deviceName: string | null;
  serviceType: 'FTMS' | 'CPS' | null;
  error: string | null;
  config: TrainerConfig;
  hasControl: boolean;
  currentData: TrainerData;
  onConnect: () => void;
  onDisconnect: () => void;
  onConfigChange: (config: TrainerConfig) => void;
}

export const TrainerSettings: React.FC<TrainerSettingsProps> = ({
  status, deviceName, serviceType, error, config, hasControl, currentData,
  onConnect, onDisconnect, onConfigChange,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('connection');

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const updateConfig = (partial: Partial<TrainerConfig>) => {
    onConfigChange({ ...config, ...partial });
  };

  const statusConfig = {
    disconnected: { icon: <BluetoothOff size={18} />, label: 'Disconnected', className: 'status-disconnected' },
    connecting: { icon: <Loader size={18} className="spin" />, label: 'Connecting…', className: 'status-connecting' },
    connected: { icon: <BluetoothConnected size={18} />, label: 'Connected', className: 'status-connected' },
    error: { icon: <AlertTriangle size={18} />, label: 'Error', className: 'status-error' },
  };

  const statusInfo = statusConfig[status];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="settings-title">
          <Settings size={24} />
          <h2>Trainer Settings</h2>
        </div>
        <p className="settings-subtitle">Connect and configure your indoor bike trainer</p>
      </div>

      {/* Connection Panel */}
      <div className="settings-section glass-panel">
        <button className="section-header" onClick={() => toggleSection('connection')} id="settings-connection-toggle">
          <div className="section-title">
            <Bluetooth size={18} />
            <h3>Connection</h3>
            <span className={`connection-badge ${statusInfo.className}`}>
              {statusInfo.icon}
              {statusInfo.label}
            </span>
          </div>
          {expandedSection === 'connection' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {expandedSection === 'connection' && (
          <div className="section-body">
            {error && (
              <div className="alert alert-error">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="connection-display">
              {status === 'connected' ? (
                <div className="connected-info">
                  <div className="device-card">
                    <div className="device-icon-wrapper">
                      <Wifi size={28} />
                    </div>
                    <div className="device-details">
                      <span className="device-name">{deviceName}</span>
                      <span className="device-service">
                        {serviceType === 'FTMS' ? 'Fitness Machine Service' : 'Cycling Power Service'}
                      </span>
                      <div className="device-capabilities">
                        <span className="capability-tag">
                          <Zap size={12} /> Power
                        </span>
                        {serviceType === 'FTMS' && (
                          <>
                            <span className="capability-tag">
                              <Gauge size={12} /> Speed
                            </span>
                            <span className="capability-tag">
                              <CircleDot size={12} /> Cadence
                            </span>
                          </>
                        )}
                        {hasControl && (
                          <span className="capability-tag accent">
                            <SlidersHorizontal size={12} /> Control
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Live Data Monitor */}
                  <div className="live-data-monitor" id="settings-live-data">
                    <div className="live-data-header">
                      <Activity size={14} />
                      <span>Live Data</span>
                      <span className="live-indicator">
                        <span className="live-dot" />
                        LIVE
                      </span>
                    </div>
                    <div className="live-data-grid">
                      <div className="live-data-item">
                        <Zap size={14} style={{ color: getPowerZone(currentData.power, config.ftp).color }} />
                        <span className="live-data-value" style={{ color: getPowerZone(currentData.power, config.ftp).color }}>
                          {currentData.power}
                        </span>
                        <span className="live-data-unit">W</span>
                      </div>
                      <div className="live-data-item">
                        <CircleDot size={14} style={{ color: '#a78bfa' }} />
                        <span className="live-data-value">{currentData.cadence}</span>
                        <span className="live-data-unit">rpm</span>
                      </div>
                      <div className="live-data-item">
                        <Gauge size={14} style={{ color: '#34d399' }} />
                        <span className="live-data-value">{currentData.speed.toFixed(1)}</span>
                        <span className="live-data-unit">km/h</span>
                      </div>
                      <div className="live-data-item">
                        <SlidersHorizontal size={14} style={{ color: '#fbbf24' }} />
                        <span className="live-data-value">{currentData.resistance}</span>
                        <span className="live-data-unit">res</span>
                      </div>
                      {currentData.heartRate !== null && (
                        <div className="live-data-item">
                          <Heart size={14} style={{ color: '#f87171' }} />
                          <span className="live-data-value">{currentData.heartRate}</span>
                          <span className="live-data-unit">bpm</span>
                        </div>
                      )}
                    </div>
                    <div className="live-data-zone">
                      <span className="live-zone-bar" style={{ backgroundColor: getPowerZone(currentData.power, config.ftp).color, width: `${Math.min(100, (currentData.power / config.ftp) * 100)}%` }} />
                      <span className="live-zone-label">
                        Z{getPowerZone(currentData.power, config.ftp).zone} · {getPowerZone(currentData.power, config.ftp).name}
                      </span>
                    </div>
                  </div>

                  <button className="action-btn disconnect-btn" onClick={onDisconnect} id="settings-disconnect-btn">
                    <WifiOff size={16} /> Disconnect
                  </button>
                </div>
              ) : (
                <div className="scan-prompt">
                  <div className="scan-icon-wrapper">
                    <BluetoothOff size={48} />
                  </div>
                  <p>No trainer connected</p>
                  <p className="scan-hint">Make sure your trainer is powered on and in pairing mode</p>
                  <button
                    className="action-btn scan-btn"
                    onClick={onConnect}
                    disabled={status === 'connecting'}
                    id="settings-scan-btn"
                  >
                    {status === 'connecting' ? (
                      <><Loader size={18} className="spin" /> Scanning…</>
                    ) : (
                      <><Bluetooth size={18} /> Scan for Trainers</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Trainer Configuration */}
      <div className="settings-section glass-panel">
        <button className="section-header" onClick={() => toggleSection('config')} id="settings-config-toggle">
          <div className="section-title">
            <SlidersHorizontal size={18} />
            <h3>Trainer Configuration</h3>
          </div>
          {expandedSection === 'config' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {expandedSection === 'config' && (
          <div className="section-body">
            <div className="config-group">
              <label>Resistance Mode</label>
              <div className="button-group">
                {(['ERG', 'Simulation', 'Manual'] as ResistanceMode[]).map(mode => (
                  <button
                    key={mode}
                    className={`select-btn ${config.resistanceMode === mode ? 'active' : ''}`}
                    onClick={() => updateConfig({ resistanceMode: mode })}
                    id={`settings-mode-${mode.toLowerCase()}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <span className="config-hint">
                {config.resistanceMode === 'ERG'
                  ? 'Trainer adjusts resistance to maintain target power'
                  : config.resistanceMode === 'Simulation'
                  ? 'Simulates outdoor riding resistance based on gradient'
                  : 'Manually control resistance level'}
              </span>
            </div>

            <div className="config-group">
              <label htmlFor="settings-ftp-input">Functional Threshold Power (FTP)</label>
              <div className="input-with-unit">
                <input
                  id="settings-ftp-input"
                  type="number"
                  value={config.ftp}
                  onChange={e => updateConfig({ ftp: Math.max(50, Math.min(500, Number(e.target.value))) })}
                  min={50}
                  max={500}
                />
                <span className="input-unit">watts</span>
              </div>
              <span className="config-hint">Used to calculate power zones (Z1–Z7)</span>
            </div>

            <div className="config-group">
              <label>Power Zones (based on {config.ftp}W FTP)</label>
              <div className="power-zones-preview">
                {[
                  { zone: 1, name: 'Recovery', range: `< ${Math.round(config.ftp * 0.55)}W`, color: '#a1a1aa' },
                  { zone: 2, name: 'Endurance', range: `${Math.round(config.ftp * 0.56)}–${Math.round(config.ftp * 0.75)}W`, color: '#3b82f6' },
                  { zone: 3, name: 'Tempo', range: `${Math.round(config.ftp * 0.76)}–${Math.round(config.ftp * 0.9)}W`, color: '#22c55e' },
                  { zone: 4, name: 'Threshold', range: `${Math.round(config.ftp * 0.91)}–${Math.round(config.ftp * 1.05)}W`, color: '#eab308' },
                  { zone: 5, name: 'VO2max', range: `${Math.round(config.ftp * 1.06)}–${Math.round(config.ftp * 1.2)}W`, color: '#f97316' },
                  { zone: 6, name: 'Anaerobic', range: `${Math.round(config.ftp * 1.21)}–${Math.round(config.ftp * 1.5)}W`, color: '#ef4444' },
                  { zone: 7, name: 'Neuromuscular', range: `> ${Math.round(config.ftp * 1.5)}W`, color: '#dc2626' },
                ].map(z => (
                  <div key={z.zone} className="zone-row">
                    <span className="zone-indicator" style={{ backgroundColor: z.color }} />
                    <span className="zone-label">Z{z.zone}</span>
                    <span className="zone-name">{z.name}</span>
                    <span className="zone-range">{z.range}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="config-group">
              <label htmlFor="settings-wheel-input">Wheel Circumference</label>
              <div className="input-with-unit">
                <input
                  id="settings-wheel-input"
                  type="number"
                  value={config.wheelCircumference}
                  onChange={e => updateConfig({ wheelCircumference: Number(e.target.value) })}
                  min={1000}
                  max={3000}
                />
                <span className="input-unit">mm</span>
              </div>
              <span className="config-hint">700×25c ≈ 2105mm, 700×28c ≈ 2136mm</span>
            </div>
          </div>
        )}
      </div>

      {/* Data Preferences */}
      <div className="settings-section glass-panel">
        <button className="section-header" onClick={() => toggleSection('data')} id="settings-data-toggle">
          <div className="section-title">
            <Gauge size={18} />
            <h3>Data Preferences</h3>
          </div>
          {expandedSection === 'data' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {expandedSection === 'data' && (
          <div className="section-body">
            <div className="config-group">
              <label>Smoothing Factor</label>
              <div className="slider-group">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={config.smoothingFactor * 100}
                  onChange={e => updateConfig({ smoothingFactor: Number(e.target.value) / 100 })}
                  className="settings-slider"
                  id="settings-smoothing-slider"
                />
                <span className="slider-value">{Math.round(config.smoothingFactor * 100)}%</span>
              </div>
              <span className="config-hint">Higher = smoother data, more latency</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
