import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const toBn = (n: string) => n.replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

export default function Analytics() {
  const [pinInput, setPinInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const { analyticsPIN, weeklyData, interfaceMode } = useAppStore();
  const navigate = useNavigate();

  const handlePin = (digit: string) => {
    const next = pinInput + digit;
    setPinInput(next);
    if (next.length === 4) {
      if (next === analyticsPIN) setUnlocked(true);
      else setPinInput('');
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-full bg-background flex flex-col items-center justify-center px-6 py-8">
        <Lock size={40} className="text-primary mb-4" />
        <p className="font-bangla text-lg font-semibold text-foreground mb-2">সাপ্তাহিক রিপোর্ট দেখতে PIN দিন</p>
        <p className="font-english text-sm text-muted-foreground mb-6">Enter PIN to view weekly report</p>
        <div className="flex gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-mono ${
              i < pinInput.length ? 'border-primary bg-primary/10 text-foreground' : 'border-border'
            }`}>
              {i < pinInput.length ? '•' : ''}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-[240px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d) => (
            <button
              key={d}
              onClick={() => d === '⌫' ? setPinInput(pinInput.slice(0, -1)) : d && handlePin(d)}
              className={`w-16 h-14 rounded-xl font-mono text-xl font-semibold active:scale-95 transition-transform ${
                d ? 'bg-card text-foreground' : ''
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const chartData = weeklyData.dailyEvents.map((d) => ({ name: d.day_bn, count: d.count }));
  const smileys = '😊'.repeat(weeklyData.weekScore);

  return (
    <div className="min-h-full bg-background pb-4">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="min-w-[48px] min-h-[48px] flex items-center justify-center">
          <ArrowLeft size={22} className="text-foreground" />
        </button>
        <h1 className="font-bangla text-lg font-bold text-foreground">সাপ্তাহিক রিপোর্ট</h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Score */}
        <div className="bg-card rounded-xl p-4 text-center">
          <p className="text-3xl mb-1">{smileys}</p>
          <p className="font-bangla text-base text-foreground">এই সপ্তাহের স্কোর: {toBn(String(weeklyData.weekScore))}/৫</p>
        </div>

        {/* Chart */}
        <div className="bg-card rounded-xl p-4">
          <p className="font-bangla text-sm font-semibold text-foreground mb-3">দিন অনুযায়ী ঘটনা</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(215,25%,63%)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(174,84%,32%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Peak risk */}
        <div className="bg-card rounded-xl p-4">
          <p className="font-bangla text-sm font-semibold text-foreground mb-2">সবচেয়ে ঝুঁকিপূর্ণ সময়</p>
          {weeklyData.peakRiskTimes.map((t, i) => (
            <p key={i} className="font-bangla text-sm text-warning">⚠️ {t}</p>
          ))}
        </div>

        {/* Tip */}
        <div className="bg-primary/10 rounded-xl p-4 border border-primary/30">
          <p className="font-bangla text-sm font-semibold text-primary mb-1">💡 পরামর্শ</p>
          <p className="font-bangla text-sm text-foreground">{weeklyData.tip_bn}</p>
          <p className="font-english text-xs text-muted-foreground mt-1">{weeklyData.tip_en}</p>
        </div>

        {/* HUD extra: heatmap */}
        {interfaceMode === 'hud' && (
          <div className="bg-card rounded-xl p-4">
            <p className="font-english text-sm font-semibold text-foreground mb-2">Drowsiness Heatmap (7d × 24h)</p>
            <div className="space-y-1">
              {weeklyData.heatmap.map((row, d) => (
                <div key={d} className="flex gap-[2px]">
                  <span className="font-english text-[8px] text-muted-foreground w-6">{weeklyData.dailyEvents[d].day}</span>
                  {row.map((val, h) => (
                    <div
                      key={h}
                      className="flex-1 h-3 rounded-[2px]"
                      style={{
                        backgroundColor: val === 0 ? 'hsl(217,33%,20%)' : val === 1 ? 'hsl(38,92%,50%)' : 'hsl(0,84%,60%)',
                        opacity: val === 0 ? 0.3 : 0.8,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl p-3">
            <p className="font-bangla text-xs text-muted-foreground">মোট ঘটনা</p>
            <p className="font-mono text-lg font-bold text-foreground">{toBn(String(weeklyData.totalEvents))}</p>
          </div>
          <div className="bg-card rounded-xl p-3">
            <p className="font-bangla text-xs text-muted-foreground">গড় PERCLOS</p>
            <p className="font-mono text-lg font-bold text-foreground">{toBn(String(weeklyData.averagePerclos))}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
