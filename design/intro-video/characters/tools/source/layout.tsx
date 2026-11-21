import type { Metadata, Viewport } from 'next';
import { Overpass } from 'next/font/google';

// Signal's one family, loaded on this route only: Overpass, drawn from highway sign lettering and made to be read
// at a glance. Three weights and nothing else: 600 for quiet text, 800 for small controls and units, 900 for the loud things.
const overpass = Overpass({ subsets: ['latin'], weight: ['600', '800', '900'], variable: '--signal-font', display: 'swap' });

export const metadata: Metadata = {
  title: 'Adaptive Lifting',
  description: 'One set at a time.',
};

// The ground (black, by default) runs under the clock and the home indicator.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1c1a14',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={overpass.variable} style={{ display: 'contents' }}>{children}</div>;
}
