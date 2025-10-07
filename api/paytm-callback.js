import PaytmChecksum from "paytmchecksum";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // Paytm sends data as x-www-form-urlencoded
  let body = "";
  await new Promise((resolve) => {
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", resolve);
  });

  // Parse form data
  const params = {};
  body.split("&").forEach((pair) => {
    const [key, value] = pair.split("=");
    params[key] = decodeURIComponent(value || "");
  });

  // Extract checksum
  const paytmChecksum = params.CHECKSUMHASH;
  delete params.CHECKSUMHASH;

  // Verify checksum
  const isValidChecksum = PaytmChecksum.verifySignature(params, process.env.PAYTM_KEY, paytmChecksum);

  if (!isValidChecksum) {
    return res.status(400).send("Checksum Mismatch");
  }

  // Check transaction status
  if (params.STATUS === "TXN_SUCCESS") {
    // TODO: Update order status in your database (e.g., Firestore)
    // You can use params.ORDERID, params.TXNID, params.TXNAMOUNT, etc.
    res.status(200).send("Payment Success! Thank you for your order.");
  } else {
    res.status(200).send("Payment Failed or Cancelled.");
  }
}
