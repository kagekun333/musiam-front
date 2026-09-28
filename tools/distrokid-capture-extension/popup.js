let captured = null;
const statusNode = document.getElementById("status");
const downloadButton = document.getElementById("download");
const sendButton = document.getElementById("send");

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) throw new Error("Open a DistroKid page first.");
  const url = new URL(tab.url);
  if (url.protocol !== "https:" || !["distrokid.com", "www.distrokid.com"].includes(url.hostname)) throw new Error("Capture is limited to https://distrokid.com pages.");
  return tab;
}

async function capture(batch) {
  statusNode.textContent = "Reading allowlisted visible release fields…";
  const tab = await currentTab();
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["capture.js"] });
  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (isBatch) => {
      const api = globalThis.MusiamDistroKidCapture;
      if (!api) throw new Error("Capture helper unavailable");
      if (!isBatch) return { captures: [api.fromHtml(document.documentElement.outerHTML, location.href)], failures: [], capturedCount: 1, sourceTruncated: false, batchLimit: api.maxBatch };
      const links = api.visibleLinks(document, location.href);
      return api.captureBatch(links, location.href);
    },
    args: [batch],
  });
  captured = result[0]?.result ?? null;
  if (!captured?.captures?.length) throw new Error(captured?.failures?.length ? "No release pages were captured; see sanitized failure count." : "No supported release metadata was found.");
  const releases = captured.captures.flatMap((item) => item.releases ?? []);
  captured.document = { schemaVersion: 1, releases };
  downloadButton.disabled = false;
  sendButton.disabled = false;
  statusNode.textContent = `Captured ${releases.length} release record(s); failed pages: ${captured.failures.length}; batch truncated: ${Boolean(captured.sourceTruncated)}. Nothing was sent. Choose Download or the local inbox explicitly.`;
}

document.getElementById("capture").addEventListener("click", () => capture(false).catch((error) => { statusNode.textContent = error.message; }));
document.getElementById("capture-all").addEventListener("click", () => capture(true).catch((error) => { statusNode.textContent = error.message; }));
downloadButton.addEventListener("click", () => {
  if (!captured?.document) return;
  const blob = new Blob([`${JSON.stringify(captured.document, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  chrome.downloads?.download({ url, filename: `musiam-release-capture-${new Date().toISOString().slice(0, 10)}.json`, saveAs: true });
  if (!chrome.downloads) window.open(url);
  statusNode.textContent = "Canonical JSON is ready for local save.";
});
sendButton.addEventListener("click", async () => {
  if (!captured?.document) { statusNode.textContent = "Capture release records first."; return; }
  try {
    const challengeResponse = await fetch("http://127.0.0.1:43127/v1/challenge", { cache: "no-store" });
    if (!challengeResponse.ok) throw new Error("LOCAL_INBOX_UNAVAILABLE");
    const challenge = await challengeResponse.json();
    const response = await fetch("http://127.0.0.1:43127/v1/releases", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-MUSIAM-Session": challenge.nonce },
      body: JSON.stringify(captured.document),
    });
    if (!response.ok) throw new Error(response.status === 401 ? "Local inbox authentication failed." : "Local inbox rejected the batch.");
    const result = await response.json();
    statusNode.textContent = `Saved ${result.accepted} record(s) to the local inbox.`;
  } catch {
    statusNode.textContent = "Local inbox unavailable. Use Download canonical JSON; nothing was sent remotely.";
  }
});
