import { useState, useCallback, useRef, useEffect } from 'react';

// ── Bluetooth UUIDs ──────────────────────────────────────────────────────────
const FTMS_SERVICE_UUID = 0x1826;
const CYCLING_POWER_SERVICE_UUID = 0x1818;
const INDOOR_BIKE_DATA_UUID = 0x2ad2;
const CYCLING_POWER_MEASUREMENT_UUID = 0x2a63;
const FITNESS_MACHINE_CONTROL_POINT_UUID = 0x2ad9;

// ── Types ────────────────────────────────────────────────────────────────────
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ResistanceMode = 'ERG' | 'Simulation' | 'Manual';

export interface TrainerData {
  power: number;          // watts
  cadence: number;        // rpm
  speed: number;          // km/h
  heartRate: number | null;
  resistance: number;     // percentage 0-100
  timestamp: number;
}

export interface TrainerConfig {
  resistanceMode: ResistanceMode;
  ftp: number;
  wheelCircumference: number;  // mm
  smoothingFactor: number;     // 0-1
  updateFrequency: number;     // ms
}

export interface TrainerDataPoint {
  time: number;      // seconds since session start
  power: number;
  cadence: number;
  speed: number;
}

export interface SessionStats {
  avgPower: number;
  maxPower: number;
  normalizedPower: number;
  avgCadence: number;
  maxCadence: number;
  avgSpeed: number;
  totalDistance: number;   // km
  elapsedTime: number;    // seconds
}

const DEFAULT_CONFIG: TrainerConfig = {
  resistanceMode: 'ERG',
  ftp: 200,
  wheelCircumference: 2105,
  smoothingFactor: 0.3,
  updateFrequency: 1000,
};

const MAX_HISTORY = 300; // 5 minutes at 1hz

// ── Power Zones (based on FTP) ──────────────────────────────────────────────
export const getPowerZone = (power: number, ftp: number): { zone: number; name: string; color: string } => {
  const pct = (power / ftp) * 100;
  if (pct < 56) return { zone: 1, name: 'Active Recovery', color: '#a1a1aa' };
  if (pct < 76) return { zone: 2, name: 'Endurance', color: '#3b82f6' };
  if (pct < 91) return { zone: 3, name: 'Tempo', color: '#22c55e' };
  if (pct < 106) return { zone: 4, name: 'Threshold', color: '#eab308' };
  if (pct < 121) return { zone: 5, name: 'VO2max', color: '#f97316' };
  if (pct < 150) return { zone: 6, name: 'Anaerobic', color: '#ef4444' };
  return { zone: 7, name: 'Neuromuscular', color: '#dc2626' };
};

// ── Hook ─────────────────────────────────────────────────────────────────────
export const useBluetoothTrainer = () => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<'FTMS' | 'CPS' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentData, setCurrentData] = useState<TrainerData>(() => ({
    power: 0, cadence: 0, speed: 0, heartRate: null, resistance: 0, timestamp: Date.now(),
  }));

  const [dataHistory, setDataHistory] = useState<TrainerDataPoint[]>([]);
  const [config, setConfig] = useState<TrainerConfig>(() => {
    try {
      const saved = localStorage.getItem('cycler-trainer-config');
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  // Session tracking
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);

  // Refs for cleanup
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const controlPointRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const sessionDataRef = useRef<TrainerDataPoint[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCadenceRef = useRef<{ revolutions: number; eventTime: number } | null>(null);

  // Persist config
  useEffect(() => {
    localStorage.setItem('cycler-trainer-config', JSON.stringify(config));
  }, [config]);

  // Session timer
  useEffect(() => {
    if (isSessionActive && sessionStartTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSessionActive, sessionStartTime]);

  // ── FTMS Indoor Bike Data Parser ────────────────────────────────────────
  const parseFTMSData = useCallback((dataView: DataView): Partial<TrainerData> => {
    const flags = dataView.getUint16(0, true);
    let offset = 2;
    const result: Partial<TrainerData> = {};

    // Bit 0: More Data (0 = present)
    // Bit 1: Average Speed Present
    // Bit 2: Instantaneous Cadence Present
    // Bit 3: Average Cadence Present
    // Bit 4: Total Distance Present
    // Bit 5: Resistance Level Present
    // Bit 6: Instantaneous Power Present
    // Bit 7: Average Power Present

    // Instantaneous Speed (always present when bit 0 is 0)
    if (!(flags & 0x01)) {
      result.speed = dataView.getUint16(offset, true) * 0.01; // 1/100 km/h
      offset += 2;
    }

    // Average Speed
    if (flags & 0x02) {
      offset += 2; // skip
    }

    // Instantaneous Cadence
    if (flags & 0x04) {
      result.cadence = dataView.getUint16(offset, true) * 0.5; // 1/2 rpm
      offset += 2;
    }

    // Average Cadence
    if (flags & 0x08) {
      offset += 2; // skip
    }

    // Total Distance
    if (flags & 0x10) {
      offset += 3; // 3 bytes, skip
    }

    // Resistance Level
    if (flags & 0x20) {
      result.resistance = dataView.getInt16(offset, true);
      offset += 2;
    }

    // Instantaneous Power
    if (flags & 0x40) {
      result.power = dataView.getInt16(offset, true);
      offset += 2;
    }

    // Average Power
    if (flags & 0x80) {
      offset += 2; // skip
    }

    // Heart Rate
    if (flags & 0x200) {
      result.heartRate = dataView.getUint8(offset);
    }

    return result;
  }, []);

  // ── Cycling Power Measurement Parser ────────────────────────────────────
  const parseCPSData = useCallback((dataView: DataView): Partial<TrainerData> => {
    const flags = dataView.getUint16(0, true);
    let offset = 2;
    const result: Partial<TrainerData> = {};

    // Instantaneous Power (always present)
    result.power = dataView.getInt16(offset, true);
    offset += 2;

    // Pedal Power Balance
    if (flags & 0x01) {
      offset += 1;
    }

    // Accumulated Torque
    if (flags & 0x04) {
      offset += 2;
    }

    // Wheel Revolution Data
    if (flags & 0x10) {
      offset += 6; // cumulative revolutions (4) + last event time (2)
    }

    // Crank Revolution Data — derive cadence
    if (flags & 0x20) {
      const cumulativeRevolutions = dataView.getUint16(offset, true);
      const lastEventTime = dataView.getUint16(offset + 2, true);

      if (prevCadenceRef.current) {
        let revDiff = cumulativeRevolutions - prevCadenceRef.current.revolutions;
        if (revDiff < 0) revDiff += 65536; // handle overflow

        let timeDiff = lastEventTime - prevCadenceRef.current.eventTime;
        if (timeDiff < 0) timeDiff += 65536;

        if (timeDiff > 0) {
          result.cadence = Math.round((revDiff / (timeDiff / 1024)) * 60);
        }
      }
      prevCadenceRef.current = { revolutions: cumulativeRevolutions, eventTime: lastEventTime };
    }

    return result;
  }, []);

  // ── Notification Handler ────────────────────────────────────────────────
  const handleDataNotification = useCallback((event: Event) => {
    const characteristic = event.target as unknown as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;
    if (!value) return;

    let parsed: Partial<TrainerData>;

    if (characteristic.uuid === BluetoothUUID.getCharacteristic(INDOOR_BIKE_DATA_UUID)) {
      parsed = parseFTMSData(value);
    } else {
      parsed = parseCPSData(value);
    }

    setCurrentData(prev => ({
      ...prev,
      ...parsed,
      timestamp: Date.now(),
    }));

    // Append to history if session active
    if (isSessionActive && sessionStartTime) {
      const point: TrainerDataPoint = {
        time: Math.floor((Date.now() - sessionStartTime) / 1000),
        power: parsed.power ?? 0,
        cadence: parsed.cadence ?? 0,
        speed: parsed.speed ?? 0,
      };
      sessionDataRef.current.push(point);

      setDataHistory(prev => {
        const next = [...prev, point];
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
      });
    }
  }, [parseFTMSData, parseCPSData, isSessionActive, sessionStartTime]);

  // ── Connect ─────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError('Web Bluetooth is not supported in this browser. Use Chrome or Edge.');
      setStatus('error');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [FTMS_SERVICE_UUID] },
          { services: [CYCLING_POWER_SERVICE_UUID] },
        ],
        optionalServices: [FTMS_SERVICE_UUID, CYCLING_POWER_SERVICE_UUID],
      });

      deviceRef.current = device;
      setDeviceName(device.name ?? 'Unknown Trainer');

      // Listen for disconnection
      device.addEventListener('gattserverdisconnected', () => {
        setStatus('disconnected');
        setDeviceName(null);
        setServiceType(null);
        serverRef.current = null;
        controlPointRef.current = null;
      });

      const server = await device.gatt!.connect();
      serverRef.current = server;

      // Try FTMS first, fall back to CPS
      let subscribed = false;

      try {
        const ftmsService = await server.getPrimaryService(FTMS_SERVICE_UUID);
        const bikeDataChar = await ftmsService.getCharacteristic(INDOOR_BIKE_DATA_UUID);
        await bikeDataChar.startNotifications();
        bikeDataChar.addEventListener('characteristicvaluechanged', handleDataNotification);
        setServiceType('FTMS');
        subscribed = true;

        // Try to get control point
        try {
          controlPointRef.current = await ftmsService.getCharacteristic(FITNESS_MACHINE_CONTROL_POINT_UUID);
        } catch {
          // Control point not available — read-only mode
        }
      } catch {
        // FTMS not available, try CPS
      }

      if (!subscribed) {
        try {
          const cpsService = await server.getPrimaryService(CYCLING_POWER_SERVICE_UUID);
          const powerChar = await cpsService.getCharacteristic(CYCLING_POWER_MEASUREMENT_UUID);
          await powerChar.startNotifications();
          powerChar.addEventListener('characteristicvaluechanged', handleDataNotification);
          setServiceType('CPS');
          subscribed = true;
        } catch {
          // CPS also failed
        }
      }

      if (!subscribed) {
        throw new Error('No compatible services found on this device.');
      }

      setStatus('connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      if (message.includes('User cancelled')) {
        setStatus('disconnected');
      } else {
        setError(message);
        setStatus('error');
      }
    }
  }, [handleDataNotification]);

  // ── Disconnect ──────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    deviceRef.current = null;
    serverRef.current = null;
    controlPointRef.current = null;
    setStatus('disconnected');
    setDeviceName(null);
    setServiceType(null);
    prevCadenceRef.current = null;
  }, []);

  // ── Trainer Control Commands ────────────────────────────────────────────
  const setTargetPower = useCallback(async (watts: number) => {
    if (!controlPointRef.current) return;
    try {
      const buffer = new ArrayBuffer(3);
      const view = new DataView(buffer);
      view.setUint8(0, 0x05); // Set Target Power opcode
      view.setInt16(1, watts, true);
      await controlPointRef.current.writeValue(buffer);
    } catch (err) {
      console.warn('Failed to set target power:', err);
    }
  }, []);

  const setTargetResistance = useCallback(async (level: number) => {
    if (!controlPointRef.current) return;
    try {
      const buffer = new ArrayBuffer(3);
      const view = new DataView(buffer);
      view.setUint8(0, 0x04); // Set Target Resistance opcode
      view.setInt16(1, level * 10, true); // 0.1 resolution
      await controlPointRef.current.writeValue(buffer);
    } catch (err) {
      console.warn('Failed to set resistance:', err);
    }
  }, []);

  // ── Session Controls ────────────────────────────────────────────────────
  const startSession = useCallback(() => {
    sessionDataRef.current = [];
    setDataHistory([]);
    setSessionStats(null);
    setElapsedTime(0);
    setSessionStartTime(Date.now());
    setIsSessionActive(true);
  }, []);

  const stopSession = useCallback(() => {
    setIsSessionActive(false);

    const data = sessionDataRef.current;
    if (data.length === 0) {
      setSessionStats(null);
      return;
    }

    const powers = data.map(d => d.power).filter(p => p > 0);
    const cadences = data.map(d => d.cadence).filter(c => c > 0);
    const speeds = data.map(d => d.speed).filter(s => s > 0);
    const elapsed = data.length > 0 ? data[data.length - 1].time : 0;

    // Normalized Power: rolling 30s average, then ^4, mean, ^0.25
    let npCalcFinished: number;
    if (powers.length >= 30) {
      const windowSize = 30;
      const rollingAvgs: number[] = [];
      for (let i = windowSize - 1; i < powers.length; i++) {
        const window = powers.slice(i - windowSize + 1, i + 1);
        const avg = window.reduce((a, b) => a + b, 0) / windowSize;
        rollingAvgs.push(Math.pow(avg, 4));
      }
      npCalcFinished = Math.pow(rollingAvgs.reduce((a, b) => a + b, 0) / rollingAvgs.length, 0.25);
    } else {
      npCalcFinished = powers.length > 0 ? powers.reduce((a, b) => a + b, 0) / powers.length : 0;
    }

    // Total distance (integrate speed over time)
    let totalDistance = 0;
    for (let i = 1; i < data.length; i++) {
      const dt = (data[i].time - data[i - 1].time) / 3600; // hours
      totalDistance += data[i].speed * dt; // km
    }

    setSessionStats({
      avgPower: powers.length > 0 ? Math.round(powers.reduce((acc, curr) => acc + curr, 0) / powers.length) : 0,
      maxPower: powers.length > 0 ? Math.max(...powers) : 0,
      normalizedPower: Math.round(npCalcFinished),
      avgCadence: cadences.length > 0 ? Math.round(cadences.reduce((acc, curr) => acc + curr, 0) / cadences.length) : 0,
      maxCadence: cadences.length > 0 ? Math.max(...cadences) : 0,
      avgSpeed: speeds.length > 0 ? Math.round((speeds.reduce((acc, curr) => acc + curr, 0) / speeds.length) * 10) / 10 : 0,
      totalDistance: Math.round(totalDistance * 100) / 100,
      elapsedTime: elapsed,
    });
  }, []);

  const resetSession = useCallback(() => {
    sessionDataRef.current = [];
    setDataHistory([]);
    setSessionStats(null);
    setElapsedTime(0);
    setSessionStartTime(null);
    setIsSessionActive(false);
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (deviceRef.current?.gatt?.connected) {
        deviceRef.current.gatt.disconnect();
      }
    };
  }, []);

  return {
    // Connection
    status,
    deviceName,
    serviceType,
    error,
    connect,
    disconnect,

    // Data
    currentData,
    dataHistory,

    // Config
    config,
    setConfig,

    // Control
    setTargetPower,
    setTargetResistance,
    hasControl: true, // simplified for now

    // Session
    isSessionActive,
    elapsedTime,
    sessionStats,
    startSession,
    stopSession,
    resetSession,
  };
};
