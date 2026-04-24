// send.js — Send USDC on Solana (local validator)
//
// This is the core code you integrate into your app.
// Run setup.sh first, then: node send.js

const { Connection, Keypair } = require("@solana/web3.js");
const { getOrCreateAssociatedTokenAccount, transfer, getMint } = require("@solana/spl-token");
const fs = require("fs");

// --- Config ---
const RPC_URL = "http://127.0.0.1:8899"; // local validator (change to devnet URL for production)
const AMOUNT = 50; // USDC to send

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");

  // Load your wallet (created by setup.sh)
  // Use CLI wallet (setup.sh creates this, or use your own)
  const walletPath = process.env.WALLET_PATH || process.env.HOME + "/.config/solana/id.json";
  const sender = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  // Load the USDC mint address (saved by setup.sh)
  const { PublicKey } = require("@solana/web3.js");
  const mintAddress = new PublicKey(fs.readFileSync(".mint-address", "utf-8").trim());

  // Create a recipient wallet (in your app, this would be the subcontractor/vendor/etc.)
  const receiver = Keypair.generate();
  console.log("Sender:   ", sender.publicKey.toBase58());
  console.log("Receiver: ", receiver.publicKey.toBase58());

  // Get token decimals from the mint
  const mintInfo = await getMint(connection, mintAddress);
  const rawAmount = AMOUNT * Math.pow(10, mintInfo.decimals);

  // --- THE ACTUAL PAYMENT (3 lines) ---
  const senderATA = await getOrCreateAssociatedTokenAccount(connection, sender, mintAddress, sender.publicKey);
  const receiverATA = await getOrCreateAssociatedTokenAccount(connection, sender, mintAddress, receiver.publicKey);
  const sig = await transfer(connection, sender, senderATA.address, receiverATA.address, sender, rawAmount);

  console.log(`\nSent ${AMOUNT} USDC`);
  console.log("Transaction:", sig);

  // Check balances
  const senderBal = await connection.getTokenAccountBalance(senderATA.address);
  const receiverBal = await connection.getTokenAccountBalance(receiverATA.address);
  console.log(`\nSender balance:   ${senderBal.value.uiAmountString} USDC`);
  console.log(`Receiver balance: ${receiverBal.value.uiAmountString} USDC`);
}

main().catch(console.error);
