import { Encoder, Profile } from '@garmin/fitsdk';
import type { TrainerDataPoint, SessionStats } from '../hooks/useBluetoothTrainer';

export const exportToFit = (dataPoints: TrainerDataPoint[], stats: SessionStats) => {
  const encoder = new Encoder();

  // Write File ID message
  encoder.writeMesg({
    mesgNum: Profile.MesgNum.FILE_ID,
    type: 4, // 4 = Activity (from Profile.types.file)
    manufacturer: 1, // 1 = Garmin (from Profile.types.manufacturer)
    product: 0 as unknown as number,
    serialNumber: 123456789,
    timeCreated: new Date() as unknown as number
  } as unknown as import('@garmin/fitsdk').Encodable<import('@garmin/fitsdk').Mesg>);

  const startTime = new Date();

  // Write Record messages for each data point
  dataPoints.forEach((dp) => {
    // Record message is 20
    const recordTime = new Date(startTime.getTime() + dp.time * 1000);
    const recordMesg: Record<string, unknown> = {
      mesgNum: Profile.MesgNum.RECORD,
      timestamp: recordTime as unknown as number,
    };

    if (dp.power > 0) recordMesg.power = dp.power as unknown as number;
    if (dp.cadence > 0) recordMesg.cadence = dp.cadence as unknown as number;

    // Speed in FIT is typically m/s
    if (dp.speed > 0) recordMesg.speed = ((dp.speed * 1000) / 3600) as unknown as number;

    encoder.writeMesg(recordMesg as unknown as import('@garmin/fitsdk').Encodable<import('@garmin/fitsdk').Mesg>);
  });

  // Optional: write a Session message at the end
  encoder.writeMesg({
    mesgNum: Profile.MesgNum.SESSION,
    timestamp: new Date(startTime.getTime() + stats.elapsedTime * 1000) as unknown as number,
    startTime: startTime,
    totalElapsedTime: stats.elapsedTime,
    totalTimerTime: stats.elapsedTime,
    totalDistance: stats.totalDistance * 1000, // m
    avgSpeed: (stats.avgSpeed * 1000) / 3600,
    avgPower: stats.avgPower,
    maxPower: stats.maxPower,
    normalizedPower: stats.normalizedPower,
    avgCadence: stats.avgCadence,
    maxCadence: stats.maxCadence,
    sport: 2, // 2 = Cycling (from Profile.types.sport)
    subSport: 6 // 6 = Indoor Cycling (from Profile.types.subSport)
  } as unknown as import('@garmin/fitsdk').Encodable<import('@garmin/fitsdk').Mesg>);

  // Build the file and trigger download
  const uint8Array = encoder.close();

  const blob = new Blob([uint8Array as unknown as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `cycler_session_${new Date().toISOString().replace(/[:.]/g, '-')}.fit`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
