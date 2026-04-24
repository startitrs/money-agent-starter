# Integration Guide for Any Stack

This guide is for developers who want to build the main app in **PHP, Python, Ruby, Go, Laravel, Rails, Django, plain HTML forms, or anything else**.

You do **not** need to rewrite your app in Node.

## The simplest mental model

Treat this repo as a tiny payment engine.

Your app does the product logic:
- find the freelancer
- decide whether to pay
- collect the recipient wallet address
- decide the amount

This starter only does the money move:
- sign the transaction
- create token accounts if needed
- submit the transaction
- return the transaction signature

Recommended shape:

```text
Your app (PHP / Python / Ruby / etc.)
            |
            v
Local Node payment bridge (examples/payment-server.js)
            |
            v
Solana local validator or devnet
```

## Fastest path for a hackathon

If you only need a working demo:

1. Clone this repo and install dependencies.
   ```bash
   npm install
   ```

2. Run setup once.
   ```bash
   npm run setup
   ```

3. Start the local payment bridge.
   ```bash
   npm run bridge
   ```

4. From your main app, call the bridge with:
   - `GET /health` to verify it is ready
   - `POST /pay` to send a payment

That is enough to keep your app in your preferred stack while still showing a real Solana transaction.

## HTTP API

### `GET /health`

Example:

```bash
curl http://127.0.0.1:3030/health
```

Response:

```json
{
  "ok": true,
  "wallet": "AgentWalletAddress",
  "mint": "UsdcMintAddress"
}
```

### `POST /pay`

Example:

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

## PHP example

There is a ready-made example in [examples/php-client.php](./examples/php-client.php).

Run it like this:

```bash
php examples/php-client.php RECIPIENT_SOLANA_ADDRESS 5
```

## If your app is already in Node

Do not use the bridge. Just import `pay.js` directly:

```javascript
const { createPayer, sendPayment } = require("./pay");

const payer = await createPayer();
const tx = await sendPayment(payer, recipientAddress, 5);
```

## Local demo vs devnet demo

### Local validator

Best for:
- building fast
- no faucet dependencies
- live demos on unreliable Wi-Fi
- offline-style hackathon demos

Use the defaults:
- RPC URL: `http://127.0.0.1:8899`
- wallet: `.wallet.json`
- mint: `.mint-address`

### Devnet

Best for:
- public explorer links
- showing a transaction on a public testnet

Set these environment variables before starting the bridge:

```bash
export RPC_URL=https://api.devnet.solana.com
export MINT_ADDRESS=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
npm run bridge
```

You also need:
- devnet SOL for fees
- devnet USDC in the payer wallet

## What your app should store

Minimum inputs:
- recipient wallet address
- amount

Useful outputs:
- transaction signature
- timestamp
- task / invoice / freelancer ID from your app

For a hackathon demo, the most useful thing is to save the transaction signature and show it in your UI as payment proof.

## Common mistakes

### "Do I need blockchain code in PHP?"

No. Your PHP app can stay normal. Let the Node bridge handle the Solana-specific code.

### "Do I need to create wallets for users?"

Not necessarily. For a demo, you can generate a recipient wallet in a script or accept one pasted into your UI.

### "Do I need a smart contract?"

No. This starter only uses token transfers. That is enough for a functional payment demo.

### "Do I need to understand ATAs, minting, token programs, or Solana internals?"

No. For this starter, you only need to know:
- who gets paid
- how much to pay
- when your agent decides to pay

## Suggested hackathon flow

1. Build your product in the stack you know.
2. Keep payments in this starter repo or copy `pay.js` into a tiny Node service.
3. Trigger one payment from your app.
4. Show the returned transaction signature in your UI.
5. If needed, show balances before and after the payment.
