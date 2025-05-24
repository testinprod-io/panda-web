import { Roboto } from 'next/font/google';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import '@/app/styles/globals.scss';
import "@/app/styles/markdown.scss";
import SettingsModalHandler from './components/SettingsModalHandler';
import React from 'react';

const roboto = Roboto({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'] 
});

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
          {children}
        </Providers>
      </body>
    </html>
  );
}
