import PaytmChecksum from "paytmchecksum";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, email, phone } = req.body;
  const orderId = "ORDERID_" + Date.now();

  const paytmParams = {
    MID: process.env.PAYTM_MID,
    WEBSITE: process.env.PAYTM_WEBSITE,
    INDUSTRY_TYPE_ID: "Retail",
    CHANNEL_ID: "WEB",
    ORDER_ID: orderId,
    CUST_ID: email,
    TXN_AMOUNT: amount.toString(),
    CALLBACK_URL: "https://yourdomain.com/api/paytm-callback", // Replace with your deployed domain
    MOBILE_NO: phone,
    EMAIL: email
  };

  const checksum = await PaytmChecksum.generateSignature(paytmParams, process.env.PAYTM_KEY);

  paytmParams.CHECKSUMHASH = checksum;

  res.status(200).json({ paytmParams });
}
