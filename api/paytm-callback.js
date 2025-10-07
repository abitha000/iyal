import PaytmChecksum from "paytmchecksum";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK (only once)
const app = initializeApp({
  credential: applicationDefault(),
});
const db = getFirestore(app);

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

  // Update order status in Firestore
  try {
    await db.collection("orders").doc(params.ORDERID).set({
      orderId: params.ORDERID,
      txnId: params.TXNID,
      amount: params.TXNAMOUNT,
      status: params.STATUS,
      paymentMode: params.PAYMENTMODE,
      bankName: params.BANKNAME,
      txnDate: params.TXNDATE,
      email: params.EMAIL,
      phone: params.MOBILE_NO,
      paytmResponse: params,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    if (params.STATUS === "TXN_SUCCESS") {
      res.status(200).send("Payment Success! Thank you for your order.");
    } else {
      res.status(200).send("Payment Failed or Cancelled.");
    }
  } catch (err) {
    res.status(500).send("Error updating order status.");
  }
}
