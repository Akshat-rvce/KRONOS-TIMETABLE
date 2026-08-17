import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { AuthProvider } from "@/context/AuthContext";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KRONOS // Multi-User Study Timetable & Analytics Dashboard",
  description: "A premium, cloud-persistent study log, consistency heatmap tracker, and advanced focus metrics engine with private accounts.",
  keywords: ["study tracker", "timetable", "productivity heatmap", "cloud-first", "student dashboard"]
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col`}>
        <AuthProvider>
          {/* Futuristic Floating Navigation */}
          <Navigation />
          
          {/* Core application body */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-6 pb-20">
            {children}
          </main>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
