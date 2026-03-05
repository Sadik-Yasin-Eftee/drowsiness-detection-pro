import { useAppStore } from '@/store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export function AlertOverlay() {
  const { currentAlert, interfaceMode, dismissAlert, flagFalseAlarm } = useAppStore();
  const navigate = useNavigate();

  if (!currentAlert) return null;

  const goRest = () => {
    dismissAlert();
    navigate('/rest-stops');
  };

  if (interfaceMode === 'companion') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-bg-warm/95 flex flex-col items-center justify-center px-6"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: [0.8, 1.3, 1] }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="w-24 h-24 rounded-full bg-coral/20 flex items-center justify-center mb-6"
        >
          <span className="text-5xl">👁️</span>
        </motion.div>
        <p className="font-bangla text-xl font-bold text-center mb-2 text-[hsl(var(--color-text-dark))]">{currentAlert.reason_bn}</p>
        <p className="font-english text-sm text-center text-muted-foreground mb-8">{currentAlert.reason_en}</p>
        <div className="w-full space-y-3 max-w-xs">
          <button onClick={dismissAlert} className="w-full py-4 rounded-xl border-2 border-border font-bangla text-base font-semibold text-foreground active:scale-95 transition-transform">
            ঠিক আছি, ধন্যবাদ
          </button>
          <button onClick={goRest} className="w-full py-4 rounded-xl bg-coral text-primary-foreground font-bangla text-base font-semibold active:scale-95 transition-transform">
            বিশ্রাম দরকার
          </button>
        </div>
        <button onClick={flagFalseAlarm} className="mt-4 font-bangla text-sm text-muted-foreground underline">ভুল সতর্কতা হিসেবে চিহ্নিত করুন</button>
      </motion.div>
    );
  }

  if (interfaceMode === 'dashboard') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-background/80 flex items-end justify-center"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-md bg-card rounded-t-2xl p-6 border-t-4 border-coral"
        >
          <p className="font-bangla text-xl font-bold text-foreground mb-1">{currentAlert.reason_bn}</p>
          <p className="font-english text-sm text-muted-foreground mb-3">{currentAlert.reason_en} — PERCLOS {currentAlert.perclosAtTrigger}%</p>
          <div className="flex items-center gap-2 mb-4">
            <span className="font-bangla text-sm text-muted-foreground">নিশ্চিততা:</span>
            <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${currentAlert.confidence}%` }} />
            </div>
            <span className="font-mono text-sm text-foreground">{Math.round(currentAlert.confidence)}%</span>
          </div>
          <div className="flex gap-3">
            <button onClick={dismissAlert} className="flex-1 py-3 rounded-xl border border-border font-bangla font-semibold text-foreground active:scale-95 transition-transform">ঠিক আছি</button>
            <button onClick={goRest} className="flex-1 py-3 rounded-xl bg-coral text-primary-foreground font-bangla font-semibold active:scale-95 transition-transform">বিশ্রাম নিন</button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // HUD mode
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <motion.div
        animate={{ opacity: [0, 0.1, 0, 0.1, 0] }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 bg-danger"
      />
      <div className="bg-card border border-danger/50 rounded-xl p-5 mx-4 w-full max-w-sm z-10">
        <p className="font-english text-lg font-bold text-danger mb-3 text-center">DROWSINESS DETECTED</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-background rounded p-2"><p className="font-mono text-xs text-muted-foreground">PERCLOS</p><p className="font-mono text-sm text-foreground">{currentAlert.perclosAtTrigger}%</p></div>
          <div className="bg-background rounded p-2"><p className="font-mono text-xs text-muted-foreground">Eye closure</p><p className="font-mono text-sm text-foreground">{currentAlert.eyeClosureDuration.toFixed(1)}s</p></div>
          <div className="bg-background rounded p-2"><p className="font-mono text-xs text-muted-foreground">Confidence</p><p className="font-mono text-sm text-foreground">{Math.round(currentAlert.confidence)}%</p></div>
          <div className="bg-background rounded p-2"><p className="font-mono text-xs text-muted-foreground">Alert Level</p><p className="font-mono text-sm text-foreground">{currentAlert.alertLevel}</p></div>
        </div>
        <p className="font-bangla text-sm text-center text-muted-foreground mb-4">{currentAlert.reason_bn}</p>
        <div className="flex gap-2">
          <button onClick={dismissAlert} className="flex-1 py-2.5 rounded-lg border border-border font-english text-sm text-foreground active:scale-95 transition-transform">DISMISS</button>
          <button onClick={flagFalseAlarm} className="flex-1 py-2.5 rounded-lg border border-warning font-english text-sm text-warning active:scale-95 transition-transform">FALSE ALARM</button>
          <button onClick={goRest} className="flex-1 py-2.5 rounded-lg bg-coral font-english text-sm text-primary-foreground active:scale-95 transition-transform">REST</button>
        </div>
      </div>
    </motion.div>
  );
}
