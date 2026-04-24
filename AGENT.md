# Agent Instructions

Instructions for AI coding assistants (Claude, ChatGPT, Copilot, Cursor) helping a developer build a Solana payment integration.

## Context

This project is a hackathon starter kit for building AI agents that autonomously handle money on Solana. The developer may have zero blockchain experience. Your job is to help them integrate `pay.js` into their application.

## File overview

- `pay.js` — the only file the developer needs. Exports `createPayer()` and `sendPayment(payer, address, amount)`.
- `send.js` — standalone example showing a complete payment. Good reference for how pay.js is used.
- `setup.sh` — sets up the local Solana environment. Run once. Creates `.mint-address` file.
- `.mint-address` — contains the local USDC token mint address. Created by setup.sh, read by pay.js.
- `demo/local.html` — visual browser demo (local validator). Not needed for code integration.
- `demo/devnet.html` — visual browser demo (devnet). Not needed for code integration.

## How payment works

```javascript
const { createPayer, sendPayment } = require("./pay");

// Initialize once (reads wallet from ~/.config/solana/id.json, mint from .mint-address)
const payer = await createPayer();

// Send payment (creates recipient's token account if needed, then transfers)
const signature = await sendPayment(payer, recipientAddress, amount);
```

`sendPayment` is async. It either returns a transaction signature string (success) or throws an error. There is no intermediate state — Solana transactions finalize in ~400ms.

## What each function does internally

### `createPayer(options?)`
1. Connects to Solana RPC (default: localhost:8899)
2. Loads wallet keypair from file
3. Loads USDC mint address from `.mint-address`
4. Reads token decimals from the mint
5. Returns `{ connection, keypair, mint, decimals }`

### `sendPayment(payer, recipientAddress, amount)`
1. Converts `amount` (human-readable, e.g. 50) to raw units (50 * 10^6 = 50000000)
2. Finds or creates the sender's Associated Token Account (ATA)
3. Finds or creates the recipient's ATA (costs ~0.002 SOL, paid by sender)
4. Transfers tokens from sender ATA to recipient ATA
5. Returns the transaction signature

## Common integration patterns

### Express API endpoint
```javascript
const express = require("express");
const { createPayer, sendPayment } = require("./pay");

const app = express();
let payer;

app.post("/pay", express.json(), async (req, res) => {
  const { recipient, amount } = req.body;
  try {
    const tx = await sendPayment(payer, recipient, amount);
    res.json({ success: true, transaction: tx });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

(async () => {
  payer = await createPayer();
  app.listen(3000, () => console.log("Payment API running on :3000"));
})();
```

### AI agent decision loop
```javascript
const { createPayer, sendPayment } = require("./pay");

const payer = await createPayer();

async function agentLoop() {
  const task = await getNextTask();        // your logic
  const worker = await findWorker(task);   // your logic
  const result = await worker.complete();  // your logic

  if (result.quality >= threshold) {
    const tx = await sendPayment(payer, worker.walletAddress, task.bounty);
    console.log(`Paid ${task.bounty} USDC for task ${task.id}. Tx: ${tx}`);
  }
}
```

### Checking balance before paying
```javascript
const { getAccount } = require("@solana/spl-token");

async function getBalance(payer) {
  const { getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");
  const ata = await getOrCreateAssociatedTokenAccount(
    payer.connection, payer.keypair, payer.mint, payer.keypair.publicKey
  );
  const balance = await payer.connection.getTokenAccountBalance(ata.address);
  return parseFloat(balance.value.uiAmountString);
}
```

## Switching to devnet

When the developer wants real on-chain transactions visible on Solana Explorer:

```javascript
const payer = await createPayer({
  rpcUrl: "https://api.devnet.solana.com",
  mintPath: null // won't read .mint-address
});
// Override mint to real devnet USDC
payer.mint = new (require("@solana/web3.js").PublicKey)("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
payer.decimals = 6;
```

Requirements for devnet: wallet must have SOL (from faucet.solana.com) and USDC (from faucet.circle.com).

## Error handling

| Error | Cause | Fix |
|-------|-------|-----|
| `Connection refused` | Local validator not running | Run `solana-test-validator` |
| `Insufficient funds` | Not enough SOL for fees | `solana airdrop 100` (local) |
| `TokenAccountNotFoundError` | Mint doesn't exist | Run `setup.sh` again |
| `Transaction was not confirmed in 30 seconds` | Network congestion (devnet) | Retry, or switch to local |

## Important constraints

- **One payer per process.** Don't create multiple payers — reuse the same one.
- **ATA creation costs SOL.** First payment to a new recipient costs ~0.002 SOL extra (to create their token account). Subsequent payments to the same recipient are cheaper.
- **Amounts are human-readable.** `sendPayment(payer, addr, 50)` sends 50 USDC, not 50000000. The function handles decimal conversion.
- **Transactions are final.** There is no undo, no chargeback, no refund mechanism. If the developer needs refunds, they must implement a reverse payment.
