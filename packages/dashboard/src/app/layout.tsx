import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Print Fleet Monitor | Bluetooth Receipt Printer MVP',
  description: 'Central fleet dashboard for Bluetooth thermal receipt printer jobs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
