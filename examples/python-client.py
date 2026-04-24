"""
examples/python-client.py

Example client for a Python app talking to the local Node payment bridge.

Usage:
    pip install requests
    python examples/python-client.py RECIPIENT_SOLANA_ADDRESS 5
"""

import sys
import requests

BRIDGE_URL = "http://127.0.0.1:3030"

def send_payment(recipient_address: str, amount: str) -> dict:
    """Send USDC via the local payment bridge. Returns the response JSON."""
    resp = requests.post(f"{BRIDGE_URL}/pay", json={
        "recipientAddress": recipient_address,
        "amount": amount,
    })
    resp.raise_for_status()
    return resp.json()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python examples/python-client.py RECIPIENT_ADDRESS [AMOUNT]", file=sys.stderr)
        sys.exit(1)

    recipient = sys.argv[1]
    amount = sys.argv[2] if len(sys.argv) > 2 else "5"

    result = send_payment(recipient, amount)
    print(f"Sent {result['amount']} USDC")
    print(f"Transaction: {result['transaction']}")
