import React from "react";
import { Inter, Montserrat } from "next/font/google";
import { Providers } from "./providers";
import SettingsModalHandler from "../components/modal/settings-modal-handler";
import "@/styles/globals.scss";
import "@/styles/markdown.scss";
import { clsx } from "clsx";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  title: "Panda",
  description: "Your private AI assistant",
  // themeColor: [
  //   { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
  //   { media: "(prefers-color-scheme: dark)", color: "#292929" },
  // ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={clsx(inter.className, montserrat.className)}>
        <Providers>
          <React.Suspense fallback={<div></div>}>
            <SettingsModalHandler />
          </React.Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
