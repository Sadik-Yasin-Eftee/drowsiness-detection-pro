import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Shield, Eye } from 'lucide-react';

const steps = [
  {
    title_bn: 'আমি সাথী। আপনার গাড়িতে আপনার পাশে থাকব।',
    title_en: "I'm Saathi, your driving companion.",
  },
  {
    title_bn: 'আমি শুধু আপনার ফোনে কাজ করি। আপনার ছবি কোথাও যায় না।',
    title_en: '100% on-device processing. No images leave your phone.',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const store = useAppStore();

  const finish = () => {
    store.setOnboardingComplete();
    navigate('/drive', { replace: true });
  };

  return (
    <div className="min-h-screen bg-bg-dark flex flex-col">
      <AnimatePresence mode="wait">
        {step < 2 ? (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col items-center justify-center px-8 gap-8"
          >
            {step === 0 && (
              <>
                <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
                  <Eye size={64} className="text-primary animate-idle-blink" />
                </div>
                <div className="text-center space-y-3">
                  <p className="font-bangla text-xl font-semibold text-foreground">{steps[0].title_bn}</p>
                  <p className="font-english text-sm text-muted-foreground">{steps[0].title_en}</p>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
                  <Lock size={48} className="text-primary" />
                </div>
                <div className="text-center space-y-3">
                  <p className="font-bangla text-xl font-semibold text-foreground">{steps[1].title_bn}</p>
                  <p className="font-english text-sm text-muted-foreground">{steps[1].title_en}</p>
                </div>
                <div className="flex gap-3">
                  <span className="bg-primary/20 text-primary px-3 py-1.5 rounded-lg font-bangla text-sm">কোনো ক্লাউড নেই</span>
                  <span className="bg-primary/20 text-primary px-3 py-1.5 rounded-lg font-bangla text-sm">কোনো ট্র্যাকিং নেই</span>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 overflow-y-auto px-6 py-8"
          >
            <h2 className="font-bangla text-xl font-bold text-foreground mb-6 text-center">আপনার অভিজ্ঞতা বেছে নিন</h2>

            <p className="font-bangla text-base font-semibold text-foreground mb-3">সংবেদনশীলতা</p>
            <div className="grid gap-3 mb-6">
              {([
                { val: 'conservative' as const, emoji: '🛡️', bn: 'বেশি সতর্ক', en: 'Extra Careful', desc: 'ছোট লক্ষণেও সতর্ক করব' },
                { val: 'balanced' as const, emoji: '⚖️', bn: 'স্বাভাবিক', en: 'Balanced', desc: 'সুষম পর্যবেক্ষণ' },
                { val: 'relaxed' as const, emoji: '🎯', bn: 'একটু সতর্ক', en: 'Relaxed', desc: 'শুধু স্পষ্ট লক্ষণে' },
              ]).map((item) => (
                <button
                  key={item.val}
                  onClick={() => store.setSensitivity(item.val)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${
                    store.sensitivity === item.val ? 'border-primary bg-primary/10' : 'border-border bg-card'
                  }`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <div>
                    <p className="font-bangla font-semibold text-foreground">{item.bn} <span className="font-english text-sm text-muted-foreground">/ {item.en}</span></p>
                    <p className="font-bangla text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <p className="font-bangla text-base font-semibold text-foreground mb-3">ইন্টারফেস মোড</p>
            <div className="grid gap-3 mb-8">
              {([
                { val: 'companion' as const, emoji: '😊', bn: 'সাথী মোড', en: 'Companion', desc: 'বন্ধুর মতো' },
                { val: 'dashboard' as const, emoji: '📊', bn: 'ড্যাশবোর্ড মোড', en: 'Dashboard', desc: 'পরিষ্কার তথ্য' },
                { val: 'hud' as const, emoji: '🖥️', bn: 'HUD মোড', en: 'Technical', desc: 'বিস্তারিত ডেটা' },
              ]).map((item) => (
                <button
                  key={item.val}
                  onClick={() => store.setInterfaceMode(item.val)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${
                    store.interfaceMode === item.val ? 'border-primary bg-primary/10' : 'border-border bg-card'
                  }`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <div>
                    <p className="font-bangla font-semibold text-foreground">{item.bn} <span className="font-english text-sm text-muted-foreground">/ {item.en}</span></p>
                    <p className="font-bangla text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dots + Button */}
      <div className="px-6 pb-8 space-y-4">
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
        <button
          onClick={() => (step < 2 ? setStep(step + 1) : finish())}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bangla text-lg font-semibold active:scale-95 transition-transform"
        >
          {step < 2 ? 'পরবর্তী' : 'শুরু করুন'}
        </button>
      </div>
    </div>
  );
}
