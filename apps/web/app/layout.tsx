import "./globals.css";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { SwRegister } from "../components/SwRegister";
import { Toaster } from "../components/ui/Toaster";
import { HouseProvider } from "@homegraph/engine";
import { HouseBootstrap } from "../components/HouseBootstrap";
import { DeviceStateSync } from "../components/DeviceStateSync";
import { DiscoverPrompt } from "../components/DiscoverPrompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Homegraph",
  description: "Photoreal exterior modeling & control"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <SwRegister />
        <Toaster />
        <DeviceStateSync />
        <HouseProvider>
          <DiscoverPrompt />
          <HouseBootstrap />
          {children}
        </HouseProvider>
      </body>
    </html>
  );
}
