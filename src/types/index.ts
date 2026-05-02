export interface IntentPacket {
    timestamp: number;
    agentId: string;
    trigger: string;
    poolAddress: string;
    strategy: {
        action: 'REBALANCE' | 'WITHDRAW' | 'SWAP';
        newLowerTick: number;
        newUpperTick: number;
        reasoning: string;
    };
    zeroGHash?: string;
}