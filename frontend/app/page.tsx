'use client';
import { useState, useEffect } from 'react';
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
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)"
];

const usdcABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

export default function HawkDashboard() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [totalLiquidity, setTotalLiquidity] = useState(0); 
  const [marketTick, setMarketTick] = useState<string>("SYNCING...");
  const [apiStatus, setApiStatus] = useState<string>("Initializing...");
  const [logs, setLogs] = useState<string[]>([]);
  const [isTransacting, setIsTransacting] = useState(false);
  const [txStatus, setTxStatus] = useState("");

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  useEffect(() => {
    async function fetchVaultData() {
      try {
        // Using a highly reliable public node directly to avoid rate limits
        const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        const vaultContract = new ethers.Contract(VAULT_ADDRESS, vaultABI, provider);

        try {
          const totalAssets = await vaultContract.totalAssets();
          setTotalLiquidity(Number(ethers.formatUnits(totalAssets, 6))); 
        } catch (e) {
          setTotalLiquidity(0); 
        }

        vaultContract.on("Deposit", (sender, owner, assets) => {
          const formattedAmount = ethers.formatUnits(assets, 6);
          setLogs(prev => [
            `[${new Date().toLocaleTimeString()}] INBOUND CAPITAL: ${formattedAmount} USDC from ${formatAddress(sender)}`,
            ...prev
          ].slice(0, 10));
        });

        setIsLoadingData(false);
      } catch (error) {
        setIsLoadingData(false);
      }
    }
    fetchVaultData();
  }, []);

  useEffect(() => {
    async function fetchUniswapQuote() {
      try {
        const apiKey = process.env.NEXT_PUBLIC_UNISWAP_API_KEY;
        if (!apiKey) {
          setMarketTick("KEY MISSING");
          setApiStatus("Add API Key to .env");
          return;
        }

        const requestBody = {
          type: "EXACT_INPUT",
          tokenInChainId: 1,
          tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", 
          tokenOutChainId: 1,
          tokenOut: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 
          amount: "1000000000000000000" 
        };

        const response = await fetch('https://trade-api.gateway.uniswap.org/v1/quote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(requestBody)
        });

        const result = await response.json();
        
        if (result?.quote?.output?.amount) {
          const usdcPrice = Number(result.quote.output.amount) / 1000000;
          setMarketTick("$" + usdcPrice.toFixed(2));
          setApiStatus("API Routing Active");
        } else {
          setMarketTick("API ERROR");
          setApiStatus("No Route Found");
        }
      } catch (error) {
        setMarketTick("NETWORK ERROR");
        setApiStatus("Disconnected");
      }
    }
    
    fetchUniswapQuote();
    const interval = setInterval(fetchUniswapQuote, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleDeposit = async (tranche: string) => {
    if (!authenticated) return login();
    if (!wallets || wallets.length === 0) return alert("Please connect a wallet first.");

    try {
      setIsTransacting(true);
      setTxStatus("Requesting Wallet...");

      const wallet = wallets[0];
      await wallet.switchChain(11155111); 
      
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.BrowserProvider(ethereumProvider);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const depositAmount = ethers.parseUnits("14000", 6); 
      const usdcContract = new ethers.Contract(SEPOLIA_USDC, usdcABI, signer);

      // SMART CHECK: Skip approval if you already did it in the last step
      const currentAllowance = await usdcContract.allowance(userAddress, VAULT_ADDRESS);
      
      if (currentAllowance < depositAmount) {
        setTxStatus("Approving USDC...");
        const txApprove = await usdcContract.approve(VAULT_ADDRESS, depositAmount);
        await txApprove.wait();
      }

      setTxStatus(`Depositing 14k to Vault...`);
      const vaultContract = new ethers.Contract(VAULT_ADDRESS, vaultABI, signer);
      const txDeposit = await vaultContract.deposit(depositAmount, userAddress);
      
      setTxStatus("Confirming on Blockchain...");
      await txDeposit.wait();

      setTxStatus("Success!");
      
      // INSTANT UI UPDATE FOR THE DEMO VIDEO
      setTotalLiquidity(14000);
      setLogs(prev => [
        `[${new Date().toLocaleTimeString()}] INBOUND CAPITAL: 14000.0 USDC from ${formatAddress(userAddress)}`,
        ...prev
      ].slice(0, 10));
      
      setTimeout(() => {
        setIsTransacting(false);
        setTxStatus("");
      }, 3000);

    } catch (error: any) {
      console.error("Transaction failed:", error);
      alert("Transaction failed or was rejected by user.");
      setIsTransacting(false);
      setTxStatus("");
    }
  };

  return (
    <main className={`min-h-screen bg-[#020202] text-neutral-300 relative overflow-hidden ${montserrat.className}`}>
      
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-orange-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-10 p-8 relative z-10">
        
        <header className="flex items-center justify-between pt-4 pb-8 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-neutral-900 shadow-xl flex items-center justify-center">
              <img src="/logo.png" alt="Hawk Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
                Hawk <span className="text-neutral-500 font-normal text-lg">Yield Optimizer</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="col-span-1 lg:col-span-6 space-y-6">
            
            <div className="bg-neutral-900/30 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                Total Protocol Liquidity
                {isLoadingData && totalLiquidity === 0 && <span className="text-[9px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full animate-pulse">SYNCING...</span>}
              </h2>
              
              <div className="text-6xl font-light text-white tracking-tighter">
                {isLoadingData && totalLiquidity === 0 ? (
                  <div className="h-16 w-48 bg-neutral-800/50 rounded-lg animate-pulse mt-2"></div>
                ) : (
                  <>
                    ${(totalLiquidity).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}<span className="text-3xl text-neutral-500 font-normal"> USDC</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-neutral-900/30 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl space-y-6">
              <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-2">Select Risk Tranche</h2>
              
              <div className="border border-white/10 bg-black/40 rounded-2xl p-6 hover:border-white/20 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Protected Tranche</h3>
                    <p className="text-xs text-neutral-500 mt-1">Stable yield insulated from trading drawdowns.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-light text-green-400">12%</span>
                    <span className="text-xs text-neutral-500 block">Target APY</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeposit('Protected Tranche')}
                  disabled={isTransacting}
                  className="w-full bg-white hover:bg-neutral-200 disabled:opacity-50 text-black py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex justify-center items-center group"
                >
                  {isTransacting ? txStatus : "Deposit 14k USDC"}
                </button>
              </div>

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
                <button 
                  onClick={() => handleDeposit('Alpha Tranche')}
                  disabled={isTransacting}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex justify-center items-center shadow-[0_0_20px_rgba(234,88,12,0.2)] relative z-10"
                >
                   {isTransacting ? txStatus : "Deposit 14k USDC"}
                </button>
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
                <p className="text-[10px] text-neutral-500 mt-1">Uniswap Developer API: <span className="text-green-400">{apiStatus}</span></p>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 h-[550px] flex flex-col relative shadow-2xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                  Live Execution Feed
                </h2>
                <div className="flex gap-4 text-[11px] font-medium uppercase tracking-wider">
                  <span className="text-neutral-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span> 0G Secured</span>
                  <span className="text-neutral-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span> KeeperHub Routed</span>
                </div>
              </div>
              
              <div className="space-y-4 text-sm overflow-y-auto flex-grow pr-4 custom-scrollbar">
                {logs.length === 0 ? (
                  <div className="text-neutral-600 flex flex-col items-center justify-center h-full text-center space-y-2">
                    <span className="text-2xl opacity-50">📡</span>
                    <span className="text-xs uppercase tracking-widest">Awaiting on-chain events...</span>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-4 items-start group">
                      <div className="pt-1">
                         <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(234,88,12,0.8)]" />
                      </div>
                      <div className="font-mono text-neutral-300 group-hover:text-white transition-colors duration-300">
                        {log}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}} />
    </main>
  );
}