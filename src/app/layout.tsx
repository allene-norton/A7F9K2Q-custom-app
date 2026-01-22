import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

import 'copilot-design-system/dist/styles/main.css';

export const metadata: Metadata = {
  title: "ClearTech Background Services",
  description: "Professional background check management system",
  other: {
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": "frame-ancestors 'self' *.assembly.com;",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={[inter.className].join(' ')}>{children}</body>
    </html>
  );
}
