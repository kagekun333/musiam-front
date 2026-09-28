let captured = null;
const statusNode = document.getElementById("status");
const probeButton = document.getElementById("probe");
const downloadButton = document.getElementById("download");
const sendButton = document.getElementById("send");

probeButton.addEventListener("click", async () => {
  statusNode.textContent = "Checking the local inbox challenge only…";
  let result;
  try { result = await globalThis.MusiamReleaseInboxTransport.probe(); }
  catch { result = { ok: false, code: "LOCAL_INBOX_CHALLENGE_RESPONSE_INVALID" }; }
  if (result.ok) {
    statusNode.textContent = result.code;
    return;
  }
  const category = result.originCategory ? `; Origin category: ${result.originCategory}` : "";
  statusNode.textContent = `${result.code}${category}. No payload was sent.`;
});

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
      if (!isBatch) return { captures: [api.fromDocument(document, location.href)], failures: [], capturedCount: 1, sourceTruncated: false, batchLimit: api.maxBatch };
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

async function diagnose() {
  statusNode.textContent = "Inspecting allowlisted structure in this page locally…";
  const tab = await currentTab();
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["capture.js"] });
  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const api = globalThis.MusiamDistroKidCapture;
      if (!api) throw new Error("Capture helper unavailable");
      return api.diagnoseDocument(document, location.href);
    },
  });
  statusNode.textContent = `Local structure diagnostic (not saved or sent):\n${JSON.stringify(result[0]?.result ?? {}, null, 2)}`;
}

document.getElementById("capture").addEventListener("click", () => capture(false).catch((error) => { statusNode.textContent = error.message; }));
document.getElementById("capture-all").addEventListener("click", () => capture(true).catch((error) => { statusNode.textContent = error.message; }));
document.getElementById("diagnose").addEventListener("click", () => diagnose().catch(() => { statusNode.textContent = "Local structure diagnostic failed; no page data was saved or sent."; }));
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
  const result = await globalThis.MusiamReleaseInboxTransport.send(captured.document);
  statusNode.textContent = result.ok
    ? `Saved ${result.accepted} record(s) to the local inbox.`
    : `${result.code}. No remote destination was contacted.`;
});
