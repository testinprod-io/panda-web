import { Roboto } from 'next/font/google';
import { Providers } from './providers';
import '@/app/styles/globals.scss';

const roboto = Roboto({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'] 
});

export const metadata = {
  title: 'ChatGPT Clone',
  description: 'A ChatGPT-like web application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={roboto.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
