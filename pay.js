// pay.js — Reusable payment function for your app
//
// Import this into your agent/server/bot:
//   const { createPayer, sendPayment } = require("./pay");

const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { getOrCreateAssociatedTokenAccount, transfer, getMint } = require("@solana/spl-token");
const fs = require("fs");

/**
 * Create a payer from a wallet file and mint address.
 * Call this once when your app starts.
 *
 *   const payer = await createPayer();
 */
async function createPayer(options = {}) {
  const rpcUrl = options.rpcUrl || "http://127.0.0.1:8899";
  const walletPath = options.walletPath || process.env.HOME + "/.config/solana/id.json";
  const mintPath = options.mintPath || ".mint-address";

  const connection = new Connection(rpcUrl, "confirmed");
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const mint = new PublicKey(fs.readFileSync(mintPath, "utf-8").trim());
  const mintInfo = await getMint(connection, mint);

  return { connection, keypair, mint, decimals: mintInfo.decimals };
}

/**
 * Send USDC to a recipient.
 *
 *   const tx = await sendPayment(payer, "RecipientAddressHere", 50);
 *   console.log("Paid! Tx:", tx);
 */
async function sendPayment(payer, recipientAddress, amount) {
  const { connection, keypair, mint, decimals } = payer;
  const recipient = new PublicKey(recipientAddress);
  const rawAmount = amount * Math.pow(10, decimals);

  const senderATA = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, keypair.publicKey);
  const receiverATA = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, recipient);
  const sig = await transfer(connection, keypair, senderATA.address, receiverATA.address, keypair, rawAmount);

  return sig;
}

module.exports = { createPayer, sendPayment };
