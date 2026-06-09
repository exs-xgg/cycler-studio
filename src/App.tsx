import { useState, useRef } from 'react';
import { usePoseDetection } from './hooks/usePoseDetection';
import { CameraView } from './components/CameraView';
import { Dashboard } from './components/Dashboard';
import { Controls } from './components/Controls';
import { Results } from './components/Results';
import type { BikePosition, BikeType } from './utils/angles';
import './App.css';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [position, setPosition] = useState<BikePosition>('Race/Aero');
  const [bikeType, setBikeType] = useState<BikeType>('Road');

  const {
    isModelLoaded, recordingState, currentMetrics, recordedData,
    error, warning, totalFrames, detectedFrames, elapsedSeconds,
    startTracking, stopTracking, reset, canvasRef
  } = usePoseDetection(videoRef);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Cycler Fit</h1>
        <p className="subtitle">Real-time Biomechanical Analysis</p>
      </header>

      <main className="main-content">
        <div className="left-column">
          <CameraView
            videoRef={videoRef}
            canvasRef={canvasRef}
            isModelLoaded={isModelLoaded}
            recordingState={recordingState}
            error={error}
            warning={warning}
            elapsedSeconds={elapsedSeconds}
            totalFrames={totalFrames}
            detectedFrames={detectedFrames}
          />

          <Controls
            position={position}
            setPosition={setPosition}
            bikeType={bikeType}
            setBikeType={setBikeType}
            recordingState={recordingState}
            onStart={startTracking}
            onStop={stopTracking}
            onReset={reset}
            isModelLoaded={isModelLoaded}
          />
        </div>

        <div className="right-column">
          <Dashboard
            metrics={currentMetrics}
            history={recordedData}
          />

          {recordingState === 'done' && (
            <Results
              recordedData={recordedData}
              position={position}
              bikeType={bikeType}
              totalFrames={totalFrames}
              detectedFrames={detectedFrames}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
