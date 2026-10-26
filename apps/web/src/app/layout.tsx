import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.DASHBOARD_URL?.trim() || 'http://localhost:3000'),
  title: {
    default: 'Veyra · Discord operations, simplified',
    template: '%s · Veyra',
  },
  description:
    'Moderation, logging, tickets, leveling, economy, community, music, and analytics in one Discord bot with a real dashboard.',
  openGraph: {
    title: 'Veyra · Discord operations, simplified',
    description:
      'One Discord bot for moderation, tickets, leveling, economy, community, music, and analytics.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#080a0f',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
