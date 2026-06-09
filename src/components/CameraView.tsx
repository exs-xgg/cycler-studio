import React, { useEffect } from 'react';
import { CameraOff, Loader, AlertTriangle } from 'lucide-react';
import type { RecordingState } from '../hooks/usePoseDetection';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isModelLoaded: boolean;
  recordingState: RecordingState;
  error: string | null;
  warning: string | null;
  elapsedSeconds: number;
  totalFrames: number;
  detectedFrames: number;
}

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef, canvasRef, isModelLoaded, recordingState,
  error, warning, elapsedSeconds, totalFrames, detectedFrames
}) => {
  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Error accessing camera: ", err);
      }
    };
    setupCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [videoRef]);

  const detectionRate = totalFrames > 0 ? Math.round((detectedFrames / totalFrames) * 100) : 0;

  return (
    <div className="camera-container glass-panel">
      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {warning && recordingState === 'recording' && (
        <div className="alert alert-warning">
          <AlertTriangle size={16} /> {warning}
        </div>
      )}

      <div className="camera-header">
        <div className="status-indicator">
          {!isModelLoaded ? (
            <><Loader className="spin" size={16} /> <span className="status-text warning">Loading Model...</span></>
          ) : recordingState === 'inactive' ? (
            <><CameraOff size={16} /> <span className="status-text">Click Start to Begin</span></>
          ) : recordingState === 'recording' ? (
            <><div className="recording-dot blink"></div> <span className="status-text danger">Recording... {20 - elapsedSeconds}s left</span></>
          ) : recordingState === 'analyzing' ? (
            <><Loader className="spin" size={16} /> <span className="status-text warning">Analyzing...</span></>
          ) : (
            <><CameraOff size={16} /> <span className="status-text success">Analysis Complete</span></>
          )}
        </div>

        {recordingState === 'recording' && (
          <div className="detection-rate">
            <span className={`rate-badge ${detectionRate > 70 ? 'rate-good' : detectionRate > 40 ? 'rate-ok' : 'rate-bad'}`}>
              {detectionRate}% detection
            </span>
          </div>
        )}
      </div>

      {recordingState === 'recording' && (
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${Math.min(100, (elapsedSeconds / 20) * 100)}%` }}></div>
        </div>
      )}

      <div className="video-wrapper">
        <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
        <canvas ref={canvasRef} className="pose-canvas" />
      </div>
    </div>
  );
};
