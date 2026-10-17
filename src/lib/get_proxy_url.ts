import { ConnectionContextType } from "@/types";
import { isTauri } from "@tauri-apps/api/core";

export async function checkHealth(url, timeout = 5000, externalSignal) {
  const timeoutSignal = AbortSignal.timeout(timeout);

  const combinedSignal = AbortSignal.any([timeoutSignal, externalSignal]);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: combinedSignal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Invalid response type, expected JSON");
    }

    const data = await response.json(); // Parse JSON safely

    if (data.status) {
      console.log(`${url} Service is healthy!`);
      return data.data ?? true;
    } else {
      console.warn(`${url} Service is unhealthy:`, data);
      return false;
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (timeoutSignal.aborted) {
        console.log(
          `checkHealth ${url} Operation timed out after ${timeout} ms`,
        );
      } else if (externalSignal.aborted) {
        console.log(`Request aborted: ${url}`);
      } else {
        console.warn(`Health service ${url} is unavailable:`, error.message);
      }
    } else {
      console.error("An unknown error occurred:", error);
    }
    return false;
  }
}

export function isModeHttps() {
  // don't change if using Tauri
  if (isTauri()) {
    return false;
  } else if (typeof window !== "undefined") {
    const port = window.location.protocol;
    return port.toLowerCase() === "https:";
  }
  return false;
}

export function getServerIp() {
  if (typeof window !== "undefined") {
    return window.location.hostname;
  }
  return "";
}

export function getServerUrl() {
  // don't change if using /api/proxy or Tauri
  if (
    isTauri() ||
    (process.env.NEXT_PUBLIC_URL_PROXY_CORS &&
      process.env.NEXT_PUBLIC_URL_PROXY_CORS.includes("api"))
  ) {
    console.debug(`ServerUrl-1 is : "/api"`);
    return "/api";
  } else if (typeof window !== "undefined") {
    const port = window.location.port;
    const server_url = port
      ? `${window.location.protocol}//${window.location.hostname}:${port}`
      : `${window.location.protocol}//${window.location.hostname}`;
    console.debug(`ServerUrl-2 is : ${server_url}`);
    return server_url;
  }
  const server_url = `http://127.0.0.1:8000`;
  console.debug(`ServerUrl-3 is : ${server_url}`);
  return server_url;
}

export function proxyHostname(
  selected: string | undefined,
  pageHostname: string,
  pageProtocol: string,
): string {
  if (!selected) return pageHostname;
  try {
    const configured = new URL(
      selected.includes("://") ? selected : `http://${selected}`,
    );
    const localPage = ["localhost", "127.0.0.1"].includes(pageHostname);
    return localPage &&
      pageProtocol === "https:" &&
      selected.startsWith("http://")
      ? pageHostname
      : configured.hostname;
  } catch {
    return pageHostname;
  }
}

export function getProxyUrl(connectionCtx: ConnectionContextType) {
  // don't change if using Tauri
  if (isTauri()) {
    console.debug(`PROXY-1 is : ${process.env.NEXT_PUBLIC_URL_PROXY_CORS}`);
    return process.env.NEXT_PUBLIC_URL_PROXY_CORS || "http://127.0.0.1:8860";
    // don't change if using api/proxy and not using an external Proxy
  } else if (
    process.env.NEXT_PUBLIC_URL_PROXY_CORS &&
    process.env.NEXT_PUBLIC_URL_PROXY_CORS.startsWith("/api/")
  ) {
    // The Next server is the proxy for this build. A stale saved LAN proxy
    // must not turn an HTTPS page into an insecure cross-origin request.
    return process.env.NEXT_PUBLIC_URL_PROXY_CORS;
  } else if (typeof window !== "undefined") {
    const selected =
      connectionCtx?.proxyInLan && connectionCtx.proxyLocalIP
        ? connectionCtx.proxyLocalIP
        : connectionCtx?.proxyIP;
    // A legacy HTTP URL saved for a remote proxy cannot be used by a local
    // HTTPS standalone page. Prefer its bundled local proxy instead.
    const hostname = proxyHostname(
      selected,
      window.location.hostname,
      window.location.protocol,
    );

    if (hostname) {
      const protocol = window.location.protocol;
      const port =
        protocol.toLowerCase() === "https:"
          ? process.env.NEXT_PUBLIC_PORT_PROXY_CORS_HTTPS
          : process.env.NEXT_PUBLIC_PORT_PROXY_CORS;
      const proxy_url = `${protocol}//${hostname}:${port}`;
      console.debug(`PROXY-2a is : ${proxy_url}`);
      return proxy_url;
    } else {
      console.debug(`PROXY-2b is : ${process.env.NEXT_PUBLIC_URL_PROXY_CORS}`);
      return process.env.NEXT_PUBLIC_URL_PROXY_CORS;
    }
  }
  const proxy_url =
    process.env.NEXT_PUBLIC_URL_PROXY_CORS ||
    `http://127.0.0.1:${process.env.NEXT_PUBLIC_PORT_PROXY_CORS}`;
  console.debug(`PROXY-3 is : ${proxy_url}`);
  return proxy_url;
}

export function getMediaMTXUrl(connectionCtx: ConnectionContextType): string {
  if (isTauri()) {
    return process.env.NEXT_PUBLIC_IP_MEDIAMTX || "localhost";
  } else if (typeof window !== "undefined") {
    const proxy = getProxyUrl(connectionCtx);
    return proxy?.startsWith("http")
      ? new URL(proxy).hostname
      : window.location.hostname;
  }
  return process.env.NEXT_PUBLIC_IP_MEDIAMTX || "localhost"; // Default for server-side
}

export function getIpServerMTX() {
  if (isTauri()) {
    return process.env.NEXT_PUBLIC_IP_MEDIAMTX || "localhost";
  }
  // This address is reached by the proxy process. A listener's wildcard bind
  // address is not a portable destination, particularly on Windows.
  return "127.0.0.1";
}

export async function checkMediaMtxStreamUrls(
  connectionCtx: ConnectionContextType,
  timeout = 5000,
  externalSignal: AbortSignal,
) {
  // Configuration health is independent of legacy singleton stream names and
  // does not claim the telescope's RTSP source is actually producing frames.
  const target = `http://${getIpServerMTX()}:9997/v3/config/global/get`;
  const timeoutSignal = AbortSignal.timeout(timeout);
  const combinedSignal = AbortSignal.any([timeoutSignal, externalSignal]);
  try {
    const response = await fetch(
      `${getProxyUrl(connectionCtx)}?target=${encodeURIComponent(target)}`,
      { signal: combinedSignal },
    );
    if (!response.ok) return false;
    const config = await response.json();
    return (
      config !== null && typeof config === "object" && !Array.isArray(config)
    );
  } catch {
    return false;
  }
}

export function compareURLsIgnoringPort(url1, url2) {
  try {
    if (url1.includes("api") || url2.includes("api")) return false;
    console.debug("compare url1 URL:", url1);
    console.debug("compare url2 URL:", url2);
    const hostname1 = new URL(url1).hostname;
    const hostname2 = new URL(url2).hostname;
    return hostname1 === hostname2;
  } catch (error) {
    console.error("Invalid URL:", error);
    return false;
  }
}

export const isLocalIp = (url) => {
  const islocalIp = /(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.16\.|100\.)/;
  console.debug(`isLocalIp $(url): `, islocalIp.test(url));

  return islocalIp.test(url);
};

export function shouldUseHttpsPreview(
  forceHttps: boolean,
  configuredHttps: boolean | undefined,
  pageProtocol: string,
) {
  return forceHttps && (configuredHttps === true || pageProtocol === "https:");
}

export function getTransfomProxyImageUrl(
  imageUrl,
  proxyUrl: string | undefined = undefined,
  connectionCtx: ConnectionContextType,
  forceHttps: boolean = false,
) {
  const previewHttps = shouldUseHttpsPreview(
    forceHttps,
    connectionCtx?.useHttps,
    typeof window === "undefined" ? "" : window.location.protocol,
  );
  if (connectionCtx && !previewHttps && connectionCtx.proxyInLan) {
    console.debug("getTransfomProxyImageUrl - Local Lan.");
    return imageUrl;
  } else if (connectionCtx && previewHttps && connectionCtx.proxyInLan) {
    console.debug("getTransfomProxyImageUrl - Local Lan Force Https.");
    return imageUrl.replace("http:", "https:");
  } else {
    if (!proxyUrl) proxyUrl = getProxyUrl(connectionCtx);
    if (previewHttps) {
      imageUrl = imageUrl.replace("http:", "https:");
    }
    if (!proxyUrl && !connectionCtx.proxyIP) return imageUrl;

    // this is not working for D3: use MediaMtx proxy with port 8888
    // May not succeed port 8888 must be open on Proxy or Server
    if (imageUrl.includes("8888")) {
      try {
        if (proxyUrl && proxyUrl.includes("api")) {
          console.debug("getTransfomProxyImageUrl - NEXT JS - Local Lan.");
          return imageUrl;
        } else {
          // Use URL object to modify the host
          const url = new URL(imageUrl);
          const url_proxy = new URL(proxyUrl!);
          url.hostname = url_proxy.hostname;

          const newImageUrl = url.toString();
          console.debug("getTransfomProxyImageUrl - newImageUrl:", newImageUrl);
          return newImageUrl;
        }
      } catch (error) {
        console.error("Invalid URL:", getTransfomProxyImageUrl);
        return imageUrl;
      }
    } else {
      const newImageUrl = `${proxyUrl}?target=${encodeURIComponent(imageUrl)}`;
      console.debug("getTransfomProxyImageUrl - proxy:", newImageUrl);
      return newImageUrl;
    }
  }
}
