import { useNavigate, useLocation } from 'react-router-dom';
import { Car, MapPin, BarChart3, Settings } from 'lucide-react';

const tabs = [
  { path: '/drive', icon: Car, label_bn: 'গাড়ি', label_en: 'Drive' },
  { path: '/rest-stops', icon: MapPin, label_bn: 'বিশ্রাম', label_en: 'Rest' },
  { path: '/analytics', icon: BarChart3, label_bn: 'রিপোর্ট', label_en: 'Report' },
  { path: '/settings', icon: Settings, label_bn: 'সেটিংস', label_en: 'Settings' },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="sticky bottom-0 left-0 right-0 bg-card border-t border-border z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 w-full">
        {tabs.map((tab) => {
          const active = location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <tab.icon size={22} />
              <span className="text-[11px] font-bangla font-medium">{tab.label_bn}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
