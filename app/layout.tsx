import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Grid-Sync — Real-Time Collaborative Music Sequencer',
  description:
    'Create beats together in real time. No installs, no accounts. Open a room, share the code, and jam with friends on a sixteen-step sequencer.',
  keywords: ['music sequencer', 'collaborative', 'real-time', 'beat maker', 'web audio'],
  openGraph: {
    title: 'Grid-Sync',
    description: 'Real-time collaborative sixteen-step music sequencer. No installs required.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0f0d08" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
