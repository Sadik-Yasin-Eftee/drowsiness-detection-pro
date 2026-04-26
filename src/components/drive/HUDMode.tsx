import { useAppStore } from '@/store/useAppStore';

const toBn = (n: string) => n.replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);
function formatTime(s: number) {
  return `${Math.floor(s/3600)}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function Gauge({ label, value, min, max }: { label: string; value: number; min: number; max: number }) {
  const norm = (value - min) / (max - min);
  const angle = -90 + norm * 180;
  const color = Math.abs(value) > (max * 0.7) ? 'hsl(0,84%,60%)' : Math.abs(value) > (max * 0.4) ? 'hsl(38,92%,50%)' : 'hsl(174,84%,32%)';
  return (
    <div className="flex flex-col items-center">
      <svg width="56" height="32" viewBox="0 0 56 32">
        <path d="M 4 28 A 24 24 0 0 1 52 28" fill="none" stroke="hsl(217,33%,25%)" strokeWidth="3" />
        <line x1="28" y1="28" x2={28 + Math.cos((angle * Math.PI) / 180) * 20} y2={28 + Math.sin((angle * Math.PI) / 180) * 20} stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-mono text-[10px] text-muted-foreground">{label}: {toBn(String(Math.round(value)))}°</span>
    </div>
  );
}

export function HUDMode() {
  const { perclosScore, aiConfidence, currentAlertLevel, eyeStateTimeline, headPose, eyeAspectRatio, blinkRate, tripElapsedSeconds, drowsinessEvents, perclosThreshold, sensitivity } = useAppStore();

  const perclosColor = perclosScore > 40 ? 'text-danger' : perclosScore > 20 ? 'text-warning' : 'text-primary';

  return (
    <div className="flex-1 flex flex-col bg-bg-dark px-3 pt-10 pb-4 min-h-full">
      {/* Primary metrics */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className={`font-mono text-5xl font-bold ${perclosColor}`}>{toBn(String(perclosScore))}%</p>
          <p className="font-english text-xs text-muted-foreground">PERCLOS</p>
        </div>
        <div className="text-right space-y-1">
          <div className="bg-primary/20 px-2 py-1 rounded">
            <p className="font-english text-xs text-primary">AI Confidence: {toBn(String(Math.round(aiConfidence)))}%</p>
          </div>
          <div className={`px-2 py-1 rounded ${currentAlertLevel >= 3 ? 'bg-danger/20' : currentAlertLevel >= 2 ? 'bg-warning/20' : 'bg-primary/20'}`}>
            <p className="font-english text-xs text-foreground">Level {toBn(String(currentAlertLevel))}</p>
          </div>
        </div>
      </div>

      {/* Eye state timeline */}
      <div className="mb-4">
        <p className="font-english text-xs text-muted-foreground mb-1">Eye State Timeline (30s)</p>
        <div className="flex gap-[2px] h-6 items-end overflow-hidden rounded bg-card p-1">
          {eyeStateTimeline.slice(-30).map((entry, i) => (
            <div
              key={i}
              className={`flex-1 min-w-[4px] rounded-sm ${
                entry.state === 'open' ? 'bg-primary h-full' : entry.state === 'closing' ? 'bg-warning h-3/4' : 'bg-danger h-1/2'
              }`}
            />
          ))}
          {eyeStateTimeline.length < 30 && Array.from({ length: 30 - eyeStateTimeline.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex-1 min-w-[4px] rounded-sm bg-border h-full opacity-30" />
          ))}
        </div>
      </div>

      {/* Head pose gauges */}
      <div className="flex justify-around mb-4 bg-card rounded-xl p-3">
        <Gauge label="Pitch" value={headPose.pitch} min={-30} max={30} />
        <Gauge label="Yaw" value={headPose.yaw} min={-45} max={45} />
        <Gauge label="Roll" value={headPose.roll} min={-20} max={20} />
      </div>

      {/* Bottom metrics bar */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-card rounded-lg p-2">
          <p className="font-english text-[10px] text-muted-foreground">Trip</p>
          <p className="font-mono text-sm text-foreground">{toBn(formatTime(tripElapsedSeconds))}</p>
        </div>
        <div className="bg-card rounded-lg p-2">
          <p className="font-english text-[10px] text-muted-foreground">EAR / Blink</p>
          <p className="font-mono text-sm text-foreground">{toBn(String(eyeAspectRatio))} / {toBn(String(Math.round(blinkRate)))}</p>
        </div>
        <div className="bg-card rounded-lg p-2">
          <p className="font-english text-[10px] text-muted-foreground">Events</p>
          <p className="font-mono text-sm text-foreground">{toBn(String(drowsinessEvents.length))}</p>
        </div>
      </div>

      <div className="mt-2 text-center">
        <span className="font-english text-[10px] text-muted-foreground">
          Sensitivity: {sensitivity} | Threshold: {toBn(String(perclosThreshold))}%
        </span>
      </div>
    </div>
  );
}
