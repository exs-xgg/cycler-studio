import { useState, useEffect, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { calculateAngle, applyAverageFilter } from '../utils/angles';
import type { BikeFitMetrics, Point } from '../utils/angles';

export type RecordingState = 'idle' | 'readying' | 'recording' | 'analyzing' | 'done';

export interface UsePoseDetectionResult {
  isModelLoaded: boolean;
  recordingState: RecordingState;
  currentMetrics: BikeFitMetrics | null;
  recordedData: BikeFitMetrics[];
  startTracking: () => void;
  stopTracking: () => void;
  reset: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const usePoseDetection = (videoRef: React.RefObject<HTMLVideoElement | null>): UsePoseDetectionResult => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [currentMetrics, setCurrentMetrics] = useState<BikeFitMetrics | null>(null);
  const [recordedData, setRecordedData] = useState<BikeFitMetrics[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);
  
  // State refs for the recording logic
  const stateRef = useRef<RecordingState>('idle');
  const readyStartTimeRef = useRef<number>(0);
  const recordingStartTimeRef = useRef<number>(0);
  const prevMetricsRef = useRef<BikeFitMetrics | null>(null);

  useEffect(() => {
    stateRef.current = recordingState;
  }, [recordingState]);

  // Load the model
  useEffect(() => {
    const initModel = async () => {
      await tf.ready();
      const model = poseDetection.SupportedModels.BlazePose;
      const detectorConfig = {
        runtime: 'tfjs',
        enableSmoothing: true,
        modelType: 'full'
      } as poseDetection.BlazePoseTfjsModelConfig;
      
      detectorRef.current = await poseDetection.createDetector(model, detectorConfig);
      setIsModelLoaded(true);
    };
    initModel();
    
    return () => {
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const processFrame = useCallback(async () => {
    if (!detectorRef.current || !videoRef.current || !canvasRef.current || !isTrackingRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Match canvas size to video
    if (canvasRef.current.width !== video.videoWidth || canvasRef.current.height !== video.videoHeight) {
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
    }

    const poses = await detectorRef.current.estimatePoses(video, {
      flipHorizontal: false,
      maxPoses: 1
    });

    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      if (poses.length > 0) {
        const pose = poses[0];
        const keypoints = pose.keypoints;
        
        // Draw keypoints and skeleton for visual feedback
        drawSkeleton(ctx, keypoints);

        // Find relevant joints (Right side as per paper)
        const getPoint = (name: string): Point | null => {
          const kp = keypoints.find(k => k.name === name);
          // Only use points with decent confidence
          if (kp && kp.score && kp.score > 0.5) {
            return { x: kp.x, y: kp.y };
          }
          return null;
        };

        const rightShoulder = getPoint('right_shoulder');
        const rightElbow = getPoint('right_elbow');
        const rightWrist = getPoint('right_wrist');
        const rightHip = getPoint('right_hip');
        const rightKnee = getPoint('right_knee');
        const rightAnkle = getPoint('right_ankle');
        const rightFootIndex = getPoint('right_foot_index');

        if (rightShoulder && rightElbow && rightWrist && rightHip && rightKnee && rightAnkle && rightFootIndex) {
          // We have all points, calculate angles
          let elbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
          let hipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);
          let kneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
          let anklingRange = calculateAngle(rightKnee, rightAnkle, rightFootIndex);

          // Apply average filter
          if (prevMetricsRef.current) {
            elbowAngle = applyAverageFilter(elbowAngle, prevMetricsRef.current.elbowAngle);
            hipAngle = applyAverageFilter(hipAngle, prevMetricsRef.current.hipAngle);
            kneeAngle = applyAverageFilter(kneeAngle, prevMetricsRef.current.kneeAngle);
            anklingRange = applyAverageFilter(anklingRange, prevMetricsRef.current.anklingRange);
          }

          const current: BikeFitMetrics = { elbowAngle, hipAngle, kneeAngle, anklingRange };
          prevMetricsRef.current = current;
          setCurrentMetrics(current);

          const now = Date.now();
          const state = stateRef.current;

          if (state === 'idle') {
            // Rider is in position, start readying phase
            setRecordingState('readying');
            readyStartTimeRef.current = now;
          } else if (state === 'readying') {
            // Check if 2 seconds have passed
            if (now - readyStartTimeRef.current >= 2000) {
              setRecordingState('recording');
              recordingStartTimeRef.current = now;
              setRecordedData([]);
            }
          } else if (state === 'recording') {
            setRecordedData(prev => [...prev, current]);
            // Check if 20 seconds have passed
            if (now - recordingStartTimeRef.current >= 20000) {
              setRecordingState('analyzing');
              // Briefly show analyzing state, then done
              setTimeout(() => {
                setRecordingState('done');
                stopTracking();
              }, 1000);
            }
          }
        } else {
          // Missing points, reset to idle if not recording
          if (stateRef.current === 'readying') {
            setRecordingState('idle');
          }
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, []);

  const drawSkeleton = (ctx: CanvasRenderingContext2D, keypoints: poseDetection.Keypoint[]) => {
    ctx.fillStyle = '#00f0ff';
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 2;

    // Draw points
    keypoints.forEach(kp => {
      if (kp.score && kp.score > 0.5) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Simple connection drawing for right side
    const connections = [
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist'],
      ['right_shoulder', 'right_hip'],
      ['right_hip', 'right_knee'],
      ['right_knee', 'right_ankle'],
      ['right_ankle', 'right_foot_index']
    ];

    connections.forEach(([p1, p2]) => {
      const kp1 = keypoints.find(k => k.name === p1);
      const kp2 = keypoints.find(k => k.name === p2);
      if (kp1 && kp2 && kp1.score! > 0.5 && kp2.score! > 0.5) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.stroke();
      }
    });
  };

  const startTracking = useCallback(() => {
    if (!isTrackingRef.current) {
      isTrackingRef.current = true;
      setRecordingState('idle');
      setRecordedData([]);
      prevMetricsRef.current = null;
      processFrame();
    }
  }, [processFrame]);

  const stopTracking = useCallback(() => {
    isTrackingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const reset = useCallback(() => {
    stopTracking();
    setRecordingState('idle');
    setRecordedData([]);
    setCurrentMetrics(null);
    prevMetricsRef.current = null;
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [stopTracking]);

  return {
    isModelLoaded,
    recordingState,
    currentMetrics,
    recordedData,
    startTracking,
    stopTracking,
    reset,
    canvasRef
  };
};
