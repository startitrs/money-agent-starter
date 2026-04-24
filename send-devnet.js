// send-devnet.js — Send real devnet USDC on Solana
//
// Before running:
// 1. Fund your wallet with devnet SOL
// 2. Fund the same wallet with devnet USDC from Circle's faucet
// 3. Run: npm run send:devnet

const { Keypair, PublicKey } = require("@solana/web3.js");
const { getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");
const { createPayer, sendPayment } = require("./pay");

const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const USDC_MINT_ADDRESS =
  process.env.USDC_MINT_ADDRESS || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const AMOUNT = process.env.AMOUNT || "5";

async function main() {
  const payer = await createPayer({
    rpcUrl: RPC_URL,
    mintAddress: USDC_MINT_ADDRESS,
  });
  const { connection, keypair, mint, walletPath } = payer;

  const recipientAddress = process.env.RECIPIENT_ADDRESS
    ? new PublicKey(process.env.RECIPIENT_ADDRESS).toBase58()
    : Keypair.generate().publicKey.toBase58();

  console.log("Wallet file:", walletPath);
  console.log("Sender:   ", keypair.publicKey.toBase58());
  console.log("Receiver: ", recipientAddress);
  console.log("RPC URL:  ", RPC_URL);

  const sig = await sendPayment(payer, recipientAddress, AMOUNT);
  const senderATA = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, keypair.publicKey);
  const receiverATA = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, new PublicKey(recipientAddress));

  console.log(`\nSent ${AMOUNT} USDC on devnet`);
  console.log("Transaction:", sig);
  console.log(`Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);

  const senderBal = await connection.getTokenAccountBalance(senderATA.address);
  const receiverBal = await connection.getTokenAccountBalance(receiverATA.address);
  console.log(`\nSender balance:   ${senderBal.value.uiAmountString} USDC`);
  console.log(`Receiver balance: ${receiverBal.value.uiAmountString} USDC`);
}

main().catch(console.error);
