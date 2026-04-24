// send.js — Send USDC on Solana (local validator)
//
// This is the core code you integrate into your app.
// Run setup.sh first, then: node send.js

const { Keypair } = require("@solana/web3.js");
const { getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");
const { createPayer, sendPayment } = require("./pay");

// --- Config ---
const AMOUNT = 50; // USDC to send

async function main() {
  const payer = await createPayer();
  const { connection, keypair, mint, walletPath } = payer;

  // Create a recipient wallet (in your app, this would be the subcontractor/vendor/etc.)
  const receiver = Keypair.generate();
  console.log("Wallet file:", walletPath);
  console.log("Sender:   ", keypair.publicKey.toBase58());
  console.log("Receiver: ", receiver.publicKey.toBase58());

  const sig = await sendPayment(payer, receiver.publicKey.toBase58(), AMOUNT);
  const senderATA = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, keypair.publicKey);
  const receiverATA = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, receiver.publicKey);

  console.log(`\nSent ${AMOUNT} USDC`);
  console.log("Transaction:", sig);

  // Check balances
  const senderBal = await connection.getTokenAccountBalance(senderATA.address);
  const receiverBal = await connection.getTokenAccountBalance(receiverATA.address);
  console.log(`\nSender balance:   ${senderBal.value.uiAmountString} USDC`);
  console.log(`Receiver balance: ${receiverBal.value.uiAmountString} USDC`);
}

main().catch(console.error);
