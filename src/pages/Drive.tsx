import { useAppStore } from '@/store/useAppStore';
import { useDrowsinessSimulation } from '@/hooks/useDrowsinessSimulation';
import { BottomNav } from '@/components/BottomNav';
import { CompanionMode } from '@/components/drive/CompanionMode';
import { DashboardMode } from '@/components/drive/DashboardMode';
import { HUDMode } from '@/components/drive/HUDMode';
import { AlertOverlay } from '@/components/AlertOverlay';

export default function Drive() {
  const mode = useAppStore((s) => s.interfaceMode);
  const showAlert = useAppStore((s) => s.showAlert);

  useDrowsinessSimulation();

  return (
    <div className="min-h-screen pb-16">
      {mode === 'companion' && <CompanionMode />}
      {mode === 'dashboard' && <DashboardMode />}
      {mode === 'hud' && <HUDMode />}
      {showAlert && <AlertOverlay />}
      <BottomNav />
    </div>
  );
}
