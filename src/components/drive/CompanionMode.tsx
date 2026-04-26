import { useAppStore } from '@/store/useAppStore';
import { SaathiCharacter } from '@/components/SaathiCharacter';
import { Lock, Zap, MapPin, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const toBanglaNum = (n: string) => n.replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

export function CompanionMode() {
  const perclos = useAppStore((s) => s.perclosScore);
  const tripElapsed = useAppStore((s) => s.tripElapsedSeconds);
  const navigate = useNavigate();

  const statusText = perclos > 40 ? '🛑 বিশ্রাম নিন' : perclos > 20 ? '⚠️ সতর্ক থাকুন' : '✅ নিরাপদ';
  const statusColor = perclos > 40 ? 'text-coral' : perclos > 20 ? 'text-warning' : 'text-primary';

  return (
    <div className="min-h-full theme-warm bg-bg-warm">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-1.5 text-primary">
          <Lock size={14} />
          <span className="text-xs font-english">On-device</span>
        </div>
        <span className="font-mono text-sm text-[hsl(var(--color-text-dark))]">
          {toBanglaNum(formatTime(tripElapsed))}
        </span>
      </div>

      {/* Center character */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4">
        <SaathiCharacter size={160} />
      </div>

      {/* Status */}
      <div className="text-center px-4 pb-4">
        <p className={`font-bangla text-xl font-bold ${statusColor}`}>{statusText}</p>
      </div>

      {/* Bottom action buttons */}
      <div className="flex justify-around px-6 pb-4">
        <button className="flex flex-col items-center gap-1 min-w-[56px] min-h-[48px] text-muted-foreground">
          <Zap size={22} />
          <span className="font-bangla text-[11px]">ভুল সতর্কতা</span>
        </button>
        <button onClick={() => navigate('/rest-stops')} className="flex flex-col items-center gap-1 min-w-[56px] min-h-[48px] text-muted-foreground">
          <MapPin size={22} />
          <span className="font-bangla text-[11px]">বিশ্রামের জায়গা</span>
        </button>
        <button className="flex flex-col items-center gap-1 min-w-[56px] min-h-[48px] text-muted-foreground">
          <Info size={22} />
          <span className="font-bangla text-[11px]">কেন সতর্ক?</span>
        </button>
      </div>
    </div>
  );
}
