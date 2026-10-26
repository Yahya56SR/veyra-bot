import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Nervana',
    template: '%s · Nervana',
  },
  description: 'Nervana control room for a single Discord community.',
  robots: { index: false, follow: false },
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
