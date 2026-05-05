import type { Metadata } from 'next';
import Providers from './Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hawk',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
