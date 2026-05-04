import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk';

// Official Chainlink ETH/USD Price Feed on Sepolia
const CHAINLINK_FEED_ADDRESS = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const chainlinkABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
];

// --- 0G STORAGE LOGIC (Self-Contained) ---
async function secureIntentOn0G(intentPayload: any): Promise<{ rootHash: string, txHash: string }> {
    const privateKey = process.env.ZEROG_PRIVATE_KEY;
    if (!privateKey) throw new Error("ZEROG_PRIVATE_KEY missing in environment variables.");

    const EVM_RPC = 'https://evmrpc-testnet.0g.ai';
    const INDEXER_RPC = 'https://indexer-storage-testnet-turbo.0g.ai';

    const provider = new ethers.JsonRpcProvider(EVM_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const indexer = new Indexer(INDEXER_RPC);

    const jsonString = JSON.stringify(intentPayload, null, 2);
    const dataBytes = new TextEncoder().encode(jsonString);
    const memData = new MemData(dataBytes);

    const [tree, treeErr] = await memData.merkleTree();
    if (treeErr !== null) throw new Error(`Failed to generate Merkle Tree: ${treeErr}`);

    const rootHash = tree?.rootHash();
    console.log(`[0G LOG] Merkle Root Generated: ${rootHash}`);

    const [tx, uploadErr] = await indexer.upload(memData, EVM_RPC, signer);
    if (uploadErr !== null) throw new Error(`0G Storage Upload Failed: ${uploadErr}`);

    console.log(`[0G LOG] Intent Secured! Transaction: ${tx}`);
    
    return {
        rootHash: rootHash || "Unknown",
        txHash: typeof tx === 'string' ? tx : 'txHash' in tx ? tx.txHash : tx.txHashes[0] 
    };
}

// --- CORE AGENT ROUTE ---
export async function GET() {
  try {
    let currentWethPrice = "0.00";

    // 1. ATTEMPT 1: Official Uniswap API
    try {
      const uniswapKey = process.env.NEXT_PUBLIC_UNISWAP_API_KEY;
      const requestBody = {
        type: "EXACT_INPUT",
        tokenInChainId: 1,
        tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", 
        tokenOutChainId: 1,
        tokenOut: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 
        amount: "1000000000000000000" 
      };

      const uniswapRes = await fetch('https://trade-api.gateway.uniswap.org/v1/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': uniswapKey || '' },
        body: JSON.stringify(requestBody)
      });
      
      const uniswapData = await uniswapRes.json();
      if (uniswapData?.quote?.output?.amount) {
        currentWethPrice = (Number(uniswapData.quote.output.amount) / 1000000).toFixed(2);
      } else {
        throw new Error("Uniswap routing failed.");
      }
    } catch (uniswapError) {
      // 2. ATTEMPT 2: Chainlink On-Chain Oracle
      try {
        const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        const priceFeed = new ethers.Contract(CHAINLINK_FEED_ADDRESS, chainlinkABI, provider);
        const roundData = await priceFeed.latestRoundData();
        currentWethPrice = (Number(roundData.answer) / 100000000).toFixed(2);
      } catch (chainlinkError) {
        console.warn("Oracles busy, aborting execution to protect capital.");
        return NextResponse.json({ error: "Market Oracles Offline. Execution Halted." }, { status: 503 });
      }
    }

    // 3. WAKE UP THE AI ENGINE
    const prompt = `
      You are the core intelligence for "Hawk", an autonomous DeFi yield agent.
      Your job is to manage the "Alpha Tranche" which currently holds USDC.
      
      Current Market Data:
      - Asset: WETH
      - Current Price: $${currentWethPrice} USDC
      
      Task: Decide whether to BUY WETH, SELL WETH, or HOLD based on standard crypto volatility logic.
      
      Respond ONLY in this exact JSON format, nothing else:
      {
        "intent": "BUY" | "SELL" | "HOLD",
        "confidence": 0-100,
        "reasoning": "A one sentence explanation of your decision",
        "routing": "KeeperHub"
      }
    `;

    let decision;

    // 4. MULTI-MODEL ROUTING & CIRCUIT BREAKER
    try {
      const openaiKey = process.env.OPENAI_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;

      if (openaiKey) {
        // --- ROUTE A: OPENAI ---
        console.log("Routing intelligence through OpenAI...");
        const openai = new OpenAI({ apiKey: openaiKey });
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Fast, cheap, and excellent at JSON
            messages: [
                { role: "system", content: "You are a specialized DeFi trading algorithm. You output raw JSON only." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" } 
        });

        const responseText = response.choices[0].message.content || "{}";
        decision = JSON.parse(responseText);

      } else if (geminiKey) {
        // --- ROUTE B: GEMINI ---
        console.log("Routing intelligence through Gemini...");
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        decision = JSON.parse(cleanJson);
        
      } else {
        throw new Error("No API keys found for OpenAI or Gemini.");
      }

    } catch (aiError) {
      console.error("AI Core limit hit or offline! Activating Protocol Circuit Breaker...");
      decision = {
        intent: "HOLD",
        confidence: 100,
        reasoning: "SYSTEM SAFE MODE: AI Core offline. Capital preservation active.",
        routing: "None"
      };
    }

    // 5. COMPILE THE INTENT PAYLOAD
    const finalPayload = {
      timestamp: new Date().toISOString(),
      market_data: { weth_price: currentWethPrice },
      agent_decision: decision
    };

    // 6. SECURE PROOF OF INTENT ON 0G
    let storageProof = null;
    try {
        console.log("Pushing Intent to 0G Storage...");
        storageProof = await secureIntentOn0G(finalPayload);
    } catch (storageError) {
        console.error("Failed to upload to 0G. Proceeding with execution anyway.", storageError);
    }

    // 7. RETURN FINAL VERIFIABLE DATA TO FRONTEND
    return NextResponse.json({
      ...finalPayload,
      zero_g_proof: storageProof 
    });

  } catch (error: any) {
    console.error("Agent Execution Failed:", error);
    return NextResponse.json({ error: "Agent offline or misconfigured." }, { status: 500 });
  }
}