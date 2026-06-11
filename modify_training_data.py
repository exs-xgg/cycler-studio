import re

with open('src/components/TrainingData.tsx', 'r') as f:
    content = f.read()

# Replace Workout Session Builder inline styles with classes
content = content.replace(
    '''<div className="add-step-form" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input type="number" placeholder="Watts" value={stepPower} onChange={e => setStepPower(e.target.value)} style={{ width: '80px', padding: '4px' }} />
            <input type="number" placeholder="Min" value={stepMin} onChange={e => setStepMin(e.target.value)} style={{ width: '60px', padding: '4px' }} />
            <input type="number" placeholder="Sec" value={stepSec} onChange={e => setStepSec(e.target.value)} style={{ width: '60px', padding: '4px' }} />
            <button onClick={handleAddStep} style={{ padding: '4px 8px' }}>Add Step</button>
            {workoutPlan.length > 0 && onClearWorkoutPlan && (
              <button onClick={onClearWorkoutPlan} style={{ padding: '4px 8px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444' }}>Clear Plan</button>
            )}
          </div>''',
    '''<div className="add-step-form">
            <input type="number" placeholder="Watts" value={stepPower} onChange={e => setStepPower(e.target.value)} className="workout-input watts-input" />
            <input type="number" placeholder="Min" value={stepMin} onChange={e => setStepMin(e.target.value)} className="workout-input time-input" />
            <input type="number" placeholder="Sec" value={stepSec} onChange={e => setStepSec(e.target.value)} className="workout-input time-input" />
            <button onClick={handleAddStep} className="action-btn add-step-btn">Add Step</button>
            {workoutPlan.length > 0 && onClearWorkoutPlan && (
              <button onClick={onClearWorkoutPlan} className="action-btn clear-plan-btn">Clear Plan</button>
            )}
          </div>'''
)

content = content.replace(
    '''<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {workoutPlan.map((step, idx) => (
                <li key={idx} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {step.power}W for {formatTime(step.duration)}
                </li>
              ))}
            </ul>''',
    '''<ul className="workout-list">
              {workoutPlan.map((step, idx) => (
                <li key={idx} className="workout-item">
                  {step.power}W for {formatTime(step.duration)}
                </li>
              ))}
            </ul>'''
)

content = content.replace(
    '''<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            </div>''',
    '''<div className="active-workout-details">
              <div>
                <div className="active-workout-target">
                  Target: {workoutPlan[activeWorkoutStepIndex].power}W
                </div>
                <div className="active-workout-step-info">
                  Step {activeWorkoutStepIndex + 1} of {workoutPlan.length}
                </div>
              </div>
              <div className="active-workout-timer">
                {formatTime(workoutStepRemainingTime)}
              </div>
            </div>'''
)

with open('src/components/TrainingData.tsx', 'w') as f:
    f.write(content)
