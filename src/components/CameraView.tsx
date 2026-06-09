import React, { useEffect } from 'react';
import { Camera, CameraOff, Loader } from 'lucide-react';
import type { RecordingState } from '../hooks/usePoseDetection';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isModelLoaded: boolean;
  recordingState: RecordingState;
}

export const CameraView: React.FC<CameraViewProps> = ({ 
  videoRef, 
  canvasRef, 
  isModelLoaded,
  recordingState
}) => {
  useEffect(() => {
    // Request camera access
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
      }
    };
    setupCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoRef]);

  return (
    <div className="camera-container glass-panel">
      <div className="camera-header">
        <div className="status-indicator">
          {!isModelLoaded ? (
            <><Loader className="spin" size={16} /> <span className="status-text warning">Loading Model...</span></>
          ) : recordingState === 'idle' ? (
            <><Camera size={16} /> <span className="status-text">Waiting for Rider...</span></>
          ) : recordingState === 'readying' ? (
            <><Camera size={16} /> <span className="status-text warning">Hold Position (Readying)...</span></>
          ) : recordingState === 'recording' ? (
            <><div className="recording-dot blink"></div> <span className="status-text danger">Recording Data...</span></>
          ) : recordingState === 'analyzing' ? (
            <><Loader className="spin" size={16} /> <span className="status-text warning">Analyzing...</span></>
          ) : (
            <><CameraOff size={16} /> <span className="status-text success">Analysis Complete</span></>
          )}
        </div>
      </div>
      
      <div className="video-wrapper">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="webcam-video"
        />
        <canvas 
          ref={canvasRef} 
          className="pose-canvas" 
        />
      </div>
    </div>
  );
};
