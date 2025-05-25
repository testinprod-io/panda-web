import React from 'react'; // Keep React for JSX
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import '@/styles/globals.scss';
import "@/styles/markdown.scss";
import SettingsModalHandler from '../components/SettingsModalHandler';
import ChatLayoutContent from '@/components/ChatLayout'; // Import the new client component

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  title: 'Panda',
  description: 'Your private AI assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <React.Suspense fallback={<div></div>}>
          <SettingsModalHandler />
        </React.Suspense>
        <Providers>
          <ChatLayoutContent>{children}</ChatLayoutContent>
        </Providers>
      </body>
    </html>
  );
}
