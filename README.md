# Grid-Sync

**A free, browser-based, real-time collaborative 16-step music sequencer.**

No installs. No accounts. Open a room, share a 4-letter code, and jam together.

**[Live demo](https://your-vercel-url.vercel.app)** — replace after deployment

---

## What it does

- 16-step x 6-track sequencer synthesized live in the browser via Web Audio API — no audio files, no servers for audio
- Real-time collaboration — up to 5 people toggle steps on a shared neon grid over WebRTC peer-to-peer
- Each collaborator gets a distinct neon color — their step activations are visually attributed in real time
- Phase-locked playback across browsers using a lookahead scheduler + BEAT_SYNC clock alignment
- Record and share — capture the grid + audio as a WebM video and download it
- Session milestones — additional tracks and synth voices unlock after your 3rd, 10th, and 25th sessions (stored in localStorage)

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| Audio | Raw Web Audio API (oscillators, gain nodes, filters — no audio libraries) |
| Real-time sync | WebRTC via PeerJS (host-authoritative star topology) |
| Signaling | PeerJS free public broker (deterministic peer IDs — no custom server) |
| State | React hooks + localStorage (no database, no accounts) |

---

## Architecture highlights

### Host-authoritative star topology

- **Host** = room creator's browser = source of truth for grid state
- **Guests** each open one WebRTC data channel to the host only
- Guest click → host validates → host broadcasts authoritative state to all peers
- **Host migration**: if host disconnects, guests race to claim the host peer ID with a join-order-weighted delay; the winner seeds state from the last `FULL_STATE` it cached

### Audio timing

Implements the "A Tale of Two Clocks" pattern (Chris Wilson):

- A `setTimeout` loop fires every 25ms to check what notes fall within the next 100ms lookahead window
- Actual note scheduling uses `AudioContext.currentTime` — never `setInterval`
- Cross-browser phase alignment via `BEAT_SYNC` messages: sent immediately on guest join, then every 10 seconds

### Message protocol

```ts
// Guest to Host
TOGGLE_STEP | SET_TEMPO | RANDOMIZE | SET_TRACK_PARAM

// Host to Guest
FULL_STATE | STEP_UPDATED | BEAT_SYNC | PEER_JOINED | PEER_LEFT | GRID_RANDOMIZED
```

---

## Running locally

```bash
git clone https://github.com/Rhythm-Sanghi/GridSync.git
cd GridSync
npm install
npm run dev
# Open http://localhost:3000
```

---

## Deploying to Vercel

```bash
npx vercel
```

The app runs entirely on free tiers:

- **Vercel** — hosts the Next.js app
- **PeerJS broker** — free public signaling (no custom server needed for MVP)
- **Google STUN** — `stun:stun.l.google.com:19302` (free, no setup)

### Optional: TURN server (for restrictive NAT connections)

Self-host [coturn](https://github.com/coturn/coturn) on an Oracle Cloud Always-Free VM, then:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_TURN_URL=turn:your-vm-ip:3478
NEXT_PUBLIC_TURN_USERNAME=gridsync
NEXT_PUBLIC_TURN_CREDENTIAL=your-secret
```

---

## Project structure

```
app/
  page.tsx                  Landing page
  room/[code]/page.tsx      Sequencer room (host + guest + solo modes)
components/
  Grid.tsx                  16xN step grid with per-peer color coding
  TrackHeader.tsx           Per-track label, mute, pitch knob
  TransportBar.tsx          Play/Stop, BPM, Randomize, Record
  RoomBar.tsx               Room code, copy link, peer avatars
  UnlockToast.tsx           Milestone unlock notifications
hooks/
  useSequencer.ts           Grid state, audio engine lifecycle, kick pulse
  useRoom.ts                Host/guest networking lifecycle
  useExport.ts              MediaRecorder audio+canvas to WebM
lib/
  audio/
    audioContext.ts         Singleton AudioContext + master gain
    synth.ts                Pure synthesis: kick, snare, hi-hat x2, clap, bass, lead, pad
    scheduler.ts            Lookahead scheduler (Chris Wilson pattern)
  network/
    host.ts                 Host star topology: message processing, BEAT_SYNC
    guest.ts                Guest: single connection, host migration algorithm
  signaling/
    peerjs-broker.ts        Deterministic peer ID from room code (swap point for Firebase)
  types.ts                  All shared TypeScript types
  constants.ts              BPM, track definitions, peer colors
  patterns.ts               Default + musically-biased random patterns
  milestones.ts             Session counting, unlock logic
```

---

## Session milestone unlocks

| Session count | Unlock |
|---|---|
| 3rd | Open hi-hat track + triangle waveform |
| 10th | Pad synth track + pulse waveform |
| 25th | FM-style waveform + prismatic palette |

Tracked in `localStorage` — no account needed. Toast fires exactly once per unlock.

---

## Graceful degradation

- **WebRTC blocked** (corporate networks, etc.): shows a clear warning banner and falls back to solo play — audio and grid still work
- **Host disconnects**: automatic promotion of longest-connected guest to host, grid state preserved from last `FULL_STATE`
- **Safari export**: `MediaRecorder` audio capture may not be available; falls back to canvas-only video

---

## License

MIT
