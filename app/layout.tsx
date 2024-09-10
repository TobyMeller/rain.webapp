import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import "@fontsource/dm-sans/200.css";
import "@fontsource/dm-sans/300.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/800.css";

export const metadata: Metadata = {
  title: "Raindex",
  description: "Deploy Raindex strategies with a few clicks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" />
      </head>
      <body>
        <Providers>
          <div className={`flex flex-col min-h-screen`}>
            <div className="sticky w-full flex justify-between items-center p-2 border-b top-0 bg-white z-[100]">
              <div className="flex gap-x-2 items-center">
                <img src="/_images/raindex-logo.png" className="h-10 mr-8" />
                <a href="/my-strategies" className="text-gray-900">
                  My strategies
                </a>
              </div>
              <ConnectButton />
            </div>
            <div className="flex flex-col flex-grow items-center justify-center">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
