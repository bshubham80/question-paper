import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const ui = Inter({ variable: "--font-ui", subsets: ["latin"] });
const question = Source_Serif_4({ variable: "--font-question", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JRF Commerce Practice",
  description: "UGC NET / JRF Commerce (code 08) practice exams with history",
};

// viewport-fit=cover lets fixed bottom bars use env(safe-area-inset-bottom) above the iPhone home bar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${ui.variable} ${question.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
