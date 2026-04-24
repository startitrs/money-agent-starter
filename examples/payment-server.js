// examples/payment-server.js
//
// Minimal HTTP bridge around pay.js for apps that are NOT written in Node.
// Start once, then call POST /pay from PHP, Python, Ruby, Go, etc.

const http = require("http");
const { createPayer, sendPayment } = require("../pay");

const PORT = Number(process.env.PORT || 3030);

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function getPayerOptions() {
  const options = {};

  if (process.env.RPC_URL) options.rpcUrl = process.env.RPC_URL;
  if (process.env.WALLET_PATH) options.walletPath = process.env.WALLET_PATH;
  if (process.env.MINT_ADDRESS) options.mintAddress = process.env.MINT_ADDRESS;
  if (process.env.MINT_PATH) options.mintPath = process.env.MINT_PATH;

  return options;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large."));
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    req.on("error", reject);
  });
}

const payerPromise = createPayer(getPayerOptions());

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      const payer = await payerPromise;
      return json(res, 200, {
        ok: true,
        wallet: payer.keypair.publicKey.toBase58(),
        mint: payer.mint.toBase58(),
      });
    }

    if (req.method === "POST" && url.pathname === "/pay") {
      const { recipientAddress, amount } = await readJson(req);

      if (!recipientAddress) {
        return json(res, 400, { ok: false, error: "Missing recipientAddress." });
      }

      if (amount === undefined || amount === null || amount === "") {
        return json(res, 400, { ok: false, error: "Missing amount." });
      }

      const payer = await payerPromise;
      const signature = await sendPayment(payer, recipientAddress, amount);

      return json(res, 200, {
        ok: true,
        transaction: signature,
        recipientAddress,
        amount,
      });
    }

    return json(res, 404, { ok: false, error: "Not found." });
  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
});

server.listen(PORT, () => {
  console.log(`Payment bridge listening on http://127.0.0.1:${PORT}`);
  console.log("Health check: GET /health");
  console.log("Send payment: POST /pay");
});
