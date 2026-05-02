<table>
  <tr>
    <td style="padding: 0; border: none;">
      <img src="./logo.png" width="50" style="border-radius: 12px;" />
    </td>
    <td style="padding: 0; border: none; vertical-align: middle;">
      <h1 style="margin: 0;">Hawk (by <a href="https://trecc.finance" style="color: #FF6B00; text-decoration: none;">TRECC</a>)</h1>
    </td>
  </table>
</table>

### *Verifiable, Autonomous Liquidity Management*

**Hawk** is an institutional-grade trading agent designed for the [Open Agents Hackathon 2026](https://ethglobal.com/events/openagents). It solves the "Black Box" problem of AI agents by enforcing a **Proof of Intent (PoI)**—logging every decision immutably to **0G Storage** before executing optimized concentrated liquidity rebalances on **Uniswap V3** via **KeeperHub**.

---

## The USP: "Accountable AI"

Current DeFi agents trade in the dark. If an agent loses money, the user has no way to audit the "why."

**Hawk changes this:**

- **Immutable Audit Trail:** No trade happens without a corresponding "Trade Thesis" stored on 0G.
- **Guaranteed Execution:** Uses KeeperHub to bypass mempool congestion and MEV front-running.
- **Professional Identity:** Operates under `hawk.agent.eth` for verifiable onchain reputation.

---

## Tech Stack & Prize Integrations

| Protocol | Role | Prize Target |
| :--- | :--- | :--- |
| **[0G](https://ethglobal.com/events/openagents/prizes#0g)** | **The Memory:** Stores the "Proof of Intent" (PoI) JSON packets, ensuring every autonomous action is verifiable and auditable. | $15,000 |
| **[Uniswap Foundation](https://ethglobal.com/events/openagents/prizes#uniswap-foundation)** | **The Market:** Utilizes the Uniswap V3 SDK for precision concentrated liquidity management and price discovery. | $5,000 |
| **[KeeperHub](https://ethglobal.com/events/openagents/prizes#keeperhub)** | **The Muscle:** Handles the heavy lifting of execution, ensuring rebalances land during high volatility with automated retry logic. | $5,000 |
| **[ENS](https://ethglobal.com/events/openagents/prizes#ens)** | **The Identity:** Resolves the agent's human-readable name and stores 0G memory pointers in text records. | $5,000 |

---

## Architecture Flow

<img src="./diagram.png" alt="Architecture Flow Diagram" style="width: 100%; max-width: 800px; border-radius: 8px;" />

1. **Monitor:** Hawk tracks [Uniswap V3](https://uniswap.org) pool ticks to identify when liquidity is "Out of Range."
2. **Analyze:** The core engine calculates the optimal new price range for maximum fee accumulation.
3. **Log (0G):** Hawk generates a signed **Intent Packet** and uploads it to [0G Storage](https://0g.ai). This creates a permanent link between the "Thought" and the "Trade."
4. **Execute (KeeperHub):** Once the 0G hash is received, Hawk triggers [KeeperHub](https://keeperhub.com) to move the liquidity onchain.

---

## Repository Structure

```text
src/
├── core/
│   ├── HawkEngine.ts       # Main monitoring & decision loop
│   └── StrategyManager.ts  # Uniswap V3 concentrated liquidity math
├── modules/
│   ├── ZeroGMemory.ts      # 0G Storage integration (Proof of Intent)
│   ├── UniswapInterface.ts # Uniswap V3 SDK price & state fetching
│   ├── KeeperExecution.ts  # KeeperHub execution relay
│   └── Identity.ts         # ENS metadata & resolution
└── types/
    └── index.ts            # IntentPacket & AgentState definitions
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- 0G Storage Node Access
- KeeperHub API Key

### Installation

```bash
git clone https://github.com/your-username/hawk-by-trecc.git
npm install
cp .env.example .env
npm run start
```

---

## Developer Feedback

See [FEEDBACK.md](./FEEDBACK.md) for our detailed experience building with the Uniswap API and KeeperHub infrastructure.

**Built with by the <a href="https://trecc.finance" style="color: #FF6B00; text-decoration: none;">TRECC</a> Team.**

---

### Pro-Tip for the Judges:

When you look at the **0G Explorer**, you will see a series of JSON uploads. These aren't just logs—they are the **Hawk's Brain**, proving that every trade was calculated, intentional, and non-hallucinatory.
