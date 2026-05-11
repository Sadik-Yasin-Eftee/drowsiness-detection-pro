import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export type InterfaceMode = 'companion' | 'dashboard' | 'hud';
export type Sensitivity = 'conservative' | 'balanced' | 'relaxed';
export type Language = 'bn' | 'en';
export type DataRetention = 'end-of-trip' | '7-days' | '30-days' | 'never';
export type EyeState = 'open' | 'closing' | 'closed';
export type CameraPermissionStatus = 'undetermined' | 'denied' | 'granted';
/** Alert notification mode: sound-only, vibration-only, or night (quiet sound + vibration) */
export type AlertMode = 'sound' | 'vibration' | 'night';

export interface AppState {
  // Persisted preferences
  interfaceMode: InterfaceMode;
  sensitivity: Sensitivity;
  perclosThreshold: number;
  language: Language;
  onboardingComplete: boolean;
  permissionsRequested: boolean;
  cameraPermission: CameraPermissionStatus;
  analyticsPIN: string;
  deleteDataAfterTrip: boolean;
  insuranceSharing: boolean;
  employerSharing: boolean;
  dataRetention: DataRetention;
  soundAlerts: boolean;
  hapticAlerts: boolean;
  nightQuiet: boolean;
  alertMode: AlertMode;
  emergencyContact: string;
  calibrated: boolean;

  // Live trip + detection state (not persisted)
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
  eyeState: EyeState;
  eyeStateTimeline: { timestamp: number; state: EyeState }[];
  fatigueScore: number;
  faceDetected: boolean;
  nextRiskEtaMin: number | null; // minutes until predicted Level-1 risk; null = unknown

  // Display + alert state
  weeklyData: WeeklyDrowsinessData;
  isNightMode: boolean;
  showAlert: boolean;
  currentAlert: DrowsinessEvent | null;

  // Auto-SMS after 3 dismissed Level-3 alerts
  dismissedLevel3Count: number;
  autoSmsFired: boolean;

  // Actions ── preferences
  setInterfaceMode: (mode: InterfaceMode) => void;
  setSensitivity: (s: Sensitivity) => void;
  setOnboardingComplete: () => void;
  setPermissionsRequested: () => void;
  setCameraPermission: (status: CameraPermissionStatus) => void;
  setLanguage: (l: Language) => void;
  setDeleteDataAfterTrip: (v: boolean) => void;
  setInsuranceSharing: (v: boolean) => void;
  setEmployerSharing: (v: boolean) => void;
  setDataRetention: (v: DataRetention) => void;
  setSoundAlerts: (v: boolean) => void;
  setHapticAlerts: (v: boolean) => void;
  setNightQuiet: (v: boolean) => void;
  setAlertMode: (mode: AlertMode) => void;
  setEmergencyContact: (v: string) => void;
  markAutoSmsFired: () => void;
  setAnalyticsPIN: (pin: string) => void;
  setPerclosThreshold: (v: number) => void;

  // Actions ── trip + detection
  startTrip: () => void;
  endTrip: () => void;
  incrementTripTime: () => void;
  updateDetection: (data: Partial<AppState>) => void;
  addDrowsinessEvent: (event: DrowsinessEvent) => void;
  dismissAlert: () => void;
  flagFalseAlarm: () => void;
  setShowAlert: (show: boolean, alert?: DrowsinessEvent | null) => void;

  // Hydration
  hydrate: () => Promise<void>;
}

const PERSIST_KEY = 'drowsyguard:prefs:v1';

const PERSIST_FIELDS: (keyof AppState)[] = [
  'interfaceMode',
  'sensitivity',
  'perclosThreshold',
  'language',
  // onboardingComplete and permissionsRequested are intentionally NOT persisted
  // so the permissions + mode-selection screens always show on every app launch
  'cameraPermission',
  'analyticsPIN',
  'deleteDataAfterTrip',
  'insuranceSharing',
  'employerSharing',
  'dataRetention',
  'soundAlerts',
  'hapticAlerts',
  'nightQuiet',
  'alertMode',
  'emergencyContact',
  'calibrated',
];

const generateWeeklyData = (): WeeklyDrowsinessData => {
  const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  heatmap[1][23] = 1;
  heatmap[3][22] = 2;
  heatmap[3][23] = 1;
  heatmap[4][3] = 1;
  heatmap[6][2] = 1;
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
    tip_bn:
      'আপনি রাত ১০টার পরে বেশি ক্লান্ত হন। এই সময়ে ড্রাইভিং কমানোর চেষ্টা করুন অথবা প্রতি ১ ঘণ্টায় ১০ মিনিট বিশ্রাম নিন।',
    tip_en: 'You get more tired after 10 PM. Try to reduce driving at this time or rest 10 minutes every hour.',
    weekScore: 4,
  };
};

const persist = async (state: AppState) => {
  try {
    const subset: Record<string, unknown> = {};
    PERSIST_FIELDS.forEach((k) => {
      subset[k as string] = state[k];
    });
    await AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(subset));
  } catch (err) {
    console.warn('[store] persist failed:', err);
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  // Defaults — preferences
  interfaceMode: 'companion',
  sensitivity: 'balanced',
  perclosThreshold: 30,
  language: 'bn',
  onboardingComplete: false,
  permissionsRequested: false,
  cameraPermission: 'undetermined',
  analyticsPIN: '1234',
  deleteDataAfterTrip: true,
  insuranceSharing: false,
  employerSharing: false,
  dataRetention: 'end-of-trip',
  soundAlerts: true,
  hapticAlerts: true,
  nightQuiet: false,
  alertMode: 'sound' as AlertMode,
  emergencyContact: '',
  calibrated: false,

  // Defaults — runtime
  tripActive: false,
  tripStartTime: null,
  tripElapsedSeconds: 0,
  drowsinessEvents: [],
  currentAlertLevel: 0,
  perclosScore: 8,
  eyeAspectRatio: 0.32,
  blinkRate: 17,
  headPose: { pitch: 0, yaw: 0, roll: 0 },
  aiConfidence: 0,
  eyeState: 'open',
  eyeStateTimeline: [],
  fatigueScore: 12,
  faceDetected: false,
  nextRiskEtaMin: null,

  weeklyData: generateWeeklyData(),
  isNightMode: new Date().getHours() >= 19 || new Date().getHours() < 6,
  showAlert: false,
  currentAlert: null,
  dismissedLevel3Count: 0,
  autoSmsFired: false,

  // Actions ── preferences (auto-persist)
  setInterfaceMode: (mode) => {
    set({ interfaceMode: mode });
    void persist(get());
  },
  setSensitivity: (s) => {
    const threshold = s === 'conservative' ? 22 : s === 'balanced' ? 30 : 38;
    set({ sensitivity: s, perclosThreshold: threshold });
    void persist(get());
  },
  setOnboardingComplete: () => {
    set({ onboardingComplete: true });
    void persist(get());
  },
  setPermissionsRequested: () => {
    set({ permissionsRequested: true });
    void persist(get());
  },
  setCameraPermission: (status) => {
    set({ cameraPermission: status });
    void persist(get());
  },
  setLanguage: (l) => {
    set({ language: l });
    void persist(get());
  },
  setDeleteDataAfterTrip: (v) => {
    set({ deleteDataAfterTrip: v });
    void persist(get());
  },
  setInsuranceSharing: (v) => {
    set({ insuranceSharing: v });
    void persist(get());
  },
  setEmployerSharing: (v) => {
    set({ employerSharing: v });
    void persist(get());
  },
  setDataRetention: (v) => {
    set({ dataRetention: v });
    void persist(get());
  },
  setSoundAlerts: (v) => {
    set({ soundAlerts: v });
    void persist(get());
  },
  setHapticAlerts: (v) => {
    set({ hapticAlerts: v });
    void persist(get());
  },
  setNightQuiet: (v) => {
    set({ nightQuiet: v });
    void persist(get());
  },
  setAlertMode: (mode) => {
    const soundAlerts  = mode !== 'vibration';
    const hapticAlerts = mode !== 'sound';
    const nightQuiet   = mode === 'night';
    set({ alertMode: mode, soundAlerts, hapticAlerts, nightQuiet });
    void persist(get());
  },
  markAutoSmsFired: () => set({ autoSmsFired: true }),
  setEmergencyContact: (v) => {
    set({ emergencyContact: v });
    void persist(get());
  },
  setAnalyticsPIN: (pin) => {
    set({ analyticsPIN: pin });
    void persist(get());
  },
  setPerclosThreshold: (v) => {
    set({ perclosThreshold: v });
    void persist(get());
  },

  // Actions ── trip + detection (NOT persisted — privacy)
  startTrip: () =>
    set({
      tripActive: true,
      tripStartTime: Date.now(),
      tripElapsedSeconds: 0,
      drowsinessEvents: [],
      eyeStateTimeline: [],
      dismissedLevel3Count: 0,
      autoSmsFired: false,
    }),
  endTrip: () => {
    const { deleteDataAfterTrip } = get();
    if (deleteDataAfterTrip) {
      set({
        tripActive: false,
        tripStartTime: null,
        tripElapsedSeconds: 0,
        drowsinessEvents: [],
        eyeStateTimeline: [],
        currentAlertLevel: 0,
        perclosScore: 0,
        showAlert: false,
        currentAlert: null,
      });
    } else {
      set({ tripActive: false });
    }
  },
  incrementTripTime: () => set((s) => ({ tripElapsedSeconds: s.tripElapsedSeconds + 1 })),
  updateDetection: (data) => set((s) => ({ ...s, ...data })),
  addDrowsinessEvent: (event) =>
    set((s) => ({ drowsinessEvents: [...s.drowsinessEvents, event] })),

  dismissAlert: () =>
    set((s) => {
      const isL3 = s.currentAlert?.alertLevel === 3;
      const newL3Count = isL3 ? s.dismissedLevel3Count + 1 : s.dismissedLevel3Count;
      if (s.currentAlert) {
        return {
          showAlert: false,
          currentAlert: null,
          dismissedLevel3Count: newL3Count,
          drowsinessEvents: s.drowsinessEvents.map((e) =>
            e.id === s.currentAlert?.id ? { ...e, dismissed: true } : e,
          ),
        };
      }
      return { showAlert: false, currentAlert: null, dismissedLevel3Count: newL3Count };
    }),

  flagFalseAlarm: () =>
    set((s) => {
      if (s.currentAlert) {
        return {
          showAlert: false,
          currentAlert: null,
          drowsinessEvents: s.drowsinessEvents.map((e) =>
            e.id === s.currentAlert?.id ? { ...e, flaggedFalseAlarm: true, dismissed: true } : e,
          ),
        };
      }
      return { showAlert: false, currentAlert: null };
    }),

  setShowAlert: (show, alert = null) => set({ showAlert: show, currentAlert: alert }),

  // Hydration from AsyncStorage on app start
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(PERSIST_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      // Only restore keys in PERSIST_FIELDS — stale keys (e.g. onboardingComplete,
      // permissionsRequested) in old AsyncStorage data are ignored this way.
      const safe: Record<string, unknown> = {};
      PERSIST_FIELDS.forEach((k) => {
        if (k in parsed) safe[k as string] = parsed[k as string];
      });
      set((s) => ({ ...s, ...safe }));
    } catch (err) {
      console.warn('[store] hydrate failed:', err);
    }
  },
}));
