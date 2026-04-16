import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { FileBarChart } from 'lucide-react';

export const metadata: Metadata = {
  title: "UnderScore",
  description: "Sports Analytics & Prize Indemnity Underwriting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans min-h-screen flex flex-col md:flex-row bg-slate-50 pb-16 md:pb-0`}>
        {/* Mobile Header */}
        <div className="md:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 shrink-0 sticky top-0 z-40">
          <div className="flex flex-col pt-1">
            <div className="font-bold text-2xl tracking-tighter leading-none"><span className="text-slate-800">Under</span><span className="text-blue-600">Score</span></div>
            <div className="h-[3px] w-full bg-blue-600 mt-1"></div>
          </div>
        </div>

        <Sidebar />
        <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
