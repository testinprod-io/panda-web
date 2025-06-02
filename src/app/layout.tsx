import React from "react";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import SettingsModalHandler from "../components/modal/settings-modal-handler";
import ChatLayoutContent from "@/components/chat/chat-layout";
import "@/styles/globals.scss";
import "@/styles/markdown.scss";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Panda",
  description: "Your private AI assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <React.Suspense fallback={<div></div>}>
            <SettingsModalHandler />
          </React.Suspense>
          <ChatLayoutContent>{children}</ChatLayoutContent>
        </Providers>
      </body>
    </html>
  );
}
