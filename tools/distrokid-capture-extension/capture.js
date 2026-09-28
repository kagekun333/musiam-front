(function (root) {
  "use strict";
  const MAX_BATCH = 20;
  const SAFE_PUBLIC_HOSTS = new Set(["music.apple.com", "open.spotify.com", "music.youtube.com", "youtu.be"]);
  const FIELD_MAP = new Map([
    ["title", "title"], ["releasetitle", "title"], ["albumtitle", "title"],
    ["artist", "artist"], ["artistname", "artist"], ["artistbandname", "artist"],
    ["label", "label"], ["recordlabel", "label"],
    ["uploaddate", "uploadDate"], ["dateuploaded", "uploadDate"],
    ["releasedate", "releaseDate"], ["upc", "upc"], ["isrc", "isrc"], ["albumuuid", "albumuuid"],
    ["primarygenre", "primaryGenre"], ["genre", "primaryGenre"], ["secondarygenre", "secondaryGenre"],
    ["status", "status"], ["releaseStatus", "status"],
    ["tracktitle", "trackTitle"], ["trackisrc", "trackIsrc"],
  ]);
  const isAlbumUuid = (value) => /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{16}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(String(value ?? ""));
  const text = (value, max = 500) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max) || null;
  const key = (value) => String(value ?? "").normalize("NFKC").toLowerCase().replace(/[\s\W_]+/g, "");
  const decode = (value) => String(value ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  function attrs(tag) {
    const out = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? "");
    return out;
  }
  const strip = (value) => decode(String(value ?? "").replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "").replace(/<[^>]*>/g, " "));
  function fieldName(label) {
    const normalized = key(label);
    if (!normalized || /password|cookie|token|secret|payment|billing|cardnumber|securitycode|authorization|email|phone/.test(normalized)) return null;
    return FIELD_MAP.get(normalized) ?? null;
  }
  function fromHtml(html, pageUrl, observedAt = new Date().toISOString()) {
    const markup = String(html ?? "");
    const values = {};
    const add = (label, value, inputType = "") => {
      const field = fieldName(label);
      if (!field || ["password", "hidden", "file"].includes(String(inputType).toLowerCase())) return;
      const clean = text(value);
      if (clean !== null && values[field] == null) values[field] = clean;
    };
    const controls = [...markup.matchAll(/<(input|textarea|select)\b[^>]*>(?:([\s\S]*?)<\/\1\s*>)?/gi)];
    for (const match of controls) {
      const a = attrs(match[0]);
      if (a["aria-hidden"] === "true" || "hidden" in a || a.disabled != null) continue;
      const labels = [a["data-field"], a["data-label"], a["aria-label"], a.name, a.id,
        ...[...markup.matchAll(/<label\b[^>]*>[\s\S]*?<\/label\s*>/gi)].map((entry) => {
          const la = attrs(entry[0].match(/^<label\b[^>]*>/i)?.[0] ?? "");
          return la.for && la.for === a.id ? strip(entry[0].replace(/^<label\b[^>]*>/i, "").replace(/<\/label\s*>$/i, "")) : null;
        })].filter(Boolean);
      const value = a.value ?? (match[1].toLowerCase() === "input" ? null : strip(match[2]));
      for (const label of labels) add(label, value, a.type);
    }
    for (const match of markup.matchAll(/<([a-z][\w:-]*)\b[^>]*data-field\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/\1\s*>/gi)) {
      const fieldAttrs = attrs(match[0].match(/^<[^>]+>/)?.[0] ?? "");
      if (fieldAttrs["aria-hidden"] === "true" || "hidden" in fieldAttrs) continue;
      add(match[2] ?? match[3], strip(match[4]));
    }
    for (const match of markup.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt\s*>\s*<dd\b[^>]*>([\s\S]*?)<\/dd\s*>/gi)) add(strip(match[1]), strip(match[2]));
    const tracks = [];
    for (const row of markup.matchAll(/<tr\b[^>]*data-track-row[^>]*>([\s\S]*?)<\/tr\s*>/gi)) {
      const track = {};
      for (const field of row[1].matchAll(/<(?:td|span|div)\b[^>]*data-field\s*=\s*(?:"(track-title|track-isrc)"|'(track-title|track-isrc)')[^>]*>([\s\S]*?)<\/(?:td|span|div)\s*>/gi)) {
        const name = field[1] ?? field[2];
        track[name === "track-title" ? "title" : "isrc"] = text(strip(field[3]));
      }
      if (track.title || track.isrc) tracks.push({ title: track.title ?? null, isrc: track.isrc ?? null });
    }
    const urls = [];
    for (const match of markup.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>/gi)) {
      try {
        const url = new URL(decode(match[1] ?? match[2]), pageUrl);
        if (url.protocol === "https:" && (SAFE_PUBLIC_HOSTS.has(url.hostname) || (url.hostname === "distrokid.com" && url.pathname.startsWith("/hyperfollow/")))) urls.push(url.toString());
      } catch { /* unsafe or malformed links are ignored */ }
    }
    let albumuuid = values.albumuuid;
    try {
      const segments = new URL(pageUrl).pathname.split("/");
      albumuuid ??= segments.find(isAlbumUuid) ?? null;
    } catch { /* page URL is not a source of identity */ }
    const isrcs = tracks.map((track) => track.isrc).filter(Boolean);
    const uniqueIsrcs = [...new Set(isrcs)];
    const release = {
      releaseSource: "distrokid",
      sourceReleaseId: albumuuid ?? values.sourceReleaseId ?? null,
      title: values.title ?? null,
      artist: values.artist ?? null,
      releaseDate: values.releaseDate ?? null,
      primaryGenre: values.primaryGenre ?? null,
      secondaryGenre: values.secondaryGenre ?? null,
      isrc: uniqueIsrcs.length === 1 ? uniqueIsrcs[0] : values.isrc ?? null,
      upc: values.upc ?? null,
      artworkRef: null,
      publicUrls: [...new Set(urls)],
      sourceObservedAt: observedAt,
      label: values.label ?? null,
      albumuuid: albumuuid ?? null,
      uploadDate: values.uploadDate ?? null,
      tracks,
      visibleStatus: values.status ?? null,
    };
    const listReleases = [];
    for (const row of markup.matchAll(/<(tr|li|article)\b[^>]*data-release-row[^>]*>([\s\S]*?)<\/\1\s*>/gi)) {
      const rowAttributes = attrs(row[0].match(/^<[^>]+>/)?.[0] ?? "");
      const anchorMatch = row[2].match(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a\s*>/i);
      if (!anchorMatch) continue;
      let detailUrl;
      try { detailUrl = new URL(decode(anchorMatch[1] ?? anchorMatch[2]), pageUrl); } catch { continue; }
      const album = detailUrl.pathname.split("/").find(isAlbumUuid);
      if (detailUrl.origin !== new URL(pageUrl).origin || !album) continue;
      const statusMatch = row[2].match(/<(?:span|td|div)\b[^>]*data-field\s*=\s*(?:"status"|'status')[^>]*>([\s\S]*?)<\/(?:span|td|div)\s*>/i);
      listReleases.push({
        ...release,
        sourceReleaseId: album,
        albumuuid: album,
        title: text(strip(anchorMatch[3])),
        artist: text(rowAttributes["data-artist"]) ?? values.artist ?? null,
        releaseDate: null,
        primaryGenre: null,
        secondaryGenre: null,
        isrc: null,
        upc: null,
        tracks: [],
        visibleStatus: statusMatch ? text(strip(statusMatch[1])) : values.status ?? null,
        publicUrls: [],
      });
    }
    return { schemaVersion: 1, releases: listReleases.length ? listReleases : [release] };
  }
  function selectBatchUrls(urls, pageUrl, limit = MAX_BATCH) {
    const origin = new URL(pageUrl).origin;
    const unique = new Set();
    for (const value of urls) {
      try {
        const url = new URL(value, pageUrl);
        if (url.origin !== origin || url.protocol !== "https:" || !url.pathname.split("/").some(isAlbumUuid)) continue;
        unique.add(url.toString());
      } catch { /* ignored */ }
    }
    const all = [...unique];
    return { urls: all.slice(0, Math.max(0, Math.min(MAX_BATCH, limit))), truncated: all.length > MAX_BATCH || all.length > limit, candidateCount: all.length };
  }
  async function captureBatch(urls, pageUrl, fetchImpl = fetch, delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
    const selection = selectBatchUrls(urls, pageUrl);
    const captured = [];
    const failures = [];
    for (let index = 0; index < selection.urls.length; index++) {
      const target = selection.urls[index];
      try {
        const response = await fetchImpl(target, { credentials: "include", redirect: "error", signal: AbortSignal.timeout(8000) });
        if (!response.ok || new URL(response.url || target).origin !== new URL(pageUrl).origin) throw new Error("PAGE_UNAVAILABLE");
        const declared = Number(response.headers?.get?.("content-length") ?? 0);
        if (declared > 2 * 1024 * 1024) throw new Error("PAGE_TOO_LARGE");
        const html = await response.text();
        if (html.length > 2 * 1024 * 1024) throw new Error("PAGE_TOO_LARGE");
        captured.push(fromHtml(html, target));
      } catch (error) {
        failures.push({ detailUrl: target, reason: error?.message === "PAGE_TOO_LARGE" ? "PAGE_TOO_LARGE" : "PAGE_UNAVAILABLE" });
      }
      if (index < selection.urls.length - 1) await delay(250);
    }
    return { captures: captured, failures, candidateCount: selection.candidateCount, capturedCount: captured.length, sourceTruncated: selection.truncated, batchLimit: MAX_BATCH };
  }
  function visibleLinks(document, pageUrl) {
    return [...document.querySelectorAll("a[href]")]
      .filter((anchor) => anchor.getAttribute?.("aria-hidden") !== "true" &&
        typeof anchor.getClientRects === "function" && anchor.getClientRects().length > 0)
      .map((anchor) => anchor.href)
      .filter((href) => {
        try { return Boolean(href) && new URL(href).origin === new URL(pageUrl).origin; }
        catch { return false; }
      });
  }
  const api = { fromHtml, selectBatchUrls, captureBatch, visibleLinks, maxBatch: MAX_BATCH };
  root.MusiamDistroKidCapture = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
