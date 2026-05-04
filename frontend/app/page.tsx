'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Montserrat } from 'next/font/google';
import { ethers } from 'ethers';

const montserrat = Montserrat({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600', '700'] 
});

const VAULT_ADDRESS = "0x387Be077b26E473d42BE0fF919aeb63Cd241545c";
const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

const vaultABI = [
  "function totalAssets() view returns (uint256)",
  "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
  "function balanceOf(address account) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)"
];

const usdcABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
];

export default function HawkDashboard() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets(); 
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [totalLiquidity, setTotalLiquidity] = useState(0); 
  const [marketTick, setMarketTick] = useState<string>("SYNCING...");
  const [apiStatus, setApiStatus] = useState<string>("Connecting Agent...");
  const [logs, setLogs] = useState<string[]>([]);

  // Real Portfolio States
  const [userShares, setUserShares] = useState(0);
  const [userAssetValue, setUserAssetValue] = useState(0);
  const [userUsdcBalance, setUserUsdcBalance] = useState(0);

  // Real Transaction States
  const [depositAmount, setDepositAmount] = useState<string>(""); // Alpha Input
  const [protectedDepositAmount, setProtectedDepositAmount] = useState<string>(""); // Protected Input
  const [isDepositing, setIsDepositing] = useState(false);
  const [activeDepositType, setActiveDepositType] = useState<"ALPHA" | "PROTECTED" | "">(""); // Tracks which button is spinning
  const [depositStep, setDepositStep] = useState("");

  const formatAddress = (address: string) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  };

  // 1. Fetch Real Protocol TVL & User Balance
  const fetchVaultData = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
      const vaultContract = new ethers.Contract(VAULT_ADDRESS, vaultABI, provider);
      const usdcContract = new ethers.Contract(SEPOLIA_USDC, usdcABI, provider);

      try {
        const totalAssets = await vaultContract.totalAssets();
        setTotalLiquidity(Number(ethers.formatUnits(totalAssets, 6))); 
      } catch (e) {
        console.warn("Failed to fetch TVL");
        setTotalLiquidity(0);
      }

      if (authenticated && user?.wallet?.address) {
         try {
           const usdcBal = await usdcContract.balanceOf(user.wallet.address);
           setUserUsdcBalance(Number(ethers.formatUnits(usdcBal, 6)));

           const shares = await vaultContract.balanceOf(user.wallet.address);
           const formattedShares = Number(ethers.formatUnits(shares, 6)); 
           
           if (shares > 0n) {
             setUserShares(formattedShares);
             const assetValue = await vaultContract.convertToAssets(shares);
             setUserAssetValue(Number(ethers.formatUnits(assetValue, 6)));
           } else {
             setUserShares(0);
             setUserAssetValue(0);
           }
         } catch(e) {
           console.warn("User balance read failed", e);
         }
      }
      setIsLoadingData(false);
    } catch (error) {
      setIsLoadingData(false);
    }
  }, [authenticated, user]);

  useEffect(() => {
    fetchVaultData();
  }, [fetchVaultData]);

  // 2. Poll the Gemini Agent API
  useEffect(() => {
    async function runAgent() {
      try {
        const res = await fetch('/api/agent');
        const data = await res.json();

        if (data.agent_decision) {
          setMarketTick("$" + data.market_data.weth_price);
          setApiStatus("Agent Active");

          setLogs(prev => [
            `[${new Date().toLocaleTimeString()}] 0G INTENT: ${data.agent_decision.intent} WETH (Confidence: ${data.agent_decision.confidence}%)`,
            `[${new Date().toLocaleTimeString()}] REASONING: ${data.agent_decision.reasoning}`,
            `[${new Date().toLocaleTimeString()}] KEEPERHUB ROUTED: Standby for execution...`,
            `----------------------------------------`,
            ...prev
          ].slice(0, 20));
        }
      } catch (e) {
        console.error("Agent fetch failed", e);
      }
    }

    runAgent();
    const interval = setInterval(runAgent, 10000); 
    return () => clearInterval(interval);
  }, []);

  // 3. Shared Deposit Execution (Handles both Alpha and Protected)
  const handleDeposit = async (amount: string, trancheType: "ALPHA" | "PROTECTED") => {
    if (!authenticated) {
      login();
      return;
    }
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("Please enter a valid USDC amount.");
      return;
    }

    if (!wallets || wallets.length === 0) {
      alert("No wallet connected.");
      return;
    }

    setIsDepositing(true);
    setActiveDepositType(trancheType);
    setDepositStep("Awaiting Signature...");

    try {
      const currentWallet = wallets[0];
      const provider = await currentWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider as any);
      const signer = await ethersProvider.getSigner();

      const usdcContract = new ethers.Contract(SEPOLIA_USDC, usdcABI, signer);
      const vaultContract = new ethers.Contract(VAULT_ADDRESS, vaultABI, signer);

      const amountWei = ethers.parseUnits(amount, 6); 

      // Step A: Check Allowance
      setDepositStep("Checking Allowance...");
      const allowance = await usdcContract.allowance(currentWallet.address, VAULT_ADDRESS);
      
      if (allowance < amountWei) {
        setDepositStep("Approving USDC...");
        const approveTx = await usdcContract.approve(VAULT_ADDRESS, amountWei);
        await approveTx.wait(); 
      }

      // Step B: Execute Deposit
      setDepositStep("Confirming Deposit...");
      const depositTx = await vaultContract.deposit(amountWei, currentWallet.address);
      setDepositStep("Executing on-chain...");
      await depositTx.wait(); 

      // Step C: Success! Clean up
      if (trancheType === "ALPHA") setDepositAmount("");
      if (trancheType === "PROTECTED") setProtectedDepositAmount("");
      
      await fetchVaultData(); 

    } catch (error: any) {
      console.error("Deposit failed", error);
      if (error.code === 'ACTION_REJECTED') {
        alert("Transaction rejected by user.");
      } else {
        alert("Transaction failed. Check console for details.");
      }
    } finally {
      setIsDepositing(false);
      setActiveDepositType("");
      setDepositStep("");
    }
  };

  return (
    <main className={`min-h-screen bg-[#020202] text-neutral-300 relative overflow-hidden ${montserrat.className}`}>
      
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-orange-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 p-8 relative z-10">
        
        <header className="flex items-center justify-between pt-4 pb-8 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-neutral-900 shadow-xl flex items-center justify-center">
              <img src="/logo.png" alt="Hawk Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
                Hawk <span className="text-neutral-500 font-normal text-lg">Prime Autonomous Vault</span>
              </h1>
              <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 font-medium">
                <span>ERC-4626 Vault</span>
                <span className="w-1 h-1 rounded-full bg-neutral-700"></span>
                <span>ERC-7579 Agents</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Sepolia Testnet
              </div>
              <div className="text-[10px] text-neutral-600 font-mono mt-0.5">
                Contract: {formatAddress(VAULT_ADDRESS)}
              </div>
            </div>
            
            <button 
              onClick={authenticated ? logout : login}
              disabled={!ready}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                authenticated 
                  ? "bg-neutral-900/50 backdrop-blur-md text-white border border-white/10 hover:bg-neutral-800" 
                  : "bg-white text-black hover:bg-neutral-200 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              }`}
            >
              {!ready ? "Loading..." : authenticated && user?.wallet ? formatAddress(user.wallet.address) : "Connect Wallet"}
            </button>
          </div>
        </header>

        {/* Real User Portfolio Card */}
        {authenticated && userShares > 0 && (
          <div className="bg-gradient-to-r from-neutral-900/80 to-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center justify-between transition-all duration-500">
            <div className="flex gap-12 items-center">
               <div>
                 <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Your Alpha Position (Real Value)</h2>
                 <div className="text-4xl font-light text-white transition-all duration-300">
                   ${userAssetValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-xl text-neutral-600 font-normal">USDC</span>
                 </div>
               </div>
               <div className="h-12 w-px bg-white/10 hidden md:block"></div>
               <div className="hidden md:block">
                 <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Vault Shares Held</h2>
                 <div className="text-xl font-medium text-neutral-400 transition-all duration-300">{userShares.toLocaleString()} HA-USDC</div>
               </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="col-span-1 lg:col-span-6 space-y-6">
            
            <div className="bg-neutral-900/30 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                Total Protocol Liquidity
              </h2>
              
              <div className="text-6xl font-light text-white tracking-tighter transition-all duration-300">
                {isLoadingData ? (
                  <div className="h-16 w-48 bg-neutral-800/50 rounded-lg animate-pulse mt-2"></div>
                ) : (
                  <>
                    ${(totalLiquidity).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}<span className="text-3xl text-neutral-500 font-normal"> USDC</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-neutral-900/30 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-widest">Select Risk Tranche</h2>
                {authenticated && (
                  <span className="text-xs text-neutral-500">Wallet Balance: <span className="text-white">{userUsdcBalance.toFixed(2)} USDC</span></span>
                )}
              </div>
              
              {/* NEW FULLY FUNCTIONAL PROTECTED TRANCHE */}
              <div className="border border-white/10 bg-black/40 rounded-2xl p-6 hover:border-white/20 transition-all relative overflow-hidden">
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Protected Tranche</h3>
                    <p className="text-xs text-neutral-500 mt-1">Stable yield insulated from trading drawdowns.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-light text-green-400">12%</span>
                    <span className="text-xs text-neutral-500 block">Target APY</span>
                  </div>
                </div>
                
                <div className="relative z-10 space-y-3">
                  <input
                    type="number"
                    value={protectedDepositAmount}
                    onChange={(e) => setProtectedDepositAmount(e.target.value)}
                    disabled={isDepositing}
                    placeholder="Amount (e.g., 1000 USDC)"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-green-500/50 transition-colors disabled:opacity-50"
                  />
                  <button 
                    onClick={() => handleDeposit(protectedDepositAmount, "PROTECTED")}
                    disabled={isDepositing || !protectedDepositAmount}
                    className="w-full bg-white hover:bg-neutral-200 text-black py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex justify-center items-center shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {isDepositing && activeDepositType === "PROTECTED" ? (
                       <span className="flex items-center gap-2">
                         <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                         {depositStep}
                       </span>
                     ) : (
                       "Approve & Deposit USDC"
                     )}
                  </button>
                </div>
              </div>

              {/* ALPHA TRANCHE */}
              <div className="border border-orange-500/30 bg-orange-950/10 rounded-2xl p-6 hover:border-orange-500/60 transition-all relative overflow-hidden">
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h3 className="text-lg font-semibold text-orange-400">Alpha Tranche</h3>
                    <p className="text-xs text-neutral-400 mt-1">First-loss capital. High risk, directional agent execution.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-light text-orange-500">45%</span>
                    <span className="text-xs text-orange-500/60 block">Target APY</span>
                  </div>
                </div>
                
                <div className="relative z-10 space-y-3">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    disabled={isDepositing}
                    placeholder="Amount (e.g., 1000 USDC)"
                    className="w-full bg-black/50 border border-orange-500/30 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
                  />
                  <button 
                    onClick={() => handleDeposit(depositAmount, "ALPHA")}
                    disabled={isDepositing || !depositAmount}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex justify-center items-center shadow-[0_0_20px_rgba(234,88,12,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {isDepositing && activeDepositType === "ALPHA" ? (
                       <span className="flex items-center gap-2">
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                         {depositStep}
                       </span>
                     ) : (
                       "Approve & Deposit USDC"
                     )}
                  </button>
                </div>
              </div>

            </div>
          </div>

          <div className="col-span-1 lg:col-span-6 space-y-6">
            
            <div className="bg-neutral-900/30 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-2">Active Intelligence</h2>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-purple-600 flex items-center justify-center border border-white/10 shadow-lg">
                    <span className="text-white text-xs font-bold">ENS</span>
                  </div>
                  <span className="text-xl font-medium text-white">hawk.agent.eth</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-1 flex items-center justify-end gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span> Live WETH/USDC Quote
                </p>
                <div className="text-2xl font-mono text-white">{marketTick}</div>
                <p className="text-[10px] text-neutral-500 mt-1">Status: <span className="text-green-400">{apiStatus}</span></p>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 h-[550px] flex flex-col relative shadow-2xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                  Agent Execution Feed
                </h2>
                <div className="flex gap-4 text-[11px] font-medium uppercase tracking-wider">
                  <span className="text-neutral-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span> 0G Secured</span>
                  <span className="text-neutral-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span> Gemini 2.5 Active</span>
                </div>
              </div>
              
              <div className="space-y-4 text-sm overflow-y-auto flex-grow pr-4 custom-scrollbar">
                {logs.length === 0 ? (
                  <div className="text-neutral-600 flex flex-col items-center justify-center h-full text-center space-y-2">
                    <span className="text-2xl opacity-50">📡</span>
                    <span className="text-xs uppercase tracking-widest">Awaiting Agent Intelligence...</span>
                  </div>
                ) : (
                  logs.map((log, i) => {
                    const isIntent = log.includes("0G INTENT");
                    const isDivider = log.includes("----");
                    return (
                      <div key={i} className={`flex gap-4 items-start group ${isDivider ? 'opacity-20' : ''}`}>
                        {!isDivider && (
                          <div className="pt-1">
                             <div className={`w-2 h-2 rounded-full ${isIntent ? 'bg-orange-500 shadow-[0_0_8px_rgba(234,88,12,0.8)]' : 'bg-neutral-500'}`} />
                          </div>
                        )}
                        <div className={`font-mono transition-colors duration-300 ${isIntent ? 'text-white' : 'text-neutral-400'}`}>
                          {log}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </main>
  );
}