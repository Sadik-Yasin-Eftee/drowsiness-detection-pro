import { useAppStore } from '@/store/useAppStore';
import { Lock, Zap, MapPin, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const toBanglaNum = (n: string) => n.replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);
function formatTime(s: number) {
  return `${Math.floor(s/3600)}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

export function DashboardMode() {
  const { perclosScore, blinkRate, eyeState, currentAlertLevel, aiConfidence, tripElapsedSeconds, drowsinessEvents } = useAppStore();
  const navigate = useNavigate();

  const ringColor = currentAlertLevel >= 3 ? 'hsl(0,84%,60%)' : currentAlertLevel >= 2 ? 'hsl(38,92%,50%)' : 'hsl(174,84%,32%)';
  const statusText = currentAlertLevel >= 3 ? 'বিপদ!' : currentAlertLevel >= 2 ? 'সতর্কতা!' : 'পর্যবেক্ষণ করছি';
  const pulseClass = currentAlertLevel >= 3 ? 'animate-critical-shake' : currentAlertLevel >= 2 ? 'animate-worried-pulse' : 'animate-breathing';

  return (
    <div className="flex-1 flex flex-col bg-bg-dark px-4 pt-10 pb-4 min-h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1.5 bg-primary/20 px-2.5 py-1 rounded-lg">
          <Lock size={12} className="text-primary" />
          <span className="text-xs font-bangla text-primary">সব তথ্য আপনার ডিভাইসে</span>
        </div>
        <span className="font-mono text-sm text-muted-foreground">{toBanglaNum(formatTime(tripElapsedSeconds))}</span>
      </div>

      {/* Status ring */}
      <div className="flex justify-center mb-8">
        <motion.div
          className={`relative w-48 h-48 rounded-full flex items-center justify-center ${pulseClass}`}
          style={{ boxShadow: `0 0 40px ${ringColor}40, inset 0 0 40px ${ringColor}20`, border: `3px solid ${ringColor}` }}
        >
          <div className="text-center">
            <p className="font-mono text-4xl font-bold text-foreground">{toBanglaNum(String(perclosScore))}%</p>
            <p className="font-bangla text-base font-semibold mt-1" style={{ color: ringColor }}>{statusText}</p>
            <p className="font-english text-xs text-muted-foreground mt-1">AI: {toBanglaNum(Math.round(aiConfidence) + '%')}</p>
          </div>
        </motion.div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'ব্লিংক রেট', value: `${toBanglaNum(String(Math.round(blinkRate)))}/মিনিট` },
          { label: 'চোখ', value: eyeState === 'open' ? 'খোলা ✓' : eyeState === 'closing' ? 'বন্ধ হচ্ছে ⚠' : 'বন্ধ ✗' },
          { label: 'PERCLOS', value: `${toBanglaNum(String(perclosScore))}%` },
          { label: 'সতর্কতা', value: toBanglaNum(String(drowsinessEvents.length)) },
        ].map((stat, i) => (
          <div key={i} className="bg-card rounded-xl p-3">
            <p className="font-bangla text-xs text-muted-foreground">{stat.label}</p>
            <p className="font-bangla text-base font-semibold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="flex justify-around">
        <button className="flex flex-col items-center gap-1 min-h-[48px] text-muted-foreground"><Zap size={22} /><span className="font-bangla text-[11px]">ভুল সতর্কতা</span></button>
        <button onClick={() => navigate('/rest-stops')} className="flex flex-col items-center gap-1 min-h-[48px] text-muted-foreground"><MapPin size={22} /><span className="font-bangla text-[11px]">বিশ্রামের জায়গা</span></button>
        <button className="flex flex-col items-center gap-1 min-h-[48px] text-muted-foreground"><Info size={22} /><span className="font-bangla text-[11px]">কেন সতর্ক?</span></button>
      </div>
    </div>
  );
}
