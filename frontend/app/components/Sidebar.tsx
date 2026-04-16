"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Dna, FileBarChart, FolderUp, Activity, ShieldCheck } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Match Configurator', href: '/predict', icon: Dna },
    { name: 'Insurance Pricing', href: '/insurance', icon: ShieldCheck },
    { name: 'Model Insights', href: '/insights', icon: Activity },
    { name: 'Batch Predict', href: '/batch', icon: FolderUp },
  ];

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-50 md:static md:w-64 bg-white border-t md:border-t-0 md:border-r border-slate-200 flex flex-col shrink-0">
      <div className="hidden md:flex h-20 shrink-0 items-center px-4 md:px-6 border-b border-slate-200">
        <div className="flex flex-col pt-1">
          <div className="font-bold text-3xl tracking-tighter leading-none"><span className="text-slate-800">Under</span><span className="text-blue-600">Score</span></div>
          <div className="h-1 w-full bg-blue-600 mt-1.5"></div>
        </div>
      </div>
      
      <nav className="flex-none md:flex-1 px-1 py-1 md:px-4 md:py-6 flex flex-row justify-around overflow-x-auto md:flex-col md:space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex flex-col md:flex-row items-center justify-center whitespace-nowrap gap-1 md:gap-3 px-2 py-2 md:px-4 md:py-2.5 rounded-lg font-medium transition-colors flex-1 md:flex-none ${
                isActive 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="text-[10px] md:text-base leading-tight font-medium">{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
