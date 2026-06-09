import React, { useMemo } from 'react';
import { getFitLabel } from '../utils/angles';
import type { BikeFitMetrics, BikePosition, BikeType } from '../utils/angles';
import { Copy, CheckCircle, XCircle } from 'lucide-react';

interface ResultsProps {
  recordedData: BikeFitMetrics[];
  position: BikePosition;
  bikeType: BikeType;
}

export const Results: React.FC<ResultsProps> = ({ recordedData, position, bikeType }) => {
  const averages = useMemo(() => {
    if (recordedData.length === 0) return null;
    
    const sum = recordedData.reduce((acc, curr) => ({
      elbowAngle: acc.elbowAngle + curr.elbowAngle,
      hipAngle: acc.hipAngle + curr.hipAngle,
      kneeAngle: acc.kneeAngle + curr.kneeAngle,
      anklingRange: acc.anklingRange + curr.anklingRange,
    }), { elbowAngle: 0, hipAngle: 0, kneeAngle: 0, anklingRange: 0 });

    return {
      elbowAngle: sum.elbowAngle / recordedData.length,
      hipAngle: sum.hipAngle / recordedData.length,
      kneeAngle: sum.kneeAngle / recordedData.length,
      anklingRange: sum.anklingRange / recordedData.length,
    };
  }, [recordedData]);

  if (!averages) return null;

  const fitLabel = getFitLabel(averages, position, bikeType);
  
  const metadataString = JSON.stringify({
    settings: { position, bikeType },
    averageMetrics: {
      elbowAngle: Math.round(averages.elbowAngle * 100) / 100,
      hipAngle: Math.round(averages.hipAngle * 100) / 100,
      kneeAngle: Math.round(averages.kneeAngle * 100) / 100,
      anklingRange: Math.round(averages.anklingRange * 100) / 100,
    },
    samplesCollected: recordedData.length
  }, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(metadataString);
  };

  return (
    <div className="results-panel glass-panel">
      <div className="results-header">
        <h2>Analysis Results</h2>
        <div className={`fit-badge ${fitLabel === 'Fit' ? 'fit-success' : 'fit-fail'}`}>
          {fitLabel === 'Fit' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span>{fitLabel}</span>
        </div>
      </div>

      <div className="results-summary">
        <p>Based on a 20-second recording for a <strong>{bikeType}</strong> bike in <strong>{position}</strong> position.</p>
      </div>

      <div className="metadata-section">
        <div className="metadata-header">
          <h3>Raw Metadata</h3>
          <button className="copy-btn" onClick={copyToClipboard} title="Copy Metadata">
            <Copy size={16} />
          </button>
        </div>
        <textarea 
          readOnly 
          value={metadataString}
          className="metadata-textarea"
        />
      </div>
    </div>
  );
};
