import { ethers } from 'ethers';

// Uniswap V3 SwapRouter02 on Sepolia
const SWAP_ROUTER_ADDRESS = "0x3bFA4769FCDA110821b0C8DBF4d90EAC8a38Ff9A"; 
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // Mocked WETH for testnet routing
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // Mocked USDC for testnet routing

const routerAbi = [
    "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

export class KeeperExecution {
    private signer: ethers.Wallet;

    constructor() {
        const privateKey = process.env.ZEROG_PRIVATE_KEY;
        if (!privateKey) throw new Error("Private key required for Keeper Execution");

        const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        // The backend acts as the "Keeper" relaying the transaction
        this.signer = new ethers.Wallet(privateKey, provider); 
    }

    async executeAgentIntent(intent: "BUY" | "SELL" | "HOLD", amountToTradeWei: bigint): Promise<string | null> {
        if (intent === "HOLD") {
            console.log("🛡️ Agent Intent is HOLD. Keeper bypassing execution.");
            return null;
        }

        console.log(`⚡ KEEPER HUB ACTIVE: Initiating ${intent} execution on Uniswap...`);

        try {
            const routerContract = new ethers.Contract(SWAP_ROUTER_ADDRESS, routerAbi, this.signer);

            // Determine routing based on AI decision
            const tokenIn = intent === "BUY" ? USDC : WETH;
            const tokenOut = intent === "BUY" ? WETH : USDC;

            // Prepare the ExactInputSingle parameter tuple
            const params = {
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: 3000, // 0.3% tier
                recipient: this.signer.address, // In full production, this is the Vault address
                amountIn: amountToTradeWei,
                amountOutMinimum: 0, // Slippage set to 0 for hackathon demo simplicity
                sqrtPriceLimitX96: 0
            };

            // Execute the swap!
            const tx = await routerContract.exactInputSingle(params, {
                gasLimit: 300000 // Safe gas buffer for testnet swaps
            });

            console.log(`🔗 Swap Executed! TX Hash: ${tx.hash}`);
            await tx.wait();
            console.log(`✅ Swap Confirmed on Sepolia.`);

            return tx.hash;
        } catch (error) {
            console.error("❌ Keeper Execution Failed:", error);
            return null;
        }
    }
}