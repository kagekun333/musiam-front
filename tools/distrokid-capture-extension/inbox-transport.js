(function (root) {
  "use strict";
  const HOST = "com.hakusyaku.musiam.release_inbox";
  const MAX_RELEASES = 20;
  const SAFE_CODES = new Set([
    "NATIVE_HOST_INVALID_MESSAGE",
    "NATIVE_HOST_INVALID_RELEASE_BATCH",
    "NATIVE_HOST_WRITE_FAILED",
    "NATIVE_HOST_NOT_INSTALLED",
    "NATIVE_HOST_NOT_ALLOWED",
    "NATIVE_HOST_UNAVAILABLE",
    "NATIVE_HOST_INVALID_RESPONSE",
  ]);

  function mapRuntimeError(message) {
    const normalized = typeof message === "string" ? message.toLowerCase() : "";
    if (normalized.includes("forbidden") || normalized.includes("not allowed")) return "NATIVE_HOST_NOT_ALLOWED";
    if (normalized.includes("host not found") || normalized.includes("native messaging host not found")) return "NATIVE_HOST_NOT_INSTALLED";
    return "NATIVE_HOST_UNAVAILABLE";
  }

  function sendMessage(message, runtime = globalThis.chrome?.runtime) {
    return new Promise((resolve) => {
      if (!runtime || typeof runtime.sendNativeMessage !== "function") {
        resolve({ ok: false, code: "NATIVE_HOST_UNAVAILABLE" });
        return;
      }
      try {
        runtime.sendNativeMessage(HOST, message, (response) => {
          const lastError = runtime.lastError;
          if (lastError) {
            resolve({ ok: false, code: mapRuntimeError(lastError.message) });
            return;
          }
          if (!response || typeof response !== "object" || typeof response.ok !== "boolean") {
            resolve({ ok: false, code: "NATIVE_HOST_INVALID_RESPONSE" });
            return;
          }
          resolve(response);
        });
      } catch (error) {
        resolve({ ok: false, code: mapRuntimeError(error instanceof Error ? error.message : "") });
      }
    });
  }

  async function probe(runtime) {
    const result = await sendMessage({ op: "ping" }, runtime);
    if (result.ok && result.bridge === "MUSIAM_RELEASE_NATIVE_HOST") {
      return { ok: true, code: "NATIVE_RELEASE_BRIDGE_PASS" };
    }
    return { ok: false, code: SAFE_CODES.has(result.code) ? result.code : "NATIVE_HOST_INVALID_RESPONSE" };
  }

  async function send(payload, runtime) {
    if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.releases) || payload.releases.length > MAX_RELEASES) {
      return { ok: false, code: "NATIVE_HOST_INVALID_RELEASE_BATCH" };
    }
    const result = await sendMessage({ op: "saveReleaseBatch", payload }, runtime);
    if (result.ok && Number.isInteger(result.accepted) && result.accepted >= 0 && result.accepted <= MAX_RELEASES) {
      return { ok: true, accepted: result.accepted };
    }
    return { ok: false, code: SAFE_CODES.has(result.code) ? result.code : "NATIVE_HOST_INVALID_RESPONSE" };
  }

  root.MusiamReleaseInboxTransport = Object.freeze({ probe, send, hostName: HOST });
})(globalThis);
