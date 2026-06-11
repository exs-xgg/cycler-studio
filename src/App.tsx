import { useState, useRef } from 'react';
import { usePoseDetection } from './hooks/usePoseDetection';
import { useBluetoothTrainer } from './hooks/useBluetoothTrainer';
import { CameraView } from './components/CameraView';
import { Dashboard } from './components/Dashboard';
import { Controls } from './components/Controls';
import { Results } from './components/Results';
import { TrainerSettings } from './components/TrainerSettings';
import { TrainingData } from './components/TrainingData';
import type { BikePosition, BikeType } from './utils/angles';
import { Activity, Settings, Bike, Bluetooth, BluetoothConnected } from 'lucide-react';
import './App.css';

type Page = 'fit' | 'training' | 'settings';

function App() {
  const [activePage, setActivePage] = useState<Page>('fit');
  const videoRef = useRef<HTMLVideoElement>(null);

  const [position, setPosition] = useState<BikePosition>('Race/Aero');
  const [bikeType, setBikeType] = useState<BikeType>('Road');

  const {
    isModelLoaded, recordingState, currentMetrics, recordedData,
    error, warning, totalFrames, detectedFrames, elapsedSeconds,
    startTracking, stopTracking, reset, canvasRef
  } = usePoseDetection(videoRef);

  const trainer = useBluetoothTrainer();

  const navigateToSettings = () => setActivePage('settings');

  return (
    <div className="app-container">
      {/* Navigation Bar */}
      <nav className="app-nav glass-panel" id="main-navigation">
        <div className="nav-brand">
          <Bike size={24} />
          <span className="nav-title">Cycler</span>
        </div>

        <div className="nav-tabs">
          <button
            className={`nav-tab ${activePage === 'fit' ? 'active' : ''}`}
            onClick={() => setActivePage('fit')}
            id="nav-tab-fit"
          >
            <Activity size={16} />
            <span>Fit Analysis</span>
          </button>
          <button
            className={`nav-tab ${activePage === 'training' ? 'active' : ''}`}
            onClick={() => setActivePage('training')}
            id="nav-tab-training"
          >
            <Activity size={16} />
            <span>Training Data</span>
            {trainer.status === 'connected' && (
              <span className="nav-tab-indicator connected" />
            )}
          </button>
          <button
            className={`nav-tab ${activePage === 'settings' ? 'active' : ''}`}
            onClick={() => setActivePage('settings')}
            id="nav-tab-settings"
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </div>

        <div className="nav-status">
          {trainer.status === 'connected' ? (
            <span className="bt-status connected">
              <BluetoothConnected size={14} />
              {trainer.deviceName}
            </span>
          ) : (
            <span className="bt-status disconnected">
              <Bluetooth size={14} />
              No Trainer
            </span>
          )}
        </div>
      </nav>

      {/* Page Content */}
      <div className="content-area">
        {activePage === 'fit' && (
          <>
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
                  trainerStatus={trainer.status}
                  trainerData={trainer.currentData}
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
          </>
        )}

        {activePage === 'training' && (
          <TrainingData
            status={trainer.status}
            currentData={trainer.currentData}
            dataHistory={trainer.dataHistory}
            config={trainer.config}
            isSessionActive={trainer.isSessionActive}
            elapsedTime={trainer.elapsedTime}
            sessionStats={trainer.sessionStats}
            onStartSession={trainer.startSession}
            onStopSession={trainer.stopSession}
            onResetSession={trainer.resetSession}
            onNavigateSettings={navigateToSettings}
          />
        )}

        {activePage === 'settings' && (
          <TrainerSettings
            status={trainer.status}
            deviceName={trainer.deviceName}
            serviceType={trainer.serviceType}
            error={trainer.error}
            config={trainer.config}
            hasControl={trainer.hasControl}
            currentData={trainer.currentData}
            onConnect={trainer.connect}
            onDisconnect={trainer.disconnect}
            onConfigChange={trainer.setConfig}
          />
        )}
      </div>
    </div>
  );
}

export default App;
