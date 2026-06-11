
export type Point = {
  x: number;
  y: number;
};

/**
 * Calculates the angle between three points (a, b, c) where b is the vertex.
 * From the paper: math.atan2(c[1]-b[1], c[0]-b[0]) - math.atan2(a[1]-b[1], a[0]-b[0])
 */
export const calculateAngle = (a: Point, b: Point, c: Point): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360.0 - angle;
  return angle;
};

/**
 * Applies an average filter to smooth gradual changes and reduce noise
 */
export const applyAverageFilter = (data: number, prevData: number, filterFactor: number = 0.5): number => {
  return data * filterFactor + prevData * (1 - filterFactor);
};

export interface BikeFitMetrics {
  elbowAngle: number;
  hipAngle: number;
  kneeAngle: number;
  /** null when using MoveNet (no foot keypoints available) */
  anklingRange: number | null;
}

export type BikePosition = 'Race/Aero' | 'Endurance' | 'Casual';
export type BikeType = 'Road' | 'Hybrid' | 'Mountain';

export const getFitLabel = (
  metrics: BikeFitMetrics,
  position: BikePosition = 'Race/Aero',
  bikeType: BikeType = 'Road'
): 'Fit' | 'Not Fit' => {
  const { elbowAngle, hipAngle, kneeAngle, anklingRange } = metrics;

  let targetHip = { min: 60, max: 110 };
  const targetElbow = { min: 150, max: 160 };
  const targetKnee = { min: 65, max: 145 };
  const targetAnkling = { min: 115, max: 180 };

  if (position === 'Endurance') {
    targetHip = { min: 70, max: 115 };
  } else if (position === 'Casual') {
    targetHip = { min: 80, max: 120 };
  }

  void bikeType;
  const isHipFit = hipAngle >= targetHip.min && hipAngle <= targetHip.max;
  const isElbowFit = elbowAngle >= targetElbow.min && elbowAngle <= targetElbow.max;
  const isKneeFit = kneeAngle >= targetKnee.min && kneeAngle <= targetKnee.max;
  const isAnklingFit = anklingRange === null || (anklingRange >= targetAnkling.min && anklingRange <= targetAnkling.max);

  if (isHipFit && isElbowFit && isKneeFit && isAnklingFit) {
    return 'Fit';
  }
  return 'Not Fit';
};
