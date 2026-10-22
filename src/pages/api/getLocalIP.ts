import { NextApiRequest, NextApiResponse } from "next";
import { getLocalIPAddress } from "@/lib/getLocalIp";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  console.log("API localIP is running");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  return res.status(200).json({ ips: getLocalIPAddress() });
}
