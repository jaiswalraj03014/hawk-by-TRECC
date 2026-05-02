import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { KeeperExecution } from './modules/KeeperExecution';
import { UniswapInterface } from './modules/UniswapInterface';
import { ZeroGMemory } from './modules/ZeroGMemory';

dotenv.config();

async function startHawk() {
    console.log("🦅 Booting Hawk (by TRECC) Engine...");

    // Fallback to a public RPC if you haven't set one in your .env yet
    const rpcUrl = process.env.RPC_URL || "https://eth.llamarpc.com";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Watching the Mainnet USDC/ETH 0.05% pool
    const poolAddress = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640"; 
    
    const watcher = new UniswapInterface(poolAddress, provider);
    const memory = new ZeroGMemory();
    const keeper = new KeeperExecution();

    console.log(`✅ Connected to RPC: ${rpcUrl}`);
    console.log(`📡 Watching Uniswap V3 Pool: ${poolAddress}\n`);

    // The Main Event Loop (runs every 10 seconds for testing)
    setInterval(async () => {
        try {
            const state = await watcher.getPoolState();
            console.log(`[${new Date().toLocaleTimeString()}] Live Tick: ${state.tick} | Liquidity: ${state.liquidity}`);

            // MOCK LOGIC: We will pretend the pool just fell out of our target range
            const isOutOfRange = true; 

            if (isOutOfRange) {
                const intent = {
                    timestamp: Date.now(),
                    agentId: "hawk.agent.eth",
                    trigger: `Price volatility detected at tick ${state.tick}. Liquidity out of bounds.`,
                    poolAddress: poolAddress,
                    strategy: {
                        action: 'REBALANCE' as const,
                        newLowerTick: state.tick - 200,
                        newUpperTick: state.tick + 200,
                        reasoning: "Protecting yield. Recalculating concentrated liquidity bounds based on current tick."
                    }
                };

                // Trigger the Brain
                const logHash = await memory.logIntent(intent);

                // Trigger the Execution
                const txHash = await keeper.executeRebalance(poolAddress, logHash);
                console.log("🦅 Hawk is returning to observation mode...\n");   
            }
        } catch (error) {
            console.error("Engine loop error:", error);
        }
    }, 10000); 
}

startHawk();