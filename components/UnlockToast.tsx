'use client';

import { useEffect, useState, memo } from 'react';
import { UnlockEvent } from '@/lib/types';
import { markUnlockShown } from '@/lib/milestones';

interface UnlockToastProps {
  unlocks: UnlockEvent[];
}

export const UnlockToast = memo(function UnlockToast({ unlocks }: UnlockToastProps) {
  const [visible, setVisible] = useState<UnlockEvent[]>([]);

  useEffect(() => {
    if (unlocks.length === 0) return;
    setVisible(unlocks);
    unlocks.forEach((u) => markUnlockShown(u.id));
    const timer = setTimeout(() => setVisible([]), 5500);
    return () => clearTimeout(timer);
  }, [unlocks]);

  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {visible.map((unlock) => (
        <div
          key={unlock.id}
          className="unlock-toast hw-panel px-5 py-4 max-w-xs"
          style={{
            borderColor: 'var(--border-warm)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.7), 0 0 0 1px var(--border-bright)',
          }}
        >
          {/* Title */}
          <div
            className="font-display italic font-semibold leading-snug"
            style={{ fontSize: '1.1rem', color: 'var(--brass-light)', letterSpacing: '0.02em' }}
          >
            {unlock.title}
          </div>

          {/* Divider */}
          <div className="hw-rule my-2" />

          {/* Description */}
          <div
            className="font-mono leading-relaxed"
            style={{ fontSize: '11px', color: 'var(--ink-dim)' }}
          >
            {unlock.description}
          </div>
        </div>
      ))}
    </div>
  );
});
