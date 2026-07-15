'use client';

import { useState, useCallback, memo } from 'react';
import { PeerInfo } from '@/lib/types';
import { ConnectionState } from '@/lib/network/guest';

interface RoomBarProps {
  roomCode: string;
  peers: PeerInfo[];
  myPeerId: string | null;
  connectionState: ConnectionState | 'idle';
  role: 'host' | 'guest' | 'solo';
}

export const RoomBar = memo(function RoomBar({
  roomCode,
  peers,
  myPeerId,
  connectionState,
  role,
}: RoomBarProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/room/${roomCode}`
      : '';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Grid-Sync session',
          text: `Join my live sequencer session — room code: ${roomCode}`,
          url: shareUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  }, [shareUrl, roomCode, handleCopy]);

  const totalPeople = peers.length + 1; // include self

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-4">

      {/* Room code */}
      <div className="flex flex-col gap-0.5">
        <span
          className="font-mono uppercase tracking-[0.25em]"
          style={{ fontSize: '8px', color: 'var(--ink-mute)' }}
        >
          Session
        </span>
        <span className="hw-code text-2xl sm:text-3xl">
          {roomCode}
        </span>
      </div>

      {/* Copy / Share buttons */}
      <div className="flex gap-2">
        <button
          id="btn-copy-link"
          className="hw-btn hw-btn-ghost text-xs py-1"
          style={{ padding: '5px 12px' }}
          onClick={handleCopy}
          aria-label="Copy room link"
        >
          {copied ? 'COPIED' : 'COPY'}
        </button>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            id="btn-share"
            className="hw-btn hw-btn-ghost text-xs py-1"
            style={{ padding: '5px 12px' }}
            onClick={handleShare}
            aria-label="Share room link"
          >
            SHARE
          </button>
        )}
      </div>

      {/* Peer presence — colored circles */}
      {peers.length > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <span
            className="font-mono"
            style={{ fontSize: '10px', color: 'var(--ink-mute)' }}
          >
            {totalPeople} active
          </span>
          <div className="flex" style={{ gap: '-4px' }}>
            {/* Self indicator */}
            <div
              className="peer-dot"
              style={{
                backgroundColor: 'var(--brass)',
                borderColor: 'var(--brass-light)',
                color: 'var(--bg-inset)',
                width: '18px',
                height: '18px',
                fontSize: '8px',
                zIndex: 10,
              }}
              title="You"
            />
            {peers.map((peer, i) => (
              <div
                key={peer.peerId}
                className="peer-dot"
                style={{
                  backgroundColor: peer.color,
                  borderColor: peer.color,
                  color: 'var(--bg-inset)',
                  width: '18px',
                  height: '18px',
                  fontSize: '8px',
                  marginLeft: '-4px',
                  zIndex: 10 - i,
                  opacity: 0.9,
                }}
                title={`Guest ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Connection status */}
      <ConnectionBadge state={connectionState} role={role} />
    </div>
  );
});

function ConnectionBadge({
  state,
  role,
}: {
  state: ConnectionState | 'idle';
  role: string;
}) {
  if (role === 'host' || role === 'solo') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="status-led status-led-on" />
        <span
          className="font-mono uppercase tracking-wider"
          style={{ fontSize: '10px', color: 'var(--ink-mute)' }}
        >
          {role === 'host' ? 'Hosting' : 'Solo'}
        </span>
      </div>
    );
  }

  const statusMap: Record<string, { ledClass: string; label: string }> = {
    idle:         { ledClass: 'status-led status-led-off',     label: 'Offline' },
    connecting:   { ledClass: 'status-led status-led-pending', label: 'Connecting' },
    connected:    { ledClass: 'status-led status-led-on',      label: 'Live' },
    disconnected: { ledClass: 'status-led status-led-off',     label: 'Disconnected' },
    migrating:    { ledClass: 'status-led status-led-pending', label: 'Migrating' },
    failed:       { ledClass: 'status-led status-led-off',     label: 'Solo mode' },
  };

  const { ledClass, label } = statusMap[state] ?? statusMap.idle;

  return (
    <div className="flex items-center gap-1.5">
      <div className={ledClass} />
      <span
        className="font-mono uppercase tracking-wider"
        style={{ fontSize: '10px', color: 'var(--ink-mute)' }}
      >
        {label}
      </span>
    </div>
  );
}
