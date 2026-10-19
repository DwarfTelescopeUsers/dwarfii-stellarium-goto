import type { NextApiRequest, NextApiResponse } from "next";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

// Type for the response from the proxy
type ProxyResponse = {
  error?: string;
  details?: string;
};

// Function to check if body is a valid JSON string
function isJSONString(body) {
  if (typeof body !== "string") {
    return false;
  }
  try {
    JSON.parse(body);
    return true;
  } catch (e) {
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProxyResponse | string>,
) {
  const controller = new AbortController();
  const disconnect = () => controller.abort();
  res.once("close", disconnect);
  const timeout = 30000;

  // Set up the timeout manually
  const timeoutSignal = setTimeout(() => {
    controller.abort(); // Abort the request after timeout
  }, timeout);

  try {
    console.log("API is running");
    const { target } = req.query;
    console.debug("query :", req.query);
    //console.debug("headers :", req.headers);
    console.debug("method :", req.method);
    console.debug("body :", req.body);

    if (!target || typeof target !== "string") {
      return res.status(400).json({ error: "Target URL is required" });
    }

    // Extract the last target from the query string if it's recursive
    const lastTarget = new URL(target).searchParams.get("target") || target;
    console.debug("target: ", lastTarget);

    // Prepare headers, removing problematic ones
    const filteredHeaders = Object.fromEntries(
      Object.entries(req.headers).filter(
        ([key]) => !["host", "transfer-encoding"].includes(key.toLowerCase()),
      ),
    );

    // Ensure headers only contain strings (this prevents TypeScript errors)
    const sanitizedHeaders: { [key: string]: string } = Object.fromEntries(
      Object.entries(filteredHeaders).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(",") : (value ?? ""), // Join arrays, or use empty string for undefined
      ]),
    );

    // Validate if the body is valid for the method
    const isBodyValid =
      ["PUT", "DELETE", "PATCH"].includes(req.method || "") ||
      (req.method === "POST" &&
        req.body && // Ensure `req.body` exists
        typeof req.body === "object" && // Check it's an object
        Object.keys(req.body).length > 0); // Confirm it's not empty

    // Only include body if valid
    if (isBodyValid) {
      // Ensure proper content type
      sanitizedHeaders["Content-Type"] = "application/json";
    }

    interface FetchOptions {
      method: string;
      headers: { [key: string]: string };
      body?: string;
      signal?: AbortSignal; // Ensure signal is part of the type
    }

    // Prepare the fetchOptions
    const fetchOptions: FetchOptions = {
      signal: controller.signal,
      method: req.method ?? "GET", // Fallback to "GET" if req.method is undefined
      headers: sanitizedHeaders,
    };

    // Include the body only if valid
    if (isBodyValid) {
      const finalBody = isJSONString(req.body)
        ? req.body
        : JSON.stringify(req.body);
      fetchOptions.body = finalBody;
    }

    // Make the fetch request with timeout signal
    const response = await fetch(lastTarget, fetchOptions);
    //console.debug("response:", response);

    let contentType = response.headers.get("content-type");
    console.debug("contentType:", contentType);

    if (typeof contentType === "string" && contentType.includes("multipart")) {
      // Cancel the timeout signal for multipart responses
      clearTimeout(timeoutSignal);
      res.setHeader("Content-Type", contentType);
    } else if (contentType) {
      res.setHeader("Content-Type", contentType.split(";")[0].trim());
    } else {
      res.setHeader("Content-Type", "application/octet-stream");
    }

    // Handle multipart streaming (if applicable)
    if (typeof contentType === "string" && contentType.includes("multipart")) {
      if (response.body) {
        res.status(response.status);
        res.setHeader("Cache-Control", "no-store");
        await pipeline(Readable.fromWeb(response.body as any), res);
        return;
      } else {
        return res
          .status(500)
          .json({ error: "Multipart response body is missing." });
      }
    }

    // Handle images and binary data
    if (
      contentType?.includes("image") ||
      contentType?.includes("octet-stream")
    ) {
      if (!response.body) {
        return res.status(500).json({ error: "Failed to fetch binary data." });
      }
      // Convert the ReadableStream to a Node.js stream
      const stream = Readable.fromWeb(response.body as any);

      // Pipe the image stream to the response
      await pipeline(stream, res);
    } else {
      // Preserve firmware uint64 parameter IDs for the SDK's lossless decoder.
      res.status(response.status).send(await response.text());
    }
  } catch (error) {
    if (res.destroyed) return;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Proxy error:", error);
    res
      .status(500)
      .json({ error: "Proxy request failed", details: errorMessage });
  } finally {
    res.off("close", disconnect);
    clearTimeout(timeoutSignal);
  }
}
