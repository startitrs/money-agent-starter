// pay.js — Reusable payment function for your app
//
// Import this into your agent/server/bot:
//   const { createPayer, sendPayment } = require("./pay");

const path = require("path");
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { getOrCreateAssociatedTokenAccount, transfer, getMint } = require("@solana/spl-token");
const fs = require("fs");

const DEFAULT_RPC_URL = "http://127.0.0.1:8899";
const DEFAULT_LOCAL_WALLET_PATH = path.join(process.cwd(), ".wallet.json");
const DEFAULT_GLOBAL_WALLET_PATH = path.join(process.env.HOME || "", ".config/solana/id.json");
const DEFAULT_MINT_PATH = ".mint-address";

function resolveWalletPath(options) {
  if (options.walletPath) return options.walletPath;
  if (process.env.WALLET_PATH) return process.env.WALLET_PATH;
  if (fs.existsSync(DEFAULT_LOCAL_WALLET_PATH)) return DEFAULT_LOCAL_WALLET_PATH;
  return DEFAULT_GLOBAL_WALLET_PATH;
}

function resolveMint(options) {
  if (options.mintAddress) return new PublicKey(options.mintAddress);

  const mintPath = options.mintPath === undefined ? DEFAULT_MINT_PATH : options.mintPath;
  if (!mintPath) {
    throw new Error("Missing mint. Pass options.mintAddress for devnet/mainnet, or options.mintPath for local.");
  }

  return new PublicKey(fs.readFileSync(mintPath, "utf-8").trim());
}

function toRawAmount(amount, decimals) {
  const amountText = String(amount).trim();
  if (!/^\d+(\.\d+)?$/.test(amountText)) {
    throw new Error("Amount must be a positive number or numeric string.");
  }

  const [whole, fractional = ""] = amountText.split(".");
  if (fractional.length > decimals) {
    throw new Error(`Amount has too many decimal places. Max for this token is ${decimals}.`);
  }

  const normalized = `${whole}${fractional.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
  const rawAmount = BigInt(normalized || "0");
  if (rawAmount <= 0n) {
    throw new Error("Amount must be greater than zero.");
  }

  return rawAmount;
}

/**
 * Create a payer from a wallet file and mint address.
 * Call this once when your app starts.
 *
 *   const payer = await createPayer();
 */
async function createPayer(options = {}) {
  const rpcUrl = options.rpcUrl || DEFAULT_RPC_URL;
  const walletPath = resolveWalletPath(options);

  const connection = new Connection(rpcUrl, "confirmed");
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const mint = resolveMint(options);
  const mintInfo = await getMint(connection, mint);

  return { connection, keypair, mint, decimals: mintInfo.decimals, walletPath };
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
  const rawAmount = toRawAmount(amount, decimals);

  const senderATA = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, keypair.publicKey);
  const receiverATA = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, recipient);
  const sig = await transfer(connection, keypair, senderATA.address, receiverATA.address, keypair, rawAmount);

  return sig;
}

module.exports = { createPayer, sendPayment };
