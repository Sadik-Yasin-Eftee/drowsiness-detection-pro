import { useAppStore } from '@/store/useAppStore';
import { BottomNav } from '@/components/BottomNav';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const store = useAppStore();

  const Toggle = ({ value, onChange, label_bn, label_en, warning }: { value: boolean; onChange: (v: boolean) => void; label_bn: string; label_en: string; warning?: string }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <p className="font-bangla text-base text-foreground">{label_bn}</p>
        <p className="font-english text-xs text-muted-foreground">{label_en}</p>
        {warning && <p className="font-bangla text-xs text-warning mt-1">⚠️ {warning}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-7 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-border'}`}
      >
        <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-foreground transition-transform ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-bangla text-xl font-bold text-foreground">
          {store.interfaceMode === 'companion' ? 'সাথীর পছন্দ' : 'সেটিংস'}
        </h1>
        <p className="font-english text-sm text-muted-foreground">Settings</p>
      </div>

      <div className="px-4 space-y-4">
        {/* Sensitivity */}
        <div className="bg-card rounded-xl p-4">
          <p className="font-bangla text-sm font-semibold text-foreground mb-3">সংবেদনশীলতা / Sensitivity</p>
          <div className="flex gap-2">
            {(['conservative', 'balanced', 'relaxed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => store.setSensitivity(s)}
                className={`flex-1 py-2.5 rounded-xl font-bangla text-sm font-medium transition-colors ${
                  store.sensitivity === s ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'
                }`}
              >
                {s === 'conservative' ? 'সতর্ক' : s === 'balanced' ? 'স্বাভাবিক' : 'শিথিল'}
              </button>
            ))}
          </div>
        </div>

        {/* Interface mode */}
        <div className="bg-card rounded-xl p-4">
          <p className="font-bangla text-sm font-semibold text-foreground mb-3">ইন্টারফেস মোড / Mode</p>
          <div className="flex gap-2">
            {(['companion', 'dashboard', 'hud'] as const).map((m) => (
              <button
                key={m}
                onClick={() => store.setInterfaceMode(m)}
                className={`flex-1 py-2.5 rounded-xl font-bangla text-sm font-medium transition-colors ${
                  store.interfaceMode === m ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'
                }`}
              >
                {m === 'companion' ? 'সাথী' : m === 'dashboard' ? 'ড্যাশবোর্ড' : 'HUD'}
              </button>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-primary" />
            <p className="font-bangla text-sm font-semibold text-foreground">গোপনীয়তা / Privacy</p>
          </div>
          <div className="bg-primary/10 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
            <Lock size={14} className="text-primary" />
            <span className="font-bangla text-xs text-primary">✅ সব তথ্য এই ডিভাইসে</span>
          </div>
          <Toggle value={store.deleteDataAfterTrip} onChange={store.setDeleteDataAfterTrip} label_bn="ট্রিপ শেষে ডেটা মুছুন" label_en="Delete data after trip" />
          <Toggle value={store.insuranceSharing} onChange={store.setInsuranceSharing} label_bn="বীমা কোম্পানিতে শেয়ার" label_en="Share with insurance" />
          <Toggle
            value={store.employerSharing}
            onChange={store.setEmployerSharing}
            label_bn="নিয়োগকর্তাকে শেয়ার"
            label_en="Share with employer"
            warning="এটি চালু করলে আপনার নিয়োগকর্তা আপনার ড্রাইভিং ডেটা দেখতে পারবে।"
          />
        </div>

        {/* Sound */}
        <div className="bg-card rounded-xl p-4">
          <Toggle value={store.soundAlerts} onChange={store.setSoundAlerts} label_bn="শব্দে সতর্ক করুন" label_en="Sound alerts" />
          <Toggle value={store.nightQuiet} onChange={store.setNightQuiet} label_bn="রাতে শান্ত মোড" label_en="Night quiet mode" />
        </div>

        {/* HUD-specific thresholds */}
        {store.interfaceMode === 'hud' && (
          <div className="bg-card rounded-xl p-4">
            <p className="font-bangla text-sm font-semibold text-foreground mb-3">থ্রেশহোল্ড / Thresholds</p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-english text-xs text-muted-foreground">PERCLOS Threshold</span>
                  <span className="font-mono text-xs text-foreground">{store.perclosThreshold}%</span>
                </div>
                <input
                  type="range" min={15} max={50} value={store.perclosThreshold}
                  onChange={(e) => store.setPerclosThreshold(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* About */}
        <div className="bg-card rounded-xl p-4 space-y-3">
          <p className="font-bangla text-sm font-semibold text-foreground">সম্পর্কে / About</p>
          <div className="bg-primary/10 rounded-lg p-3">
            <p className="font-english text-xs text-primary font-medium">Fitzpatrick Skin Tone Scale (I-VI) ✅</p>
            <p className="font-bangla text-xs text-muted-foreground mt-1">এই AI সকল ত্বকের রঙে সমানভাবে কাজ করে।</p>
          </div>
          <p className="font-english text-xs text-muted-foreground">Model: DrowsyCLIP — Vision Transformer + CLIP</p>
          <p className="font-bangla text-xs text-muted-foreground">বাংলাদেশী ড্রাইভারদের ডেটায় প্রশিক্ষিত</p>
          <p className="font-english text-xs text-muted-foreground">Version 1.0.0</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
