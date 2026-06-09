// We use the tfjs runtime, so we don't need the actual @mediapipe/pose package.
// This mock prevents Vite/Rolldown from crashing due to missing exports in the original package.
export class Pose {}
export const VERSION = 'mock';
