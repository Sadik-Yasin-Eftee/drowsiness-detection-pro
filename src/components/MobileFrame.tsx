import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

/**
 * MobileFrame
 *
 * Wraps the entire app in a phone-sized viewport so the experience always
 * looks and behaves like a native mobile app — even when previewed on
 * desktop. On real mobile screens it fills the screen edge-to-edge.
 *
 * Layout: flex column with a scrolling content area on top and the bottom
 * navigation pinned to the bottom of the frame (when applicable for the
 * current route). Any `fixed` overlays inside pages should be converted
 * to `absolute` so they stay constrained to the frame.
 */

// Routes that should display the persistent bottom navigation
const NAV_ROUTES = ['/drive', '/rest-stops', '/analytics', '/settings'];

export function MobileFrame({ children }: { children: ReactNode }) {
  const location = useLocation();
  const showNav = NAV_ROUTES.some((r) => location.pathname.startsWith(r));

  return (
    <div className="min-h-screen w-full bg-background md:bg-muted/40 flex md:items-center md:justify-center md:p-6">
      <div
        className="
          relative bg-background overflow-hidden flex flex-col
          w-full min-h-screen
          md:w-[390px] md:h-[844px] md:min-h-0 md:max-h-[calc(100vh-3rem)]
          md:rounded-[2.25rem] md:shadow-2xl md:ring-1 md:ring-border
        "
      >
        {/* Scrolling content area — fills available space above nav */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {children}
        </div>

        {/* Persistent bottom navigation — stays inside the frame */}
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
