#!/bin/bash
# Setup script for Money Agent Starter Kit
# Starts a local Solana validator, creates a USDC-like token, funds your wallet.
# Run once. After that, use send.js to make payments.

set -e

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

# Create wallet if it doesn't exist
if [ ! -f "$HOME/.config/solana/id.json" ]; then
    echo "Creating wallet..."
    solana-keygen new --no-bip39-passphrase
fi

# Set to localhost
solana config set --url localhost

# Check if validator is already running
if curl -s http://localhost:8899 -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"getVersion","params":[]}' &> /dev/null; then
    echo "Local validator already running."
else
    echo "Starting local validator..."
    # Clean start
    rm -rf test-ledger
    solana-test-validator --quiet &
    VALIDATOR_PID=$!
    echo "Validator PID: $VALIDATOR_PID"

    # Wait for it to be ready
    echo "Waiting for validator..."
    for i in $(seq 1 30); do
        if curl -s http://localhost:8899 -X POST -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","id":1,"method":"getVersion","params":[]}' &> /dev/null; then
            break
        fi
        sleep 1
    done
    echo "Validator ready."
fi

# Fund wallet
echo "Funding wallet with 100 SOL..."
solana airdrop 100

# Create token (our local USDC equivalent)
echo "Creating USDC token (6 decimals)..."
MINT=$(spl-token create-token --decimals 6 2>&1 | grep "Creating token" | awk '{print $3}')
echo "Mint address: $MINT"

# Create token account
echo "Creating token account..."
spl-token create-account $MINT

# Mint 10,000 USDC
echo "Minting 10,000 USDC..."
spl-token mint $MINT 10000

# Save mint address for send.js
echo $MINT > .mint-address
echo ""
echo "============================================"
echo "Setup complete!"
echo ""
echo "Your wallet: $(solana address)"
echo "USDC mint:   $MINT"
echo "Balance:     $(solana balance) + 10,000 USDC"
echo ""
echo "Next: edit send.js with a recipient address, then run:"
echo "  npm run send"
echo "============================================"
