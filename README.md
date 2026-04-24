# Money Agent Starter Kit

Build AI agents that handle money on Solana. This starter kit gives you everything you need to send and receive payments from your code.

## What's inside

| File | What it does |
|------|-------------|
| `setup.sh` | Installs Solana, starts a local blockchain, creates a USDC token, funds your wallet. Run once. |
| `send.js` | Complete example: sends 50 USDC from your wallet to a new address. Run it to see a payment happen. |
| `pay.js` | Two functions you import into your app: `createPayer()` and `sendPayment(address, amount)`. |
| `demo/local.html` | Visual browser demo — click buttons, watch USDC move between wallets. |
| `demo/devnet.html` | Same demo but on Solana's public test network (requires faucet — see Devnet section below). |

## Quick start (5 minutes)

You need: **Node.js 18+** and a **terminal**.

```bash
# 1. Clone and install
git clone <this-repo>
cd money-agent-starter
npm install

# 2. Setup (installs Solana CLI, starts local blockchain, creates USDC, funds wallet)
npm run setup

# 3. Send your first payment
npm run send
```

That's it. You just sent 50 USDC on a local Solana blockchain.

## How to use in your app

```javascript
const { createPayer, sendPayment } = require("./pay");

// Call once when your app starts
const payer = await createPayer();

// Call whenever your agent needs to pay someone
const tx = await sendPayment(payer, "RecipientSolanaAddress", 50);
console.log("Paid! Transaction:", tx);
```

Your AI agent decides when and how much to pay. The `sendPayment` function handles everything — creating accounts, signing the transaction, confirming it on-chain.

## Key concepts (minimum you need to know)

**Wallet** = a pair of keys. Private key signs transactions (stays in your code). Public key is your address (you give it to others). Generated in one line, no registration.

**USDC** = a token on Solana worth $1. On the local blockchain, we create our own version that behaves identically. On devnet/mainnet, you use the real USDC.

**SOL** = Solana's native currency. You need a tiny amount (~0.000005 SOL) per transaction as a fee. Setup gives you 100 SOL — enough for millions of transactions.

**Local validator** = a full Solana blockchain running on your machine. Same code, same rules, but no internet needed and no rate limits. Development happens here. When you're ready, change one URL to go live.

**Associated Token Account (ATA)** = every wallet needs a separate account per token type. If you send USDC to a wallet for the first time, the account is created automatically by `sendPayment`. You don't need to think about this.

## Integrating into your AI agent

Your agent's payment logic is one function call:

```javascript
// Your agent decides to pay a subcontractor
const decision = await yourAI.decide("Should I pay this freelancer $200 for the completed work?");

if (decision.shouldPay) {
  const tx = await sendPayment(payer, freelancerWalletAddress, decision.amount);
  console.log("Agent paid", decision.amount, "USDC. Proof:", tx);
}
```

The transaction signature (`tx`) is cryptographic proof that the payment happened. On devnet/mainnet, you can verify it on [Solana Explorer](https://explorer.solana.com/?cluster=devnet).

## Switching to devnet (public test network)

When you're ready to show real on-chain transactions:

1. Change the RPC URL in your code:
   ```javascript
   const payer = await createPayer({ rpcUrl: "https://api.devnet.solana.com" });
   ```

2. Get devnet SOL (for fees): [faucet.solana.com](https://faucet.solana.com/)
3. Get devnet USDC: [faucet.circle.com](https://faucet.circle.com/) — select Solana, paste your address
4. Use the real USDC mint address: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

**Warning:** Devnet faucets have daily rate limits and can be unreliable. Develop locally, switch to devnet only for the final demo.

## Project structure for your hackathon project

```
your-project/
├── pay.js              ← copy from this starter
├── your-agent.js       ← your AI agent code
├── .mint-address       ← created by setup.sh
└── package.json
```

## Troubleshooting

**"Cannot find module @solana/spl-token"**
Run `npm install`.

**"Connection refused" or "fetch failed"**
The local validator isn't running. Start it:
```bash
solana-test-validator
```

**"Insufficient funds"**
Airdrop more SOL:
```bash
solana airdrop 100
```

**"Account not found" or "could not find mint"**
You need to run `setup.sh` again (creates the token).

**Want a clean start?**
```bash
rm -rf test-ledger .mint-address
npm run setup
```
