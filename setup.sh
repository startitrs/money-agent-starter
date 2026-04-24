#!/bin/bash
# Setup script for Money Agent Starter Kit
# Starts a local Solana validator, creates a USDC-like token, funds your wallet.
# Run once. After that, use send.js to make payments.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
WALLET_PATH="${WALLET_PATH:-$ROOT_DIR/.wallet.json}"
SOLANA_CONFIG="${SOLANA_CONFIG:-$ROOT_DIR/.solana-config.yml}"
LEDGER_DIR="${LEDGER_DIR:-$ROOT_DIR/test-ledger}"
VALIDATOR_LOG="${VALIDATOR_LOG:-$ROOT_DIR/.validator.log}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8899}"

solana_cmd() {
    solana -C "$SOLANA_CONFIG" "$@"
}

spl_token_cmd() {
    spl-token -C "$SOLANA_CONFIG" "$@"
}

validator_running() {
    curl -s "$RPC_URL" -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":1,"method":"getVersion","params":[]}' > /dev/null
}

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null && ! [ -f "$HOME/.local/share/solana/install/active_release/bin/solana" ]; then
    echo "Installing Solana CLI..."
    sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
    echo ""
    echo "Add this to your shell profile (~/.zshrc or ~/.bashrc):"
    echo "  export PATH=\"\$HOME/.local/share/solana/install/active_release/bin:\$PATH\""
    echo ""
fi

# Ensure PATH includes Solana
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo "Solana CLI: $(solana --version)"

# Create a repo-local wallet if it doesn't exist
if [ ! -f "$WALLET_PATH" ]; then
    echo "Creating wallet..."
    solana-keygen new --no-bip39-passphrase --silent --force -o "$WALLET_PATH" > /dev/null
fi

# Use a repo-local Solana config so setup never depends on global CLI state
solana config set --config "$SOLANA_CONFIG" --url localhost --keypair "$WALLET_PATH" > /dev/null

# Check if validator is already running
if validator_running; then
    echo "Local validator already running on $RPC_URL."
else
    echo "Starting local validator..."
    nohup solana-test-validator --quiet --ledger "$LEDGER_DIR" --reset > "$VALIDATOR_LOG" 2>&1 &
    VALIDATOR_PID=$!
    echo "Validator PID: $VALIDATOR_PID"

    # Wait for it to be ready
    echo "Waiting for validator..."
    for i in $(seq 1 30); do
        if validator_running; then
            break
        fi
        sleep 1
    done
    if ! validator_running; then
        echo "Validator failed to start. See $VALIDATOR_LOG"
        exit 1
    fi
    echo "Validator ready."
fi

# Fund wallet
echo "Funding wallet with 100 SOL..."
solana_cmd airdrop 100 > /dev/null

# Create token (our local USDC equivalent)
echo "Creating USDC token (6 decimals)..."
MINT=$(spl_token_cmd create-token --decimals 6 2>&1 | awk '/Creating token/ {print $3}')
if [ -z "$MINT" ]; then
    echo "Failed to create token."
    exit 1
fi
echo "Mint address: $MINT"

# Create token account
echo "Creating token account..."
spl_token_cmd create-account "$MINT" > /dev/null

# Mint 10,000 USDC
echo "Minting 10,000 USDC..."
spl_token_cmd mint "$MINT" 10000 > /dev/null

# Save mint address for send.js
echo "$MINT" > "$ROOT_DIR/.mint-address"
echo ""
echo "============================================"
echo "Setup complete!"
echo ""
echo "Wallet file: $(realpath "$WALLET_PATH")"
echo "Your wallet: $(solana-keygen pubkey "$WALLET_PATH")"
echo "USDC mint:   $MINT"
echo "Balance:     $(solana_cmd balance) + 10,000 USDC"
echo "Validator:   $RPC_URL"
echo "Log file:    $(realpath "$VALIDATOR_LOG")"
echo ""
echo "Next: run"
echo "  npm run send"
echo "============================================"
