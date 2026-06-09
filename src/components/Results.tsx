import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getFitLabel } from '../utils/angles';
import type { BikeFitMetrics, BikePosition, BikeType } from '../utils/angles';
import { Copy, Check, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface ResultsProps {
  recordedData: BikeFitMetrics[];
  position: BikePosition;
  bikeType: BikeType;
  totalFrames: number;
  detectedFrames: number;
}

export const Results: React.FC<ResultsProps> = ({ recordedData, position, bikeType, totalFrames, detectedFrames }) => {
  const [copied, setCopied] = useState(false);

  const dynamicIdealRanges = useMemo(() => {
    let hipMin = 60;
    let hipMax = 110;
    if (position === 'Endurance') {
      hipMin = 70;
      hipMax = 115;
    } else if (position === 'Casual') {
      hipMin = 80;
      hipMax = 120;
    }

    return {
      elbowAngle: { min: 150, max: 160, label: 'Elbow Angle', color: '#00f0ff' },
      hipAngle: { min: hipMin, max: hipMax, label: 'Hip Angle', color: '#ff003c' },
      kneeAngle: { min: 65, max: 145, label: 'Knee Angle', color: '#39ff14' },
      anklingRange: { min: 115, max: 180, label: 'Ankling Range', color: '#ffaa00' },
    };
  }, [position]);

  const averages = useMemo(() => {
    if (recordedData.length === 0) return null;
    const sum = recordedData.reduce((acc, curr) => ({
      elbowAngle: acc.elbowAngle + curr.elbowAngle,
      hipAngle: acc.hipAngle + curr.hipAngle,
      kneeAngle: acc.kneeAngle + curr.kneeAngle,
      anklingRange: curr.anklingRange != null ? (acc.anklingRange ?? 0) + curr.anklingRange : acc.anklingRange,
    }), { elbowAngle: 0, hipAngle: 0, kneeAngle: 0, anklingRange: null as number | null });
    const n = recordedData.length;
    return {
      elbowAngle: sum.elbowAngle / n,
      hipAngle: sum.hipAngle / n,
      kneeAngle: sum.kneeAngle / n,
      anklingRange: sum.anklingRange != null ? sum.anklingRange / n : null,
    };
  }, [recordedData]);

  const warnings = useMemo(() => {
    const w: string[] = [];
    const detRate = totalFrames > 0 ? detectedFrames / totalFrames : 0;
    if (recordedData.length === 0) {
      // handled below
    } else if (recordedData.length < 30) {
      w.push(`Very few data points collected (${recordedData.length}). Results may be unreliable. Ensure your full body is visible.`);
    } else if (recordedData.length < 100) {
      w.push(`Only ${recordedData.length} data points collected. For best results, ensure good lighting and a clear side profile.`);
    }
    if (detRate < 0.4 && totalFrames > 0) {
      w.push(`Low detection rate (${Math.round(detRate * 100)}%). The camera could only see your body in ${detectedFrames} of ${totalFrames} frames.`);
    }
    if (averages?.anklingRange == null) {
      w.push('Ankling range could not be measured — MoveNet does not track foot keypoints. Use a full-body model (BlazePose) for this metric.');
    }
    return w;
  }, [recordedData, totalFrames, detectedFrames, averages]);

  if (!averages || recordedData.length === 0) {
    return (
      <div className="results-panel glass-panel">
        <div className="alert alert-error">
          <AlertTriangle size={16} /> No data was collected. The camera could not detect your body during the recording. Make sure your full side profile is visible and try again.
        </div>
      </div>
    );
  }

  const fitLabel = getFitLabel(averages, position, bikeType);

  const jointResults = Object.entries(dynamicIdealRanges)
    .filter(([key]) => {
      // Skip ankling range if not available
      if (key === 'anklingRange' && averages.anklingRange == null) return false;
      return true;
    })
    .map(([key, range]) => {
      const value = averages[key as keyof BikeFitMetrics] as number;
      const inRange = value >= range.min && value <= range.max;
      let advice = '';
      if (!inRange) {
        if (value < range.min) {
          advice = `Too low by ${Math.round(range.min - value)}° — `;
          if (key === 'hipAngle') advice += 'try raising your handlebars or shortening your stem';
          else if (key === 'kneeAngle') advice += 'your saddle may be too low';
          else if (key === 'elbowAngle') advice += 'your reach may be too short';
          else if (key === 'anklingRange') advice += 'check your cleat position';
        } else {
          advice = `Too high by ${Math.round(value - range.max)}° — `;
          if (key === 'hipAngle') advice += 'try lowering your handlebars or lengthening your stem';
          else if (key === 'kneeAngle') advice += 'your saddle may be too high';
          else if (key === 'elbowAngle') advice += 'your reach may be too long';
          else if (key === 'anklingRange') advice += 'check your foot position on the pedal';
        }
      }
      return { key, label: range.label, value, min: range.min, max: range.max, inRange, advice };
    });

  const metadataString = JSON.stringify({
    settings: { position, bikeType },
    fitLabel,
    averageMetrics: {
      elbowAngle: Math.round(averages.elbowAngle * 100) / 100,
      hipAngle: Math.round(averages.hipAngle * 100) / 100,
      kneeAngle: Math.round(averages.kneeAngle * 100) / 100,
      anklingRange: averages.anklingRange != null ? Math.round(averages.anklingRange * 100) / 100 : 'N/A (not measurable with MoveNet)',
    },
    idealRanges: dynamicIdealRanges,
    dataQuality: {
      samplesCollected: recordedData.length,
      totalFrames,
      detectedFrames,
      detectionRate: totalFrames > 0 ? Math.round((detectedFrames / totalFrames) * 100) : 0,
    },
    perJoint: jointResults.map(j => ({
      joint: j.label, measured: Math.round(j.value * 100) / 100,
      range: `${j.min}°–${j.max}°`, status: j.inRange ? 'Fit' : 'Not Fit',
    })),
  }, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(metadataString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      {warnings.length > 0 && (
        <div className="results-warnings">
          {warnings.map((w, i) => (
            <div key={i} className="alert alert-warning">
              <AlertTriangle size={16} /> {w}
            </div>
          ))}
        </div>
      )}

      <div className="results-summary">
        <p>
          Based on {recordedData.length} samples over 20 seconds for a <strong>{bikeType}</strong> bike
          in <strong>{position}</strong> position.
        </p>
      </div>

      <div className="joint-breakdown">
        <h3>Joint Analysis</h3>
        {jointResults.map(j => (
          <div key={j.key} className={`joint-row ${j.inRange ? 'joint-fit' : 'joint-notfit'}`}>
            <div className="joint-info">
              <div className="joint-label">
                {j.inRange ? <CheckCircle size={14} /> : <XCircle size={14} />}
                <span>{j.label}</span>
              </div>
              <div className="joint-values">
                <span className="joint-measured">{Math.round(j.value)}°</span>
                <span className="joint-range">ideal: {j.min}°–{j.max}°</span>
              </div>
            </div>
            {!j.inRange && (
              <div className="joint-advice">
                <Info size={12} /> {j.advice}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="results-charts-section">
        <h3>Session Graphs (Angle Variation)</h3>
        <div className="charts-grid">
          {Object.entries(dynamicIdealRanges)
            .filter(([key]) => {
              if (key === 'anklingRange' && averages.anklingRange == null) return false;
              return true;
            })
            .map(([key, range]) => {
              const data = recordedData.map((m, i) => ({
                t: i,
                value: Math.round(m[key as keyof BikeFitMetrics] as number),
              }));

              return (
                <div key={key} className="chart-card">
                  <div className="chart-card-header">
                    <span className="chart-dot" style={{ background: range.color }}></span>
                    <span className="chart-label">{range.label}</span>
                    <span className="chart-range">{range.min}°–{range.max}°</span>
                  </div>
                  <div className="chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="t" hide />
                        <YAxis
                          domain={[
                            (min: number) => Math.min(min, range.min) - 10,
                            (max: number) => Math.max(max, range.max) + 10,
                          ]}
                          stroke="#555"
                          fontSize={10}
                          tickCount={4}
                        />
                        <Tooltip
                          contentStyle={{ background: 'rgba(15,17,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '12px' }}
                          labelStyle={{ display: 'none' }}
                          formatter={(v: any) => [`${v}°`, range.label]}
                        />
                        <ReferenceLine y={range.min} stroke={range.color} strokeDasharray="4 4" strokeOpacity={0.4} />
                        <ReferenceLine y={range.max} stroke={range.color} strokeDasharray="4 4" strokeOpacity={0.4} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={range.color}
                          dot={false}
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="metadata-section">
        <div className="metadata-header">
          <h3>Raw Metadata</h3>
          <button className="copy-btn" onClick={copyToClipboard} title="Copy Metadata">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        <textarea readOnly value={metadataString} className="metadata-textarea" />
      </div>
    </div>
  );
};
