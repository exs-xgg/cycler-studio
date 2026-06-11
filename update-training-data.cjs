const fs = require('fs');
const file = 'src/components/TrainingData.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update imports
content = content.replace(
  /Award,\n\s*ArrowRight/g,
  'Award, Download,\n  ArrowRight'
);

// Add interface props
content = content.replace(
  /sessionStats: SessionStats \| null;\n\s*onStartSession/g,
  `sessionStats: SessionStats | null;
  workoutPlan?: { power: number; duration: number }[];
  activeWorkoutStepIndex?: number;
  workoutStepRemainingTime?: number;
  onStartSession`
);

content = content.replace(
  /onNavigateSettings: \(\) => void;\n}/g,
  `onNavigateSettings: () => void;
  onAddWorkoutStep?: (power: number, duration: number) => void;
}`
);

// Add destructured props
content = content.replace(
  /sessionStats,\n\s*onStartSession/g,
  `sessionStats,
  workoutPlan = [],
  activeWorkoutStepIndex = -1,
  workoutStepRemainingTime = 0,
  onStartSession`
);

content = content.replace(
  /onNavigateSettings,\n}\) => {/g,
  `onNavigateSettings,
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
  };`
);

// Add Workout Session Builder & Active Workout Display
const insertUiIdx = content.indexOf('{/* Main Metrics */}');
const uiCode = `
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

      `;
content = content.slice(0, insertUiIdx) + uiCode + content.slice(insertUiIdx);

// Add Export FIT action
const exportBtnIdx = content.lastIndexOf('</div>\n        </div>\n      )}\n    </div>\n  );\n};');
const exportBtnCode = `
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
          `;
content = content.slice(0, exportBtnIdx) + exportBtnCode + content.slice(exportBtnIdx);

fs.writeFileSync(file, content);
