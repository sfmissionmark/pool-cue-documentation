import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cue Part Documentation - Butler Cues",
  description: "Documentation system for pool cue parts including ferrules and pins",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 dark:bg-slate-900`}
      >
        <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex-shrink-0">
                <a 
                  href="https://butlercues.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block transition-opacity hover:opacity-80"
                >
                  <img 
                    src="/logo.png" 
                    alt="Butler Cues" 
                    className="h-10 w-auto"
                  />
                </a>
              </div>
              
              {/* Title */}
              <div className="flex-1 text-center">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Cue Part Documentation
                </h1>
              </div>
              
              {/* Right spacer to balance the logo */}
              <div className="flex-shrink-0 w-[120px]"></div>
            </div>
          </div>
        </header>
        
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
