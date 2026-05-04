import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk';
import { ethers } from 'ethers';

const EVM_RPC = 'https://evmrpc-testnet.0g.ai';
const INDEXER_RPC = 'https://indexer-storage-testnet-turbo.0g.ai';

// 1. Standalone function used by your Next.js API Route (route.ts)
export async function secureIntentOn0G(intentPayload: any): Promise<{ rootHash: string, txHash: string }> {
    const privateKey = process.env.ZEROG_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("ZEROG_PRIVATE_KEY missing in environment variables.");
    }

    try {
        const provider = new ethers.JsonRpcProvider(EVM_RPC);
        const signer = new ethers.Wallet(privateKey, provider);
        const indexer = new Indexer(INDEXER_RPC);

        const jsonString = JSON.stringify(intentPayload, null, 2);
        const dataBytes = new TextEncoder().encode(jsonString);
        const memData = new MemData(dataBytes);

        const [tree, treeErr] = await memData.merkleTree();
        if (treeErr !== null) {
            throw new Error(`Failed to generate Merkle Tree: ${treeErr}`);
        }

        const rootHash = tree?.rootHash();
        console.log(`[0G LOG] Merkle Root Generated: ${rootHash}`);

        const [tx, uploadErr] = await indexer.upload(memData, EVM_RPC, signer);
        if (uploadErr !== null) {
            throw new Error(`0G Storage Upload Failed: ${uploadErr}`);
        }

        console.log(`[0G LOG] Intent Secured! Transaction: ${tx}`);
        
        return {
            rootHash: rootHash || "Unknown",
            txHash: typeof tx === 'string' ? tx : tx.rootHash 
        };

    } catch (error) {
        console.error("0G Integration Error:", error);
        throw error;
    }
}

// 2. Class wrapper used by your autonomous engine (index.ts)
export class ZeroGMemory {
    async logIntent(intentPayload: any): Promise<string> {
        try {
            // We just call the function above so we don't repeat code!
            const result = await secureIntentOn0G(intentPayload);
            return result.txHash;
        } catch (error) {
            console.error("ZeroGMemory Class Error:", error);
            return "0xError";
        }
    }
}