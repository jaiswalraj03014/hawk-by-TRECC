import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk';
import { ethers } from 'ethers';

// Official 0G Testnet Endpoints
const EVM_RPC = 'https://evmrpc-testnet.0g.ai';
const INDEXER_RPC = 'https://indexer-storage-testnet-turbo.0g.ai';

export async function secureIntentOn0G(intentPayload: any): Promise<{ rootHash: string, txHash: string }> {
    const privateKey = process.env.ZEROG_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("ZEROG_PRIVATE_KEY missing in environment variables.");
    }

    try {
        // 1. Setup Ethers Signer
        const provider = new ethers.JsonRpcProvider(EVM_RPC);
        const signer = new ethers.Wallet(privateKey, provider);

        // 2. Initialize 0G Indexer
        const indexer = new Indexer(INDEXER_RPC);

        // 3. Convert JSON Payload to 0G Memory Data
        const jsonString = JSON.stringify(intentPayload, null, 2);
        const dataBytes = new TextEncoder().encode(jsonString);
        const memData = new MemData(dataBytes);

        // 4. Generate Merkle Tree (Cryptographic Proof)
        const [tree, treeErr] = await memData.merkleTree();
        if (treeErr !== null) {
            throw new Error(`Failed to generate Merkle Tree: ${treeErr}`);
        }

        const rootHash = tree?.rootHash();
        console.log(`[0G LOG] Merkle Root Generated: ${rootHash}`);

        // 5. Execute On-Chain Upload
        const [tx, uploadErr] = await indexer.upload(memData, EVM_RPC, signer);
        if (uploadErr !== null) {
            throw new Error(`0G Storage Upload Failed: ${uploadErr}`);
        }

        console.log(`[0G LOG] Intent Secured! Transaction: ${tx}`);
        
        return {
            rootHash: rootHash || "Unknown",
            txHash: typeof tx === 'string' ? tx : tx.rootHash // Handles different SDK version returns
        };

    } catch (error) {
        console.error("0G Integration Error:", error);
        throw error;
    }
}