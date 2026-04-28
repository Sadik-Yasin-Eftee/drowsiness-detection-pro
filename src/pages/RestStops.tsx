import { ArrowLeft, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const stops = [
  { name_bn: 'ঢাকা-চট্টগ্রাম রেস্ট এরিয়া', dist: '৩.৫ কিমি', time: '~৫ মিনিট', amenities: ['🚻', '🍽️', '⛽', '🅿️'] },
  { name_bn: 'কুমিল্লা সার্ভিস স্টেশন', dist: '৮.২ কিমি', time: '~১২ মিনিট', amenities: ['🚻', '🍽️', '🅿️'] },
  { name_bn: 'ফেনী হাইওয়ে রেস্ট পয়েন্ট', dist: '১৫.০ কিমি', time: '~২০ মিনিট', amenities: ['🚻', '⛽'] },
];

export default function RestStops() {
  const navigate = useNavigate();
  const [selectedStop, setSelectedStop] = useState<string | null>(null);

  return (
    <div className="min-h-full bg-background pb-4">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="min-w-[48px] min-h-[48px] flex items-center justify-center">
          <ArrowLeft size={22} className="text-foreground" />
        </button>
        <h1 className="font-bangla text-lg font-bold text-foreground">কাছের বিশ্রামের জায়গা</h1>
      </div>

      {/* Simulated map */}
      <div className="mx-4 h-48 bg-card rounded-xl relative overflow-hidden mb-4 border border-border">
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 300 150" className="w-full h-full opacity-30">
            <path d="M 0 75 Q 75 30 150 75 T 300 75" stroke="hsl(var(--color-primary))" fill="none" strokeWidth="3" strokeDasharray="8 4" />
            <path d="M 0 100 Q 100 60 200 100 T 300 90" stroke="hsl(var(--muted-foreground))" fill="none" strokeWidth="1.5" />
          </svg>
        </div>
        {stops.map((_, i) => (
          <div key={i} className="absolute" style={{ left: `${20 + i * 30}%`, top: `${30 + i * 15}%` }}>
            <div className="w-7 h-7 bg-coral rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold shadow-lg">{i + 1}</div>
          </div>
        ))}
        <div className="absolute bottom-2 left-2 bg-primary/20 px-2 py-1 rounded text-xs font-bangla text-primary">📍 আপনার অবস্থান</div>
      </div>

      {/* Cards */}
      <div className="px-4 space-y-3">
        {stops.map((stop, i) => (
          <div key={i} className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bangla text-base font-semibold text-foreground">{stop.name_bn}</p>
                <p className="font-bangla text-sm text-muted-foreground">{stop.dist} • {stop.time}</p>
              </div>
              <MapPin size={18} className="text-coral mt-1" />
            </div>
            <div className="flex gap-2 mb-3">
              {stop.amenities.map((a, j) => (
                <span key={j} className="text-lg">{a}</span>
              ))}
            </div>
            <button
              onClick={() => setSelectedStop(stop.name_bn)}
              className="w-full py-3 rounded-xl bg-coral text-primary-foreground font-bangla font-semibold active:scale-95 transition-transform"
            >
              {selectedStop === stop.name_bn ? 'নেভিগেশন শুরু করছি...' : 'এখানে থামুন'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
