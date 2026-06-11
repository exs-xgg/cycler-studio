const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<TrainingData([\s\S]*?)onNavigateSettings=\{navigateToSettings\}\n\s*\/>/g,
  `<TrainingData$1onNavigateSettings={navigateToSettings}
          workoutPlan={trainer.workoutPlan}
          activeWorkoutStepIndex={trainer.activeWorkoutStepIndex}
          workoutStepRemainingTime={trainer.workoutStepRemainingTime}
          onAddWorkoutStep={trainer.addWorkoutStep}
        />`
);

fs.writeFileSync(file, content);
