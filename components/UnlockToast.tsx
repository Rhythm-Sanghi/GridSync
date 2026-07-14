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

    // Mark all as shown immediately to prevent re-display on next load
    unlocks.forEach((u) => markUnlockShown(u.id));

    const timer = setTimeout(() => setVisible([]), 5000);
    return () => clearTimeout(timer);
  }, [unlocks]);

  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {visible.map((unlock) => (
        <div
          key={unlock.id}
          className="unlock-toast glass-card px-5 py-4 max-w-sm border border-neon-cyan/30"
          style={{ boxShadow: '0 0 24px rgba(0,245,255,0.2)' }}
        >
          <div className="text-lg font-bold text-neon-cyan text-glow-cyan mb-1">
            {unlock.title}
          </div>
          <div className="text-sm text-white/70">{unlock.description}</div>
        </div>
      ))}
    </div>
  );
});
