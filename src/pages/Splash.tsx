import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';

export default function Splash() {
  const navigate = useNavigate();
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(onboardingComplete ? '/drive' : '/onboarding', { replace: true });
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-dark">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
          <Eye size={40} className="text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-primary-foreground font-english">DrowsyGuard</h1>
        <p className="font-bangla text-lg text-muted-foreground">আপনার নিরাপত্তা, আমাদের অঙ্গীকার</p>
        <p className="font-english text-sm text-muted-foreground">Your safety, our commitment</p>
      </motion.div>
    </div>
  );
}
