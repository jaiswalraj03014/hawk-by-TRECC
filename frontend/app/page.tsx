'use client';
import { useState, useEffect } from 'react';

export default function HawkDashboard() {
  const [tick, setTick] = useState(34802);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Vault States
  const [seniorCapital, setSeniorCapital] = useState(2500000); // $2.5M
  const [operatorBond, setOperatorBond] = useState(150000);   // $150k

  // Simulating the backend feed for the UI
  useEffect(() => {
    const interval = setInterval(() => {
      const newHash = "0x" + Math.random().toString(16).slice(2, 20) + "...";
      const keeperHash = "0x" + Math.random().toString(16).slice(2, 20) + "...";
      
      setLogs(prev => [
        `[${new Date().toLocaleTimeString()}] 🧠 Intent Secured (0G): ${newHash}`,
        `[${new Date().toLocaleTimeString()}] 🚀 KeeperHub Executed: ${keeperHash}`,
        ...prev
      ].slice(0, 8));
      
      setTick(prev => prev + Math.floor(Math.random() * 10 - 5));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDeposit = () => alert("Initiating ERC-4626 Deposit...");

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-300 p-8 font-mono">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-neutral-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded overflow-hidden border border-orange-500/30">
              <img src="/logo.png" alt="Hawk Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                TRECC <span className="text-orange-500">Prime Brokerage</span>
              </h1>
              <p className="text-sm text-neutral-500 mt-1">ERC-4626 Vault • ERC-7579 Agent Containment</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-sm bg-neutral-900 px-4 py-2 rounded border border-neutral-800">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Network: Sepolia Testnet
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: The Vault & Tranches (User Onboarding) */}
          <div className="col-span-1 lg:col-span-5 space-y-6">
            
            {/* Vault Overview */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="text-8xl">🏦</span>
              </div>
              <h2 className="text-sm font-semibold text-neutral-400 mb-2 uppercase tracking-wider">Total Vault Liquidity</h2>
              <div className="text-4xl font-light text-white mb-6">
                ${((seniorCapital + operatorBond) / 1000000).toFixed(2)}M
              </div>

              {/* Tranche Visualizer */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-blue-400 font-bold">Senior Tranche (Lenders)</span>
                    <span className="text-white">${(seniorCapital).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">Insulated from trading drawdowns. Target APY: 12%</p>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-orange-400 font-bold">Junior Tranche (Operator Bond)</span>
                    <span className="text-white">${(operatorBond).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">First-loss capital. Slashed if agent hallucinates.</p>
                </div>
              </div>
            </div>

            {/* Deposit Actions */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 shadow-xl">
              <h2 className="text-sm font-semibold text-neutral-400 mb-4 uppercase tracking-wider">Funding Portal</h2>
              
              <div className="space-y-4">
                <button 
                  onClick={handleDeposit}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded text-sm font-bold transition-colors flex justify-between px-4 items-center"
                >
                  <span>Deposit USDC (Lender)</span>
                  <span className="text-blue-200 font-normal">No Execution Risk</span>
                </button>

                <button 
                  onClick={handleDeposit}
                  className="w-full bg-neutral-800 hover:bg-neutral-700 border border-orange-500/50 text-orange-400 py-3 rounded text-sm font-bold transition-colors flex justify-between px-4 items-center"
                >
                  <span>Post ETH Bond (Operator)</span>
                  <span className="text-orange-600 font-normal">Unlock Sandbox</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Active Agent Execution */}
          <div className="col-span-1 lg:col-span-7 space-y-6">
            
            {/* Active Strategy Header */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 shadow-xl flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-1">Active Sandbox Agent</h2>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                  hawk.agent.eth
                  <span className="bg-orange-500/20 text-orange-400 text-[10px] px-2 py-0.5 rounded border border-orange-500/30">ERC-8004 Verified</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-500 mb-1">Live ETH/USDC Tick</p>
                <div className="text-2xl font-light text-white">{tick}</div>
              </div>
            </div>

            {/* Execution Logs */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 h-[400px] shadow-xl flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Live Verifiable Execution</h2>
                <div className="flex gap-2 text-xs">
                  <span className="bg-orange-500/10 text-orange-400 px-2 py-1 rounded">0G Proof of Intent</span>
                  <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded">KeeperHub Routing</span>
                </div>
              </div>
              
              <div className="space-y-3 font-mono text-xs overflow-y-auto flex-grow pr-2">
                {logs.map((log, i) => (
                  <div key={i} className="p-3 bg-black/40 rounded border border-neutral-800/50 text-neutral-400">
                    {log}
                  </div>
                ))}
                {logs.length === 0 && <div className="text-neutral-600 italic">Awaiting market volatility to trigger rebalance...</div>}
              </div>
            </div>

          </div>

        </div>
      </div>
    </main>
  );
}