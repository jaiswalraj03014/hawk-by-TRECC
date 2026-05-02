import { ethers } from 'ethers';

// We only need the specific functions to read the pool's current state
const IUniswapV3PoolABI = [
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function liquidity() external view returns (uint128)"
];

export class UniswapInterface {
    private poolContract: ethers.Contract;

    constructor(poolAddress: string, provider: ethers.Provider) {
        this.poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, provider);
    }

    async getPoolState() {
        try {
            const [slot0, liquidity] = await Promise.all([
                this.poolContract.slot0(),
                this.poolContract.liquidity()
            ]);

            return {
                tick: Number(slot0.tick),
                sqrtPriceX96: slot0.sqrtPriceX96.toString(),
                liquidity: liquidity.toString()
            };
        } catch (error) {
            console.error("❌ Failed to fetch pool state from Uniswap:", error);
            throw error;
        }
    }
}