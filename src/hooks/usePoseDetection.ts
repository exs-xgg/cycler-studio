/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/immutability */
import { useState, useEffect, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { calculateAngle, applyAverageFilter } from '../utils/angles';
import type { BikeFitMetrics, Point } from '../utils/angles';

export type RecordingState = 'inactive' | 'recording' | 'analyzing' | 'done';

export interface UsePoseDetectionResult {
  isModelLoaded: boolean;
  recordingState: RecordingState;
  currentMetrics: BikeFitMetrics | null;
  recordedData: BikeFitMetrics[];
  error: string | null;
  warning: string | null;
  totalFrames: number;
  detectedFrames: number;
  elapsedSeconds: number;
  startTracking: () => void;
  stopTracking: () => void;
  reset: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

// MoveNet keypoint indices
const KEYPOINT = {
  nose: 0, left_eye: 1, right_eye: 2, left_ear: 3, right_ear: 4,
  left_shoulder: 5, right_shoulder: 6, left_elbow: 7, right_elbow: 8,
  left_wrist: 9, right_wrist: 10, left_hip: 11, right_hip: 12,
  left_knee: 13, right_knee: 14, left_ankle: 15, right_ankle: 16,
} as const;

const SKELETON_CONNECTIONS: [number, number][] = [
  [KEYPOINT.left_shoulder, KEYPOINT.left_elbow],
  [KEYPOINT.left_elbow, KEYPOINT.left_wrist],
  [KEYPOINT.left_shoulder, KEYPOINT.left_hip],
  [KEYPOINT.left_hip, KEYPOINT.left_knee],
  [KEYPOINT.left_knee, KEYPOINT.left_ankle],
  [KEYPOINT.right_shoulder, KEYPOINT.right_elbow],
  [KEYPOINT.right_elbow, KEYPOINT.right_wrist],
  [KEYPOINT.right_shoulder, KEYPOINT.right_hip],
  [KEYPOINT.right_hip, KEYPOINT.right_knee],
  [KEYPOINT.right_knee, KEYPOINT.right_ankle],
  [KEYPOINT.left_shoulder, KEYPOINT.right_shoulder],
  [KEYPOINT.left_hip, KEYPOINT.right_hip],
];

function drawSkeleton(ctx: CanvasRenderingContext2D, keypoints: poseDetection.Keypoint[]) {
  // Draw connections
  ctx.strokeStyle = '#39ff14';
  ctx.lineWidth = 2;
  for (const [i, j] of SKELETON_CONNECTIONS) {
    const a = keypoints[i];
    const b = keypoints[j];
    if (a.score! > 0.25 && b.score! > 0.25) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // Draw points
  ctx.fillStyle = '#00f0ff';
  for (const kp of keypoints) {
    if (kp.score! > 0.25) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

function getMissingJointsMessage(keypoints: poseDetection.Keypoint[]): string | null {
  const joints = [
    { idx: KEYPOINT.right_shoulder, name: 'shoulder' },
    { idx: KEYPOINT.right_elbow, name: 'elbow' },
    { idx: KEYPOINT.right_wrist, name: 'wrist' },
    { idx: KEYPOINT.right_hip, name: 'hip' },
    { idx: KEYPOINT.right_knee, name: 'knee' },
    { idx: KEYPOINT.right_ankle, name: 'ankle' },
  ];

  // Check right side
  const missingRight = joints.filter(j => !(keypoints[j.idx] && keypoints[j.idx].score !== undefined && (keypoints[j.idx].score as number) > 0.25)).map(j => j.name);
  // Check left side (offset by -1 since left indices are one less than right in MoveNet)
  const leftJoints = [
    { idx: KEYPOINT.left_shoulder, name: 'shoulder' },
    { idx: KEYPOINT.left_elbow, name: 'elbow' },
    { idx: KEYPOINT.left_wrist, name: 'wrist' },
    { idx: KEYPOINT.left_hip, name: 'hip' },
    { idx: KEYPOINT.left_knee, name: 'knee' },
    { idx: KEYPOINT.left_ankle, name: 'ankle' },
  ];
  const missingLeft = leftJoints.filter(j => !(keypoints[j.idx] && keypoints[j.idx].score !== undefined && (keypoints[j.idx].score as number) > 0.25)).map(j => j.name);

  if (missingRight.length === 0 || missingLeft.length === 0) return null;

  const best = missingRight.length <= missingLeft.length ? missingRight : missingLeft;
  const side = missingRight.length <= missingLeft.length ? 'right' : 'left';
  return `Can't see ${side} ${best.join(', ')} — ensure your full side profile is visible`;
}

export const usePoseDetection = (videoRef: React.RefObject<HTMLVideoElement | null>): UsePoseDetectionResult => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('inactive');
  const [currentMetrics, setCurrentMetrics] = useState<BikeFitMetrics | null>(null);
  const [recordedData, setRecordedData] = useState<BikeFitMetrics[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [totalFrames, setTotalFrames] = useState(0);
  const [detectedFrames, setDetectedFrames] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);

  const stateRef = useRef<RecordingState>('inactive');
  const recordingStartTimeRef = useRef<number>(0);
  const prevMetricsRef = useRef<BikeFitMetrics | null>(null);
  const recordedDataRef = useRef<BikeFitMetrics[]>([]);
  const totalFramesRef = useRef(0);
  const detectedFramesRef = useRef(0);
  const consecutiveMissRef = useRef(0);

  useEffect(() => { stateRef.current = recordingState; }, [recordingState]);
  useEffect(() => { recordedDataRef.current = recordedData; }, [recordedData]);

  // Load MoveNet Thunder on mount
  useEffect(() => {
    let cancelled = false;
    const initModel = async () => {
      try {
        console.log('[CyclerFit] Initializing TensorFlow...');
        await tf.ready();
        console.log('[CyclerFit] TF backend:', tf.getBackend());

        // Use MoveNet Thunder — more robust than BlazePose, no @mediapipe dependency
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
          }
        );

        if (!cancelled) {
          detectorRef.current = detector;
          setIsModelLoaded(true);
          setError(null);
          console.log('[CyclerFit] MoveNet Thunder loaded successfully');
        }
      } catch (err: any) {
        console.error('[CyclerFit] Model init error:', err);
        if (!cancelled) setError(`Model failed to load: ${err.message}`);
      }
    };
    initModel();
    return () => {
      cancelled = true;
      detectorRef.current?.dispose();
      detectorRef.current = null;
    };
  }, []);

  const runLoop = useCallback(async () => {
    const detector = detectorRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!detector || !video || !canvas || !isTrackingRef.current) return;

    if (video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(() => runLoop());
      return;
    }

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    }

    try {
      const poses = await detector.estimatePoses(video);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(runLoop);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (stateRef.current === 'recording') {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setElapsedSeconds(elapsed);
        totalFramesRef.current++;
        setTotalFrames(totalFramesRef.current);
      }

      if (poses.length > 0) {
        const keypoints = poses[0].keypoints;
        drawSkeleton(ctx, keypoints);

        const getPoint = (idx: number): Point | null => {
          const kp = keypoints[idx];
          if (kp && kp.score! > 0.25) return { x: kp.x, y: kp.y };
          return null;
        };

        // Try right side, then left
        const sides = [
          {
            shoulder: getPoint(KEYPOINT.right_shoulder),
            elbow: getPoint(KEYPOINT.right_elbow),
            wrist: getPoint(KEYPOINT.right_wrist),
            hip: getPoint(KEYPOINT.right_hip),
            knee: getPoint(KEYPOINT.right_knee),
            ankle: getPoint(KEYPOINT.right_ankle),
          },
          {
            shoulder: getPoint(KEYPOINT.left_shoulder),
            elbow: getPoint(KEYPOINT.left_elbow),
            wrist: getPoint(KEYPOINT.left_wrist),
            hip: getPoint(KEYPOINT.left_hip),
            knee: getPoint(KEYPOINT.left_knee),
            ankle: getPoint(KEYPOINT.left_ankle),
          },
        ];

        let foundSide = false;
        for (const s of sides) {
          if (s.shoulder && s.elbow && s.wrist && s.hip && s.knee && s.ankle) {
            let elbowAngle = calculateAngle(s.shoulder, s.elbow, s.wrist);
            let hipAngle = calculateAngle(s.shoulder, s.hip, s.knee);
            let kneeAngle = calculateAngle(s.hip, s.knee, s.ankle);

            if (prevMetricsRef.current) {
              elbowAngle = applyAverageFilter(elbowAngle, prevMetricsRef.current.elbowAngle);
              hipAngle = applyAverageFilter(hipAngle, prevMetricsRef.current.hipAngle);
              kneeAngle = applyAverageFilter(kneeAngle, prevMetricsRef.current.kneeAngle);
            }

            // anklingRange is null — MoveNet doesn't provide foot_index keypoints
            const current: BikeFitMetrics = { elbowAngle, hipAngle, kneeAngle, anklingRange: null };
            prevMetricsRef.current = current;
            setCurrentMetrics(current);
            consecutiveMissRef.current = 0;
            setWarning(null);

            if (stateRef.current === 'recording') {
              detectedFramesRef.current++;
              setDetectedFrames(detectedFramesRef.current);
              const updated = [...recordedDataRef.current, current];
              recordedDataRef.current = updated;
              setRecordedData(updated);

              if (Date.now() - recordingStartTimeRef.current >= 20000) {
                setRecordingState('analyzing');
                isTrackingRef.current = false;
                setTimeout(() => setRecordingState('done'), 1500);
              }
            }
            foundSide = true;
            break;
          }
        }

        if (!foundSide && stateRef.current === 'recording') {
          consecutiveMissRef.current++;
          const msg = getMissingJointsMessage(keypoints);
          if (msg) {
            setWarning(msg);
          } else if (consecutiveMissRef.current > 15) {
            setWarning('Body not fully visible — adjust your position or camera angle');
          }
        }
      } else {
        if (stateRef.current === 'recording') {
          consecutiveMissRef.current++;
          if (consecutiveMissRef.current > 10) {
            setWarning('No body detected — make sure you are in frame');
          }
        }
      }
    } catch (e: any) {
      console.error('[CyclerFit] Frame error:', e);
      setError(`Tracking error: ${e.message}`);
    }

    if (isTrackingRef.current) {
      animationFrameRef.current = requestAnimationFrame(runLoop);
    }
  }, [videoRef]);

  const startTracking = useCallback(() => {
    if (isTrackingRef.current) return;
    isTrackingRef.current = true;
    prevMetricsRef.current = null;
    recordedDataRef.current = [];
    totalFramesRef.current = 0;
    detectedFramesRef.current = 0;
    consecutiveMissRef.current = 0;
    setRecordedData([]);
    setCurrentMetrics(null);
    setError(null);
    setWarning(null);
    setTotalFrames(0);
    setDetectedFrames(0);
    setElapsedSeconds(0);
    setRecordingState('recording');
    recordingStartTimeRef.current = Date.now();
    animationFrameRef.current = requestAnimationFrame(runLoop);
  }, [runLoop, isModelLoaded]);

  const stopTracking = useCallback(() => {
    isTrackingRef.current = false;
    if (animationFrameRef.current != null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopTracking();
    setRecordingState('inactive');
    setRecordedData([]);
    recordedDataRef.current = [];
    setCurrentMetrics(null);
    prevMetricsRef.current = null;
    setError(null);
    setWarning(null);
    setTotalFrames(0);
    setDetectedFrames(0);
    setElapsedSeconds(0);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [stopTracking]);

  return {
    isModelLoaded, recordingState, currentMetrics, recordedData,
    error, warning, totalFrames, detectedFrames, elapsedSeconds,
    startTracking, stopTracking, reset, canvasRef,
  };
};
