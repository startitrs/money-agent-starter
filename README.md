# Money Agent Starter Kit

Build AI agents that handle money on Solana. This starter kit gives you everything you need to send and receive payments from your code.

## What's inside

| File | What it does |
|------|-------------|
| `setup.sh` | Installs Solana if needed, starts a repo-local validator in the background, creates a USDC token, funds a repo-local wallet. Run once. |
| `send.js` | Complete example: sends 50 USDC from your wallet to a new address. Run it to see a payment happen. |
| `send-devnet.js` | Same example on Solana devnet with real devnet USDC. Prints a Solana Explorer link you can show to judges. |
| `pay.js` | Two functions you import into your app: `createPayer()` and `sendPayment(address, amount)`. |
| `examples/payment-server.js` | Tiny HTTP bridge for apps written in PHP, Python, Ruby, Go, etc. |
| `examples/php-client.php` | Example PHP client calling the local payment bridge. |
| `INTEGRATION.md` | Stack-agnostic setup guide for hackathon teams with little or no blockchain experience. |
| `demo/local.html` | Visual browser demo — click buttons, watch USDC move between wallets. |
| `demo/devnet.html` | Same demo but on Solana's public test network (requires faucet — see Devnet section below). |

## If you're new and just need this to work

You do **not** need to:
- build your whole app in Node
- learn smart contracts
- understand Solana internals
- touch anything beyond one payment call

The simplest hackathon path is:

1. Build your main app in whatever stack you already know.
2. Use this repo only for the payment part.
3. Run `npm run setup` once.
4. Either:
   - import `pay.js` directly if your app is already in Node, or
   - start `npm run bridge` and call it from PHP / Python / Ruby / Go / anything else

If your goal is "my app should show that a payment happened", this starter is enough.

## Quick start (5 minutes)

You need: **Node.js 18+** and a **terminal**.

```bash
# 1. Clone and install
git clone <this-repo>
cd money-agent-starter
npm install

# 2. Setup (starts local blockchain, creates repo-local wallet + USDC, funds wallet)
npm run setup

# 3. Send your first payment
npm run send
```

That's it. You just sent 50 USDC on a local Solana blockchain.
`setup.sh` writes `.wallet.json`, `.mint-address`, and `.validator.log` in the repo so the starter stays self-contained.

## Use this from any stack

If your app is **not** in Node, do not rewrite it.

Start the included local bridge:

```bash
npm run bridge
```

Then call it from your app:

```bash
curl -X POST http://127.0.0.1:3030/pay \
  -H "Content-Type: application/json" \
  -d '{"recipientAddress":"RECIPIENT_WALLET","amount":"5"}'
```

Response:

```json
{
  "ok": true,
  "transaction": "TRANSACTION_SIGNATURE",
  "recipientAddress": "RECIPIENT_WALLET",
  "amount": "5"
}
```

This gives you a minimal architecture:

```text
Your app (PHP / Python / Ruby / etc.)
            |
            v
Local Node payment bridge
            |
            v
Solana local validator or devnet
```

See [INTEGRATION.md](./INTEGRATION.md) for the full walkthrough and the PHP example.

## How to use in your app

```javascript
const { createPayer, sendPayment } = require("./pay");

// Call once when your app starts
const payer = await createPayer();

// Call whenever your agent needs to pay someone
const tx = await sendPayment(payer, "RecipientSolanaAddress", 50);
console.log("Paid! Transaction:", tx);
```

If your app is not written in Node, use the bridge in `examples/payment-server.js` instead of importing `pay.js` directly.

By default, `createPayer()` uses:
- `.wallet.json` if it exists in the current project
- `WALLET_PATH` if you set it
- `~/.config/solana/id.json` as a fallback

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

1. Point the payer at devnet and the real USDC mint:
   ```javascript
   const payer = await createPayer({
     rpcUrl: "https://api.devnet.solana.com",
     mintAddress: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
   });
   ```

2. Get devnet SOL (for fees): [faucet.solana.com](https://faucet.solana.com/)
3. Get devnet USDC: [faucet.circle.com](https://faucet.circle.com/) — select Solana, paste your address
4. Run the ready-made devnet example:
   ```bash
   npm run send:devnet
   ```

Optional env vars:
```bash
AMOUNT=7.5 RECIPIENT_ADDRESS=<wallet> npm run send:devnet
```

**Warning:** Devnet faucets have daily rate limits and can be unreliable. Develop locally, switch to devnet only for the final demo.

If your event allows fully local demos, you can stay on the local validator the entire time and avoid faucet/RPC issues.

## Project structure for your hackathon project

```
your-project/
├── your-app/                 ← your PHP / Python / Rails / etc. app
├── payment-bridge/
│   ├── pay.js                ← copy from this starter
│   ├── examples/payment-server.js
│   ├── .wallet.json          ← optional repo-local wallet created by setup.sh
│   ├── .mint-address         ← created by setup.sh
│   └── package.json
```

If you are already in Node, you can keep everything in one project and just copy `pay.js`.

## Troubleshooting

**"Cannot find module @solana/spl-token"**
Run `npm install`.

**"Connection refused" or "fetch failed"**
The local validator isn't running. Start it again:
```bash
npm run setup
```

**"Insufficient funds"**
Airdrop more SOL to the wallet from `.wallet.json`:
```bash
solana -C .solana-config.yml airdrop 100
```

**"Account not found" or "could not find mint"**
You need to run `setup.sh` again (creates the token).

**Want a clean start?**
```bash
rm -rf test-ledger .mint-address .wallet.json .solana-config.yml .validator.log
npm run setup
```
