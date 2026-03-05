import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';

const messages = {
  alert: [
    'আপনি ভালো করছেন! নিরাপদে চলুন।',
    'সব ঠিক আছে, মনোযোগ রাখুন।',
    'চমৎকার! চালিয়ে যান।',
  ],
  watching: [
    'একটু সতর্ক থাকুন।',
    'একটু জানালা খুলুন।',
  ],
  worried: [
    'ভাই, একটু বিশ্রাম নেবেন?',
    'আপনি ক্লান্ত মনে হচ্ছে।',
  ],
};

export function SaathiCharacter({ size = 150 }: { size?: number }) {
  const perclos = useAppStore((s) => s.perclosScore);
  const tripSeconds = useAppStore((s) => s.tripElapsedSeconds);

  const state = perclos > 60 ? 'critical' : perclos > 40 ? 'worried' : perclos > 20 ? 'watching' : 'alert';

  const irisColor = state === 'critical' ? 'hsl(0, 84%, 60%)' :
    state === 'worried' ? 'hsl(18, 82%, 50%)' :
    state === 'watching' ? 'hsl(38, 92%, 50%)' :
    'hsl(174, 84%, 32%)';

  const lidDroop = state === 'critical' ? 0.65 : state === 'worried' ? 0.4 : state === 'watching' ? 0.15 : 0;

  const msgPool = state === 'critical' ? messages.worried : messages[state] || messages.alert;
  const msgIndex = Math.floor(tripSeconds / 30) % msgPool.length;
  const currentMessage = msgPool[msgIndex];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Speech bubble */}
      <motion.div
        key={currentMessage}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card px-5 py-3 rounded-xl shadow-lg max-w-[280px] text-center relative"
      >
        <p className="font-bangla text-base font-medium text-foreground">{currentMessage}</p>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card rotate-45" />
      </motion.div>

      {/* Eye character */}
      <motion.div
        animate={
          state === 'critical'
            ? { x: [0, -3, 3, -3, 3, 0] }
            : state === 'watching'
            ? { x: [0, 4, 0, -4, 0] }
            : {}
        }
        transition={
          state === 'critical'
            ? { duration: 0.5, repeat: Infinity }
            : { duration: 3, repeat: Infinity }
        }
        className={`relative ${state === 'worried' ? 'animate-worried-pulse' : ''}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 100 100" width={size} height={size}>
          {/* Outer glow */}
          <circle cx="50" cy="50" r="48" fill="none" stroke={irisColor} strokeWidth="2" opacity="0.3" />
          {/* Eye white */}
          <ellipse cx="50" cy="50" rx="40" ry="32" fill="hsl(210, 40%, 98%)" stroke={irisColor} strokeWidth="2.5" />
          {/* Iris */}
          <circle cx="50" cy="52" r="16" fill={irisColor} />
          {/* Pupil */}
          <circle cx="50" cy="52" r="7" fill="hsl(222, 47%, 11%)" />
          {/* Pupil highlight */}
          <circle cx="45" cy="48" r="3" fill="hsl(210, 40%, 98%)" opacity="0.8" />
          {/* Upper eyelid (droop) */}
          <motion.rect
            x="8" y="10"
            width="84" height="42"
            rx="40"
            fill="hsl(var(--background))"
            animate={{ y: 10 + lidDroop * 30 }}
            transition={{ duration: 0.5 }}
          />
          {/* Eyelid line */}
          <motion.path
            d={`M 10 ${50 - 32 + lidDroop * 30} Q 50 ${50 - 32 - 10 + lidDroop * 40} 90 ${50 - 32 + lidDroop * 30}`}
            fill="none"
            stroke={irisColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>
    </div>
  );
}
