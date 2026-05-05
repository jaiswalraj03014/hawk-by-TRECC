'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Montserrat } from 'next/font/google';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const montserrat = Montserrat({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600', '700'] 
});

// Demo Data: Showing Hawk Agent outperforming the baseline market
const performanceData = [
  { day: 'Day 1', agentValue: 10000, marketValue: 10000 },
  { day: 'Day 5', agentValue: 10450, marketValue: 10100 },
  { day: 'Day 10', agentValue: 10300, marketValue: 9800 },
  { day: 'Day 15', agentValue: 11200, marketValue: 10500 },
  { day: 'Day 20', agentValue: 11800, marketValue: 10200 },
  { day: 'Day 25', agentValue: 12500, marketValue: 11000 },
  { day: 'Day 30', agentValue: 14200, marketValue: 11500 },
];

export default function TerminalPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <main className={`min-h-screen bg-[#020202] text-neutral-300 relative overflow-hidden ${montserrat.className}`}>
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[600px] bg-orange-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 p-8 relative z-10">
        
        {/* Navigation Header */}
        <header className="flex items-center justify-between pt-4 pb-8 border-b border-white/5">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 transition-all text-white font-mono text-xl">
              ←
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">
                Hawk <span className="text-orange-500 font-normal">Institutional Terminal</span>
              </h1>
              <p className="text-xs text-neutral-500 mt-1 font-medium tracking-widest uppercase">
                Alpha Tranche Performance Analytics
              </p>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-lg">
                <span className="text-[10px] text-green-500/70 uppercase block mb-0.5">Agent Win Rate</span>
                <span className="text-green-400 font-mono text-lg">78.4%</span>
             </div>
             <div className="bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-lg">
                <span className="text-[10px] text-orange-500/70 uppercase block mb-0.5">30D Alpha Gen</span>
                <span className="text-orange-400 font-mono text-lg">+42.0%</span>
             </div>
          </div>
        </header>

        {/* The Chart Section */}
        <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              Capital Curve vs. Baseline
            </h2>
            <div className="flex gap-4 text-[11px] font-medium uppercase tracking-wider">
              <span className="text-orange-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(234,88,12,0.8)]"></span> Hawk AI Agent</span>
              <span className="text-blue-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span> WETH Hold</span>
            </div>
          </div>
          
          <div className="w-full h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAgent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMarket" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="day" stroke="#ffffff50" tick={{fill: '#ffffff50', fontSize: 12}} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#ffffff50" tick={{fill: '#ffffff50', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000000e0', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                  formatter={(value) => [`$${Number(value ?? 0).toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="marketValue" name="WETH Hold" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorMarket)" />
                <Area type="monotone" dataKey="agentValue" name="Hawk AI Agent" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorAgent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </main>
  );
}
