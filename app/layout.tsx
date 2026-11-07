import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AnalyticsPlaceholder } from "@/components/analytics-placeholder";
import { CookieBanner } from "@/components/cookie-banner";
import { ToastProvider } from "@/components/toast-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "School Manager", template: "%s | School Manager" },
  description: "A secure workspace for school operations, attendance, and results.",
  applicationName: "School Manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <a href="#main-content" className="skip-link">Skip to content</a>
        {children}
        <CookieBanner />
        <ToastProvider />
        <AnalyticsPlaceholder />
      </body>
    </html>
  );
}
