import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function GET() {
  try {
    // 1. Fetch real market data from Uniswap to feed the agent
    const uniswapKey = process.env.NEXT_PUBLIC_UNISWAP_API_KEY;
    const requestBody = {
      type: "EXACT_INPUT",
      tokenInChainId: 1,
      tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      tokenOutChainId: 1,
      tokenOut: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      amount: "1000000000000000000" // 1 WETH
    };

    const uniswapRes = await fetch('https://trade-api.gateway.uniswap.org/v1/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': uniswapKey || '' },
      body: JSON.stringify(requestBody)
    });
    
    const uniswapData = await uniswapRes.json();
    const currentWethPrice = uniswapData?.quote?.output?.amount 
      ? (Number(uniswapData.quote.output.amount) / 1000000).toFixed(2)
      : "3050.00"; // Fallback just in case

    // 2. Wake up Gemini and give it its identity
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
      You are the core intelligence for "Hawk", an autonomous DeFi Prime Brokerage agent.
      Your job is to manage the "Alpha Tranche" which currently has 14,000 USDC.
      
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

    // 3. Get the Agent's decision
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean up the response in case Gemini wraps it in markdown blocks
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const decision = JSON.parse(cleanJson);

    // 4. Return the decision to the frontend
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      market_data: { weth_price: currentWethPrice },
      agent_decision: decision
    });

  } catch (error: any) {
    console.error("Agent Execution Failed:", error);
    return NextResponse.json({ error: "Agent offline or misconfigured." }, { status: 500 });
  }
}