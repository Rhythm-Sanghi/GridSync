import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Grid-Sync — Real-Time Collaborative Music Sequencer',
  description:
    'Create beats together in real time. No installs, no accounts. Open a room, share the link, and jam with friends on a neon 16-step sequencer.',
  keywords: ['music sequencer', 'collaborative', 'real-time', 'beat maker', 'web audio'],
  openGraph: {
    title: 'Grid-Sync',
    description: 'Real-time collaborative 16-step music sequencer. No installs required.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#050508" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎛️</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
