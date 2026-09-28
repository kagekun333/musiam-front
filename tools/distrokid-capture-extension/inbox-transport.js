(function (root) {
  "use strict";
  const BASE = "http://127.0.0.1:43127/v1";
  const statusCode = (value) => Number.isInteger(value) && value >= 100 && value <= 599 ? value : null;

  async function send(payload, fetchImpl = fetch) {
    if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.releases) || payload.releases.length > 20) {
      return { ok: false, code: "LOCAL_INBOX_INVALID_PAYLOAD" };
    }
    let challengeResponse;
    try {
      challengeResponse = await fetchImpl(`${BASE}/challenge`, { cache: "no-store" });
    } catch {
      return { ok: false, code: "LOCAL_INBOX_CHALLENGE_FETCH_FAILED" };
    }
    if (!challengeResponse?.ok) {
      const status = statusCode(challengeResponse?.status);
      return { ok: false, code: status ? `LOCAL_INBOX_CHALLENGE_HTTP_${status}` : "LOCAL_INBOX_CHALLENGE_RESPONSE_INVALID" };
    }

    let challenge;
    try { challenge = await challengeResponse.json(); }
    catch { return { ok: false, code: "LOCAL_INBOX_CHALLENGE_RESPONSE_INVALID" }; }
    if (typeof challenge?.nonce !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(challenge.nonce)) {
      return { ok: false, code: "LOCAL_INBOX_CHALLENGE_RESPONSE_INVALID" };
    }

    let response;
    try {
      response = await fetchImpl(`${BASE}/releases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-MUSIAM-Session": challenge.nonce },
        body: JSON.stringify(payload),
      });
    } catch {
      return { ok: false, code: "LOCAL_INBOX_POST_FETCH_FAILED" };
    }
    if (!response?.ok) {
      const status = statusCode(response?.status);
      if (status === 401) return { ok: false, code: "LOCAL_INBOX_SESSION_REJECTED" };
      if (status === 403) return { ok: false, code: "LOCAL_INBOX_ORIGIN_REJECTED" };
      if ([400, 413, 415].includes(status)) return { ok: false, code: "LOCAL_INBOX_INVALID_PAYLOAD" };
      return { ok: false, code: status ? `LOCAL_INBOX_POST_HTTP_${status}` : "LOCAL_INBOX_POST_RESPONSE_INVALID" };
    }
    let result;
    try { result = await response.json(); }
    catch { return { ok: false, code: "LOCAL_INBOX_POST_RESPONSE_INVALID" }; }
    if (!Number.isInteger(result?.accepted) || result.accepted < 0 || result.accepted > 20) {
      return { ok: false, code: "LOCAL_INBOX_POST_RESPONSE_INVALID" };
    }
    return { ok: true, accepted: result.accepted };
  }

  root.MusiamReleaseInboxTransport = Object.freeze({ send });
})(globalThis);
