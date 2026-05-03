import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { UniswapInterface } from './modules/UniswapInterface';
import { ZeroGMemory } from './modules/ZeroGMemory';
import { KeeperExecution } from './modules/KeeperExecution';
import { VaultManager } from './modules/VaultManager'; // <-- 1. Import the Vault

dotenv.config();

async function startHawk() {
    console.log("🦅 Booting Hawk (by TRECC) Engine...");

    const rpcUrl = process.env.RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/Tsb0IJiTtkh6v0qIJ07oz";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const poolAddress = "0x287B0e934ed0439E2a7b1d5F0FC25eA2c24b64f7"; 
    
    const watcher = new UniswapInterface(poolAddress, provider);
    const memory = new ZeroGMemory();
    const keeper = new KeeperExecution();
    const vault = new VaultManager(); // <-- 2. Initialize the Vault

    console.log(`✅ Connected to RPC: ${rpcUrl}`);
    console.log(`📡 Watching Uniswap V3 Pool: ${poolAddress}\n`);

    setInterval(async () => {
        try {
            const state = await watcher.getPoolState();
            console.log(`[${new Date().toLocaleTimeString()}] Live Tick: ${state.tick} | Liquidity: ${state.liquidity}`);

            const isOutOfRange = true; // Mock trigger

            if (isOutOfRange) {
                
                // <-- 3. NEW: Check Vault Health BEFORE doing anything
                const isAuthorized = await vault.verifySandboxHealth();
                
                if (!isAuthorized) {
                    console.log("🛑 Agent execution halted by Vault.");
                    return; // Stop the loop here if the bond is dead
                }

                const intent = {
                    timestamp: Date.now(),
                    agentId: "hawk.agent.eth",
                    trigger: `Price volatility detected at tick ${state.tick}. Liquidity out of bounds.`,
                    poolAddress: poolAddress,
                    strategy: {
                        action: 'REBALANCE' as const,
                        newLowerTick: state.tick - 200,
                        newUpperTick: state.tick + 200,
                        reasoning: "Protecting yield. Recalculating bounds."
                    }
                };

                const logHash = await memory.logIntent(intent);
                await keeper.executeRebalance(poolAddress, logHash);
                
                console.log("🦅 Hawk is returning to observation mode...\n");
            }
        } catch (error) {
            console.error("Engine loop error:", error);
        }
    }, 15000); // Running every 15 seconds for testing
}

startHawk();