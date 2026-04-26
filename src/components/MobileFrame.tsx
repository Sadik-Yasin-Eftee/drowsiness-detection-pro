import { ReactNode } from 'react';

/**
 * MobileFrame
 *
 * Wraps the entire app in a phone-sized viewport so the experience always
 * looks and behaves like a native mobile app — even when previewed on
 * desktop. On real mobile screens (< 480px wide) it transparently fills
 * the screen edge-to-edge.
 *
 * The inner element is `position: relative` so any `position: fixed`
 * children inside the app (BottomNav, AlertOverlay, etc.) that we
 * convert to `absolute` will be constrained inside the frame.
 */
export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background md:bg-muted/40 flex md:items-center md:justify-center md:p-6">
      <div
        className="
          relative w-full bg-background overflow-hidden
          min-h-screen md:min-h-0
          md:w-[390px] md:h-[844px] md:max-h-[calc(100vh-3rem)]
          md:rounded-[2.25rem] md:shadow-2xl md:ring-1 md:ring-border
        "
      >
        {/* scroll container — fills the frame */}
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
