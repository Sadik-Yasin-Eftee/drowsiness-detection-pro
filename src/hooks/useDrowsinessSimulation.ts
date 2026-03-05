import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

const reasons = [
  { bn: 'আপনার চোখ বন্ধ হয়ে যাচ্ছিল।', en: 'Eyes closing detected.' },
  { bn: 'আপনার মাথা নিচু হয়ে যাচ্ছে!', en: 'Head dropping detected.' },
  { bn: 'আপনার চোখ ভারী হয়ে যাচ্ছে।', en: 'Eyes getting heavy.' },
  { bn: 'ব্লিংক রেট কমে গেছে।', en: 'Blink rate decreased.' },
];

export function useDrowsinessSimulation() {
  const store = useAppStore();
  const tickRef = useRef(0);
  const nextEventRef = useRef(45 + Math.random() * 45);

  useEffect(() => {
    if (!store.tripActive) {
      store.startTrip();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      store.incrementTripTime();

      // Simulate PERCLOS with gradual rise and resets
      const cycle = tickRef.current % 90;
      let newPerclos: number;
      if (cycle < 60) {
        newPerclos = 5 + (cycle / 60) * 45 + (Math.random() - 0.5) * 6;
      } else {
        newPerclos = 50 - ((cycle - 60) / 30) * 40 + (Math.random() - 0.5) * 4;
      }
      newPerclos = Math.max(2, Math.min(85, newPerclos));

      const newBlinkRate = newPerclos > 35 ? 6 + Math.random() * 4 : 14 + Math.random() * 6;
      const newEAR = newPerclos > 35 ? 0.15 + Math.random() * 0.1 : 0.28 + Math.random() * 0.08;
      const eyeState: 'open' | 'closing' | 'closed' = newPerclos > 50 ? 'closed' : newPerclos > 30 ? 'closing' : 'open';
      const alertLevel: 0 | 1 | 2 | 3 = newPerclos > 55 ? 3 : newPerclos > 40 ? 2 : newPerclos > 25 ? 1 : 0;

      const headPose = {
        pitch: (Math.random() - 0.5) * (newPerclos > 30 ? 30 : 10),
        yaw: (Math.random() - 0.5) * (newPerclos > 30 ? 20 : 8),
        roll: (Math.random() - 0.5) * (newPerclos > 30 ? 15 : 5),
      };

      const blinkDeviation = Math.abs(newBlinkRate - 17) / 17;
      const headInstability = (Math.abs(headPose.pitch) + Math.abs(headPose.yaw) + Math.abs(headPose.roll)) / 90;
      const timeWeight = Math.min(store.tripElapsedSeconds / 7200, 1);
      const fatigueScore = Math.round(
        (newPerclos / 100) * 40 + blinkDeviation * 20 + headInstability * 20 + timeWeight * 20
      );

      const newTimeline = [
        ...store.eyeStateTimeline.slice(-29),
        { timestamp: Date.now(), state: eyeState },
      ];

      store.updateDetection({
        perclosScore: Math.round(newPerclos),
        blinkRate: Math.round(newBlinkRate),
        eyeAspectRatio: parseFloat(newEAR.toFixed(2)),
        eyeState,
        currentAlertLevel: alertLevel,
        headPose,
        aiConfidence: 85 + Math.random() * 13,
        eyeStateTimeline: newTimeline,
        fatigueScore: Math.min(100, Math.max(0, fatigueScore)),
      });

      // Trigger alert event
      if (tickRef.current >= nextEventRef.current && !store.showAlert) {
        const reason = reasons[Math.floor(Math.random() * reasons.length)];
        const eventAlertLevel = (Math.random() > 0.5 ? 2 : Math.random() > 0.3 ? 1 : 3) as 1 | 2 | 3;
        const event = {
          id: `evt-${Date.now()}`,
          timestamp: Date.now(),
          perclosAtTrigger: Math.round(newPerclos),
          eyeClosureDuration: 1.5 + Math.random() * 2,
          confidence: 85 + Math.random() * 13,
          alertLevel: eventAlertLevel,
          reason_bn: reason.bn,
          reason_en: reason.en,
          dismissed: false,
          flaggedFalseAlarm: false,
        };
        store.addDrowsinessEvent(event);
        store.setShowAlert(true, event);
        nextEventRef.current = tickRef.current + 45 + Math.random() * 45;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [store.tripActive]);
}
