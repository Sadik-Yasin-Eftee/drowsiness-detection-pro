import { create } from 'zustand';

export interface DrowsinessEvent {
  id: string;
  timestamp: number;
  perclosAtTrigger: number;
  eyeClosureDuration: number;
  confidence: number;
  alertLevel: 1 | 2 | 3;
  reason_bn: string;
  reason_en: string;
  dismissed: boolean;
  flaggedFalseAlarm: boolean;
}

export interface WeeklyDrowsinessData {
  dailyEvents: { day: string; day_bn: string; count: number }[];
  heatmap: number[][];
  peakRiskTimes: string[];
  totalEvents: number;
  averagePerclos: number;
  personalBaseline: number;
  tip_bn: string;
  tip_en: string;
  weekScore: 1 | 2 | 3 | 4 | 5;
}

export interface AppState {
  interfaceMode: 'companion' | 'dashboard' | 'hud';
  sensitivity: 'conservative' | 'balanced' | 'relaxed';
  perclosThreshold: number;
  language: 'bn' | 'en';
  onboardingComplete: boolean;
  analyticsPIN: string;
  deleteDataAfterTrip: boolean;
  insuranceSharing: boolean;
  employerSharing: boolean;
  dataRetention: 'end-of-trip' | '7-days' | '30-days' | 'never';
  tripActive: boolean;
  tripStartTime: number | null;
  tripElapsedSeconds: number;
  drowsinessEvents: DrowsinessEvent[];
  currentAlertLevel: 0 | 1 | 2 | 3;
  perclosScore: number;
  eyeAspectRatio: number;
  blinkRate: number;
  headPose: { pitch: number; yaw: number; roll: number };
  aiConfidence: number;
  eyeState: 'open' | 'closing' | 'closed';
  eyeStateTimeline: { timestamp: number; state: 'open' | 'closing' | 'closed' }[];
  weeklyData: WeeklyDrowsinessData;
  isNightMode: boolean;
  fatigueScore: number;
  soundAlerts: boolean;
  nightQuiet: boolean;
  emergencyContact: string;
  calibrated: boolean;
  showAlert: boolean;
  currentAlert: DrowsinessEvent | null;
  // Actions
  setInterfaceMode: (mode: 'companion' | 'dashboard' | 'hud') => void;
  setSensitivity: (s: 'conservative' | 'balanced' | 'relaxed') => void;
  setOnboardingComplete: () => void;
  setLanguage: (l: 'bn' | 'en') => void;
  updateDetection: (data: Partial<AppState>) => void;
  addDrowsinessEvent: (event: DrowsinessEvent) => void;
  dismissAlert: () => void;
  flagFalseAlarm: () => void;
  setShowAlert: (show: boolean, alert?: DrowsinessEvent | null) => void;
  setDeleteDataAfterTrip: (v: boolean) => void;
  setInsuranceSharing: (v: boolean) => void;
  setEmployerSharing: (v: boolean) => void;
  setDataRetention: (v: 'end-of-trip' | '7-days' | '30-days' | 'never') => void;
  setSoundAlerts: (v: boolean) => void;
  setNightQuiet: (v: boolean) => void;
  setAnalyticsPIN: (pin: string) => void;
  setPerclosThreshold: (v: number) => void;
  startTrip: () => void;
  incrementTripTime: () => void;
}

const generateWeeklyData = (): WeeklyDrowsinessData => {
  const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  heatmap[1][23] = 1; heatmap[3][22] = 2; heatmap[3][23] = 1;
  heatmap[4][3] = 1; heatmap[6][2] = 1;
  return {
    dailyEvents: [
      { day: 'Mon', day_bn: 'সোম', count: 0 },
      { day: 'Tue', day_bn: 'মঙ্গল', count: 1 },
      { day: 'Wed', day_bn: 'বুধ', count: 0 },
      { day: 'Thu', day_bn: 'বৃহ', count: 2 },
      { day: 'Fri', day_bn: 'শুক্র', count: 1 },
      { day: 'Sat', day_bn: 'শনি', count: 0 },
      { day: 'Sun', day_bn: 'রবি', count: 1 },
    ],
    heatmap,
    peakRiskTimes: ['রাত ১০টা - ভোর ৪টা', 'দুপুর ২টা - ৩টা'],
    totalEvents: 5,
    averagePerclos: 28,
    personalBaseline: 18,
    tip_bn: 'আপনি রাত ১০টার পরে বেশি ক্লান্ত হন। এই সময়ে ড্রাইভিং কমানোর চেষ্টা করুন অথবা প্রতি ১ ঘণ্টায় ১০ মিনিট বিশ্রাম নিন।',
    tip_en: 'You get more tired after 10 PM. Try to reduce driving at this time or rest 10 minutes every hour.',
    weekScore: 4,
  };
};

export const useAppStore = create<AppState>((set) => ({
  interfaceMode: 'companion',
  sensitivity: 'balanced',
  perclosThreshold: 30,
  language: 'bn',
  onboardingComplete: false,
  analyticsPIN: '1234',
  deleteDataAfterTrip: true,
  insuranceSharing: false,
  employerSharing: false,
  dataRetention: 'end-of-trip',
  tripActive: false,
  tripStartTime: null,
  tripElapsedSeconds: 0,
  drowsinessEvents: [],
  currentAlertLevel: 0,
  perclosScore: 8,
  eyeAspectRatio: 0.32,
  blinkRate: 17,
  headPose: { pitch: 0, yaw: 0, roll: 0 },
  aiConfidence: 94,
  eyeState: 'open',
  eyeStateTimeline: [],
  weeklyData: generateWeeklyData(),
  isNightMode: new Date().getHours() >= 19 || new Date().getHours() < 6,
  fatigueScore: 12,
  soundAlerts: true,
  nightQuiet: false,
  emergencyContact: '',
  calibrated: false,
  showAlert: false,
  currentAlert: null,

  setInterfaceMode: (mode) => set({ interfaceMode: mode }),
  setSensitivity: (s) => set({ sensitivity: s }),
  setOnboardingComplete: () => set({ onboardingComplete: true }),
  setLanguage: (l) => set({ language: l }),
  updateDetection: (data) => set((state) => ({ ...state, ...data })),
  addDrowsinessEvent: (event) => set((state) => ({
    drowsinessEvents: [...state.drowsinessEvents, event],
  })),
  dismissAlert: () => set((state) => {
    if (state.currentAlert) {
      return {
        showAlert: false,
        currentAlert: null,
        drowsinessEvents: state.drowsinessEvents.map(e =>
          e.id === state.currentAlert?.id ? { ...e, dismissed: true } : e
        ),
      };
    }
    return { showAlert: false, currentAlert: null };
  }),
  flagFalseAlarm: () => set((state) => {
    if (state.currentAlert) {
      return {
        showAlert: false,
        currentAlert: null,
        drowsinessEvents: state.drowsinessEvents.map(e =>
          e.id === state.currentAlert?.id ? { ...e, flaggedFalseAlarm: true, dismissed: true } : e
        ),
      };
    }
    return { showAlert: false, currentAlert: null };
  }),
  setShowAlert: (show, alert = null) => set({ showAlert: show, currentAlert: alert }),
  setDeleteDataAfterTrip: (v) => set({ deleteDataAfterTrip: v }),
  setInsuranceSharing: (v) => set({ insuranceSharing: v }),
  setEmployerSharing: (v) => set({ employerSharing: v }),
  setDataRetention: (v) => set({ dataRetention: v }),
  setSoundAlerts: (v) => set({ soundAlerts: v }),
  setNightQuiet: (v) => set({ nightQuiet: v }),
  setAnalyticsPIN: (pin) => set({ analyticsPIN: pin }),
  setPerclosThreshold: (v) => set({ perclosThreshold: v }),
  startTrip: () => set({ tripActive: true, tripStartTime: Date.now(), tripElapsedSeconds: 0, drowsinessEvents: [] }),
  incrementTripTime: () => set((state) => ({ tripElapsedSeconds: state.tripElapsedSeconds + 1 })),
}));
