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
      // Fallback for older browsers
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
          title: 'Join my Grid-Sync jam!',
          text: `Join my live beat session — room code: ${roomCode}`,
          url: shareUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  }, [shareUrl, roomCode, handleCopy]);

  const totalPeople = peers.length + (role === 'host' ? 1 : 1); // include self

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
      {/* Room code */}
      <div className="flex flex-col">
        <span className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Room</span>
        <span className="room-code text-2xl sm:text-3xl">{roomCode}</span>
      </div>

      {/* Copy / Share button */}
      <div className="flex gap-2">
        <button
          id="btn-copy-link"
          className={[
            'btn-neon text-xs py-1.5',
            copied ? 'btn-neon-lime' : 'btn-neon-cyan',
          ].join(' ')}
          onClick={handleCopy}
          aria-label="Copy room link"
        >
          {copied ? '✓ COPIED!' : '🔗 COPY LINK'}
        </button>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            id="btn-share"
            className="btn-neon btn-neon-white text-xs py-1.5"
            onClick={handleShare}
            aria-label="Share room link"
          >
            📤 SHARE
          </button>
        )}
      </div>

      {/* Peer presence */}
      {peers.length > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-white/40 font-mono">
            {totalPeople} jamming
          </span>
          <div className="flex -space-x-1.5">
            {/* Host indicator */}
            {role === 'host' && (
              <div
                className="peer-avatar z-10"
                style={{
                  backgroundColor: 'rgba(0,245,255,0.1)',
                  borderColor: '#00f5ff',
                  color: '#00f5ff',
                  boxShadow: '0 0 8px #00f5ff',
                }}
                title="You (Host)"
              >
                🎛️
              </div>
            )}
            {peers.map((peer, i) => (
              <div
                key={peer.peerId}
                className="peer-avatar"
                style={{
                  backgroundColor: `${peer.color}18`,
                  borderColor: peer.color,
                  color: peer.color,
                  boxShadow: `0 0 8px ${peer.color}`,
                  zIndex: 10 - i,
                }}
                title={`Guest ${i + 1}`}
              >
                {peer.emoji}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection status badge */}
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
      <div className="flex items-center gap-1.5 text-xs text-white/30">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-lime shadow-[0_0_4px_#a8ff00]" />
        <span className="font-mono uppercase tracking-wider">
          {role === 'host' ? 'Hosting' : 'Solo'}
        </span>
      </div>
    );
  }

  const statusMap: Record<string, { dot: string; label: string }> = {
    idle: { dot: 'bg-white/20', label: 'Offline' },
    connecting: { dot: 'bg-neon-yellow animate-pulse shadow-[0_0_4px_#ffe600]', label: 'Connecting…' },
    connected: { dot: 'bg-neon-lime shadow-[0_0_4px_#a8ff00]', label: 'Live' },
    disconnected: { dot: 'bg-white/20', label: 'Disconnected' },
    migrating: { dot: 'bg-neon-orange animate-pulse shadow-[0_0_4px_#ff8c00]', label: 'Migrating…' },
    failed: { dot: 'bg-neon-red shadow-[0_0_4px_#ff3355]', label: 'Solo mode' },
  };

  const { dot, label } = statusMap[state] ?? statusMap.idle;

  return (
    <div className="flex items-center gap-1.5 text-xs text-white/30">
      <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="font-mono uppercase tracking-wider">{label}</span>
    </div>
  );
}
