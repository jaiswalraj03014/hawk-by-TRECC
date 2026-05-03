<p align="center">
  <img src="./logo.png" width="80" alt="Hawk logo" />
</p>

<h1 align="center">Hawk Developer Feedback</h1>

This document contains our team's direct feedback on the developer experience (DX) of integrating the sponsor technologies for the ETHGlobal Open Agents hackathon.

## Uniswap Foundation (Trading API)

### What Worked Well

The `trade-api.gateway.uniswap.org/v1/quote` endpoint is incredibly fast. The JSON response structure is highly intuitive, making it very easy to parse `EXACT_INPUT` quotes and feed them directly into our Gemini agent's reasoning loop.

### Friction Points & DX Gaps

**Testnet Liquidity & Routing Failures:** We initially attempted to route quotes entirely on the Sepolia testnet (`chainId: 11155111`). However, we frequently encountered "No Route Found" errors due to fragmented testnet liquidity.

- **Our Workaround:** To prevent our AI agent from hallucinating or failing, we had to build a dynamic failover that automatically drops down to an on-chain Chainlink Sepolia price feed when the Uniswap API rate-limits or fails to find a testnet route.
- **Suggestion:** A more robust, Uniswap-hosted public read-only fallback or deeper testnet liquidity mocking would massively improve the hackathon developer experience so we don't have to build secondary oracle failovers just to test our logic.

### What We Wish Existed

An **"Agentic SDK"** wrapper for the Uniswap API. If the API could natively output market quotes formatted as structured intents, ready to be ingested by LLMs like OpenAI/Gemini, it would massively accelerate autonomous DeFi development.

---

## KeeperHub

### What Worked Well

The core architecture of delegating execution to bypass mempool congestion is exactly what AI agents need. It serves perfectly as the "muscle" for our intent-based trading loop.

### Friction Points & DX Gaps

**Integration Examples:** While the concept is solid, the documentation lacked clear, boilerplate examples of how to integrate KeeperHub natively with **ERC-7579 modular smart accounts** and Next.js backend API routes. We had to abstract the execution layer heavily for the demo.

- **Suggestion:** Providing a quick-start repository specifically showing an AI agent backend, such as Next.js or Express, securely handing off an intent to a KeeperHub relayer targeting a smart account would save developers hours of setup time.

---

## 0G Storage

### What Worked Well

0G is incredibly fast for intent logging. We used it to store our "Proof of Intent", the JSON payload containing the AI's market reasoning and confidence score, to solve the agent black-box problem.

### What We Wish Existed

A lightweight, specialized **"Agent Intent" SDK wrapper** for Node/Next.js edge functions. Right now, manual hashing and uploading is required. A one-liner function like `0g.logIntent(jsonPayload)` would make 0G the undisputed standard for AI agent accountability in Web3.
