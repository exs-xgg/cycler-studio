import React from 'react';
import type { BikePosition, BikeType } from '../utils/angles';
import { Play, Square, RotateCcw } from 'lucide-react';
import type { RecordingState } from '../hooks/usePoseDetection';

interface ControlsProps {
  position: BikePosition;
  setPosition: (pos: BikePosition) => void;
  bikeType: BikeType;
  setBikeType: (type: BikeType) => void;
  recordingState: RecordingState;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  isModelLoaded: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  position, setPosition, bikeType, setBikeType,
  recordingState, onStart, onStop, onReset, isModelLoaded
}) => {
  const canChange = recordingState === 'inactive' || recordingState === 'done';

  return (
    <div className="controls-panel glass-panel">
      <h2>Fit Settings</h2>

      <div className="control-group">
        <label>Bike Type</label>
        <div className="button-group">
          {(['Road', 'Hybrid', 'Mountain'] as BikeType[]).map(type => (
            <button
              key={type}
              className={`select-btn ${bikeType === type ? 'active' : ''}`}
              onClick={() => setBikeType(type)}
              disabled={!canChange}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group">
        <label>Riding Position</label>
        <div className="button-group">
          {(['Race/Aero', 'Endurance', 'Casual'] as BikePosition[]).map(pos => (
            <button
              key={pos}
              className={`select-btn ${position === pos ? 'active' : ''}`}
              onClick={() => setPosition(pos)}
              disabled={!canChange}
            >
              {pos.split('/')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="action-buttons">
        {canChange ? (
          <button
            className="action-btn start-btn"
            onClick={recordingState === 'done' ? onReset : onStart}
            disabled={!isModelLoaded}
          >
            {recordingState === 'done'
              ? <><RotateCcw size={18} /> New Session</>
              : <><Play size={18} /> Start Tracking</>}
          </button>
        ) : (
          <button className="action-btn stop-btn" onClick={() => { onStop(); onReset(); }}>
            <Square size={18} /> Stop
          </button>
        )}
      </div>
    </div>
  );
};
