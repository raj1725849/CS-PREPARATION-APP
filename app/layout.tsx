import type { Metadata } from "next";
import { Inter, Playfair_Display, Sora, Plus_Jakarta_Sans, Instrument_Serif, Syne } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import SmoothScroll from "@/components/SmoothScroll";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "CS Prep - ICSI Executive Practice",
  description: "Company Secretary exam practice system using AI",
  icons: {
    icon: "/icon.svg",
  },
  verification: {
    google: "RqMwyqAK1B7gFS8hLQmzxnJe4FbUw0ik4bIljk3XAlw",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={`${plusJakarta.variable} ${inter.variable} ${playfair.variable} ${sora.variable} ${instrumentSerif.variable} ${syne.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[#1B1E4A] text-[#F8F8F6]" suppressHydrationWarning>
        <SmoothScroll>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
