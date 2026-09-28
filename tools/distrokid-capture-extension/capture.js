(function (root) {
  "use strict";
  const MAX_BATCH = 20;
  const FIELD_MAP = new Map([
    ["title", "title"], ["release", "title"], ["releasetitle", "title"], ["albumtitle", "title"], ["albumname", "title"], ["songtitle", "title"],
    ["artist", "artist"], ["artistname", "artist"], ["artistbandname", "artist"], ["primaryartist", "artist"], ["artiste", "artist"], ["artista", "artist"], ["künstler", "artist"], ["kuenstler", "artist"],
    ["label", "label"], ["recordlabel", "label"], ["labelname", "label"], ["maisondedisque", "label"],
    ["uploaddate", "uploadDate"], ["dateuploaded", "uploadDate"], ["uploaded", "uploadDate"], ["uploadeddate", "uploadDate"], ["hochgeladen", "uploadDate"], ["fechadesubida", "uploadDate"], ["datedemiseenligne", "uploadDate"],
    ["releasedate", "releaseDate"], ["dateofrelease", "releaseDate"], ["datepublished", "releaseDate"],
    ["datedesortie", "releaseDate"], ["fechadelanzamiento", "releaseDate"], ["veröffentlichungsdatum", "releaseDate"], ["veroffentlichungsdatum", "releaseDate"],
    ["発売日", "releaseDate"], ["配信日", "releaseDate"], ["レーベル", "label"], ["アップロード日", "uploadDate"], ["リリース日", "releaseDate"], ["upc", "upc"], ["upccode", "upc"], ["distrokidupc", "upc"],
    ["isrc", "isrc"], ["trackisrc", "isrc"], ["albumuuid", "albumuuid"], ["albumid", "albumuuid"],
    ["primarygenre", "primaryGenre"], ["primarygenretype", "primaryGenre"], ["albumgenreprimary", "primaryGenre"], ["genre", "primaryGenre"],
    ["secondarygenre", "secondaryGenre"], ["secondarygenretype", "secondaryGenre"], ["albumgenresecondary", "secondaryGenre"],
    ["status", "status"], ["releasestatus", "status"], ["visiblestatus", "status"], ["track", "trackTitle"], ["tracktitle", "trackTitle"],
  ]);
  const SENSITIVE_NAME = /password|cookie|token|secret|payment|billing|card|security|authorization|auth|email|phone|csrf|session|credential|api.?key/i;
  const SENSITIVE_VALUE = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|(?:\b(?:bearer|authorization|csrf|session|cookie|password|api.?key)\b)|(?:\b(?:sk|or-v1|gh[pousr]|xox[baprs])[-_][A-Za-z0-9_-]{16,})|(?:\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b)/i;
  const isAlbumUuid = (value) => /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{16}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(String(value ?? ""));
  const text = (value, max = 500) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max) || null;
  const key = (value) => String(value ?? "").normalize("NFKC").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, "");
  const decode = (value) => String(value ?? "").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16))).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  function attrs(tag) {
    const out = {};
    for (const match of tag.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      const name = match[1].toLowerCase();
      const safeNames = new Set(["aria-label", "aria-hidden", "class", "disabled", "for", "hidden", "href", "id", "name", "selected", "type", "value"]);
      const safeDataNames = new Set(["data-field", "data-label", "data-track-row", "data-release-row", "data-artist", "data-albumtitle", "data-album-genre-primary", "data-album-genre-secondary"]);
      if (SENSITIVE_NAME.test(name) || (name.startsWith("data-") ? !safeDataNames.has(name) : !safeNames.has(name))) continue;
      if (name === "value" && !/^<(?:input|option)\b/i.test(tag)) continue;
      out[name] = decode(match[2] ?? match[3] ?? match[4] ?? "");
    }
    return out;
  }
  function fieldName(label) {
    const normalized = key(label);
    if (!normalized || SENSITIVE_NAME.test(String(label ?? ""))) return null;
    return FIELD_MAP.get(normalized) ?? null;
  }

  function safeFieldValue(field, value) {
    const clean = text(value);
    if (!clean || SENSITIVE_VALUE.test(clean)) return null;
    if (field === "upc") return /^\d{8,14}$/.test(clean.replace(/[ -]/g, "")) ? clean.replace(/[ -]/g, "") : null;
    if (field === "isrc") {
      const normalized = clean.replace(/[\s-]/g, "").toUpperCase();
      return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(normalized) ? normalized : null;
    }
    if (field === "albumuuid") return isAlbumUuid(clean) ? clean : null;
    if (field === "releaseDate" || field === "uploadDate") return normalizeDate(clean);
    if (/^\+?[\d().\s-]{7,}\d$/.test(clean)) return null;
    return clean.slice(0, field === "title" || field === "artist" ? 200 : 500);
  }
  function normalizeDate(value) {
    const clean = text(value, 80);
    if (!clean) return null;
    const iso = clean.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/);
    const monthNames = new Map(Object.entries({
      january: 1, jan: 1, janvier: 1, enero: 1, januar: 1,
      february: 2, feb: 2, février: 2, febrero: 2, februar: 2,
      march: 3, mar: 3, mars: 3, marzo: 3, märz: 3, maerz: 3,
      april: 4, avr: 4, avril: 4, abril: 4,
      may: 5, mai: 5, mayo: 5,
      june: 6, jun: 6, juin: 6, junio: 6, juni: 6,
      july: 7, jul: 7, juillet: 7, julio: 7, juli: 7,
      august: 8, aug: 8, août: 8, agosto: 8,
      september: 9, sep: 9, sept: 9, septembre: 9, septiembre: 9,
      october: 10, oct: 10, octobre: 10, octubre: 10, oktober: 10,
      november: 11, nov: 11, novembre: 11, noviembre: 11,
      december: 12, dec: 12, décembre: 12, diciembre: 12, dezember: 12,
    }));
    const makeDate = (year, month, day) => {
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() + 1 !== Number(month) || date.getUTCDate() !== Number(day)) return null;
      return date.toISOString().slice(0, 10);
    };
    const japanese = clean.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
    if (japanese) return makeDate(japanese[1], japanese[2], japanese[3]);
    if (iso) {
      const [year, month, day] = iso[1].split("-");
      return makeDate(year, month, day);
    }
    const monthToken = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre|enero|febrero|marzo|abril|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|januar|februar|märz|maerz|juni|juli|oktober|dezember";
    let match = clean.match(new RegExp(`^(${monthToken})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?[,]?\\s+(\\d{4})$`, "i"));
    if (match) return makeDate(match[3], monthNames.get(match[1].toLocaleLowerCase("en")) ?? monthNames.get(match[1].toLocaleLowerCase()), match[2]);
    match = clean.match(new RegExp(`^(\\d{1,2})[\\s./-]+(${monthToken})\\.?[,]?\\s+(\\d{4})$`, "i"));
    if (match) return makeDate(match[3], monthNames.get(match[2].toLocaleLowerCase("en")) ?? monthNames.get(match[2].toLocaleLowerCase()), match[1]);
    return null;
  }
  const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const SKIP_TAGS = new Set(["script", "style", "noscript", "template", "svg", "iframe", "object"]);
  function parseVisibleTree(markup) {
    const rootNode = { tag: "#root", attrs: {}, children: [] };
    const stack = [rootNode];
    let skipTag = null;
    for (const tokenMatch of String(markup).matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>|[^<]+/gi)) {
      const token = tokenMatch[0];
      const close = token.match(/^<\/([\w:-]+)/);
      const open = token.match(/^<([\w:-]+)\b([^>]*)>/);
      if (skipTag) {
        if (close?.[1]?.toLowerCase() === skipTag) skipTag = null;
        continue;
      }
      if (close) {
        const tag = close[1].toLowerCase();
        for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
        continue;
      }
      if (open) {
        const tag = open[1].toLowerCase();
        if (SKIP_TAGS.has(tag)) { skipTag = tag; continue; }
        const safeAttrs = attrs(open[0]);
        const type = safeAttrs.type?.toLowerCase() ?? "";
        const hiddenStyle = /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(open[0]);
        if ("hidden" in safeAttrs || safeAttrs["aria-hidden"] === "true" || hiddenStyle || (tag === "input" && ["password", "hidden", "file"].includes(type))) {
          if (!VOID_TAGS.has(tag) && !/\/\s*>$/.test(token)) skipTag = tag;
          continue;
        }
        const node = { tag, attrs: safeAttrs, children: [] };
        stack[stack.length - 1].children.push(node);
        if (!VOID_TAGS.has(tag) && !/\/\s*>$/.test(token)) stack.push(node);
        continue;
      }
      if (/^\s*</.test(token)) continue;
      const value = decode(token);
      if (value) stack[stack.length - 1].children.push(value);
    }
    return rootNode;
  }
  function visibleText(node) {
    return typeof node === "string" ? node : node.children.map(visibleText).join(" ").replace(/\s+/g, " ").trim();
  }
  function visibleNodes(rootNode) {
    const result = [];
    const visit = (node) => {
      if (!node || typeof node === "string") return;
      result.push(node);
      node.children.forEach(visit);
    };
    visit(rootNode);
    return result;
  }
  function aliasLabelPair(value) {
    const result = [];
    for (const chunk of String(value ?? "").split(/[|;•\n\r\t]+/)) {
      const match = chunk.trim().match(/^(.{1,48}?)\s*[:：]\s*(.{1,500})$/);
      if (!match) continue;
      const field = fieldName(match[1]);
      const normalized = field && safeFieldValue(field, match[2]);
      if (field && normalized) result.push({ field, label: text(match[1], 48), value: normalized });
    }
    return result;
  }
  function boundedJapaneseDateLabel(value) {
    const match = String(value ?? "").trim().match(/^(アップロード日|リリース日|発売日|配信日)\s*[:：]?\s*(.*)$/);
    if (!match) return null;
    const field = fieldName(match[1]);
    return field === "uploadDate" || field === "releaseDate" ? { field, label: match[1], remainder: match[2] } : null;
  }
  function boundedJapaneseDateValue(value, field) {
    const match = String(value ?? "").match(/\d{4}年\d{1,2}月\d{1,2}日/);
    return match ? safeFieldValue(field, match[0]) : null;
  }
  function visibleLabelPairs(rootNode) {
    const pairs = [];
    const visit = (node, ancestors = []) => {
      if (typeof node === "string") {
        pairs.push(...aliasLabelPair(node).map((pair) => ({ ...pair, hierarchy: ancestors.slice(-5) })));
        return;
      }
      const meaningful = node.children.filter((child) => typeof child !== "string" || child.trim());
      for (let index = 0; index < meaningful.length; index++) {
        const child = meaningful[index];
        const boundedLabel = boundedJapaneseDateLabel(typeof child === "string" ? child : visibleText(child));
        if (boundedLabel) {
          const inlineValue = boundedJapaneseDateValue(boundedLabel.remainder, boundedLabel.field);
          let boundedValue = inlineValue;
          if (!boundedValue) {
            let nextIndex = index + 1;
            while (nextIndex < meaningful.length && typeof meaningful[nextIndex] === "string" && /^[\s:：-]*$/.test(meaningful[nextIndex])) nextIndex++;
            const next = meaningful[nextIndex];
            const nextLabel = next === undefined ? null : boundedJapaneseDateLabel(typeof next === "string" ? next : visibleText(next));
            if (next !== undefined && !nextLabel) boundedValue = boundedJapaneseDateValue(typeof next === "string" ? next : visibleText(next), boundedLabel.field);
          }
          if (boundedValue) pairs.push({ field: boundedLabel.field, label: boundedLabel.label, value: boundedValue, hierarchy: [...ancestors, node.tag].slice(-5) });
        }
        if (typeof child !== "string") {
          const field = fieldName(visibleText(child));
          let nextIndex = index + 1;
          while (nextIndex < meaningful.length && typeof meaningful[nextIndex] === "string" && /^[\s:：-]*$/.test(meaningful[nextIndex])) nextIndex++;
          const next = meaningful[nextIndex];
          if (field && next !== undefined) {
            const candidate = visibleText(next);
            if (typeof next !== "string" && fieldName(candidate)) { visit(child, [...ancestors, node.tag]); continue; }
            const value = safeFieldValue(field, candidate);
            if (value) pairs.push({ field, label: visibleText(child), value, hierarchy: [...ancestors, node.tag, child.tag].slice(-5) });
          }
          visit(child, [...ancestors, node.tag]);
        } else pairs.push(...aliasLabelPair(child).map((pair) => ({ ...pair, hierarchy: ancestors.slice(-5) })));
      }
    };
    visit(rootNode);
    return pairs;
  }
  function stateScriptMetadata(markup) {
    return [...String(markup).matchAll(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi)].slice(0, 30).map((match) => {
      const opening = match[0].match(/^<script\b[^>]*>/i)?.[0] ?? "<script>";
      const a = attrs(opening);
      const type = /^[\w.+/-]{1,80}$/.test(String(a.type ?? "")) ? text(a.type, 80) : null;
      const id = /^[A-Za-z][\w:-]{0,79}$/.test(String(a.id ?? "")) && !SENSITIVE_NAME.test(String(a.id)) ? text(a.id, 80) : null;
      const jsonType = String(type ?? "").toLowerCase() === "application/json";
      const stateId = ["__next_data__", "__initial_state__", "__nuxt_data__"].includes(String(id ?? "").toLowerCase());
      const content = match[0].replace(/^<script\b[^>]*>/i, "").replace(/<\/script\s*>$/i, "");
      return { type, id, json: (jsonType || stateId) && content.length <= 500_000, content: (jsonType || stateId) && content.length <= 500_000 ? content : null };
    });
  }
  function structuredReleaseFields(markup) {
    let best = null;
    let score = 0;
    for (const script of stateScriptMetadata(markup)) {
      if (!script.json || !script.content) continue;
      let parsed;
      try { parsed = JSON.parse(script.content); } catch { continue; }
      const pending = [{ value: parsed, depth: 0, path: [] }];
      let visited = 0;
      while (pending.length && visited++ < 10_000) {
        const current = pending.pop();
        if (!current.value || typeof current.value !== "object" || current.depth > 12) continue;
        const candidate = {};
        for (const name of Object.keys(current.value).slice(0, 200)) {
          if (SENSITIVE_NAME.test(name)) continue;
          const field = fieldName(name);
          const value = current.value[name];
          if (field && ["string", "number"].includes(typeof value)) {
            const normalized = safeFieldValue(field, value);
            if (normalized && candidate[field] == null) candidate[field] = normalized;
          } else if (value && typeof value === "object") pending.push({ value, depth: current.depth + 1, path: [...current.path, name] });
        }
        const identityFields = ["upc", "isrc", "albumuuid", "releaseDate"].filter((field) => candidate[field]);
        const candidateScore = Object.keys(candidate).length + identityFields.length * 2 + (candidate.title && candidate.artist ? 3 : 0);
        const releaseContext = current.path.some((name) => /release|album|track|distribution/i.test(name));
        if (candidateScore > score && (releaseContext || identityFields.length) && (candidate.title || candidate.artist || identityFields.length)) { best = candidate; score = candidateScore; }
      }
    }
    return best ?? {};
  }
  function albumUuidFromUrl(pageUrl) {
    try {
      const url = new URL(pageUrl);
      const segments = url.pathname.split("/").map((segment) => { try { return decodeURIComponent(segment); } catch { return segment; } });
      const pathId = segments.find(isAlbumUuid);
      if (pathId) return pathId;
      for (const name of ["albumuuid", "album_uuid", "albumUuid", "albumid", "albumId", "release_id", "releaseId"]) {
        const queryId = url.searchParams.get(name);
        if (isAlbumUuid(queryId)) return queryId;
      }
      if (/\/dashboard\/album\/?$/i.test(url.pathname)) {
        const dashboardAlbumId = url.searchParams.get("id");
        if (isAlbumUuid(dashboardAlbumId)) return dashboardAlbumId;
      }
    } catch { /* malformed page URL has no release identity */ }
    return null;
  }
  function safePublicUrl(value, pageUrl) {
    try {
      const url = new URL(decode(value), pageUrl);
      if (url.protocol !== "https:" || url.username || url.password) return null;
      if (url.hostname === "distrokid.com" || url.hostname === "www.distrokid.com") {
        const specificHyperFollow = /^\/hyperfollow\/[A-Za-z0-9_-]{1,80}\/[A-Za-z0-9_-]{1,120}\/?$/i.test(url.pathname);
        if (!specificHyperFollow || url.searchParams.get("ref") === "globalmenu") return null;
        url.search = "";
        url.hash = "";
        return url.toString();
      }
      if (url.hostname === "open.spotify.com" && /^\/album\/[A-Za-z0-9]+\/?$/.test(url.pathname)) { url.search = ""; url.hash = ""; return url.toString(); }
      if (url.hostname === "music.apple.com" && /^\/[^/]+\/album\/[^/]+(?:\/\d+)?\/?$/.test(url.pathname)) { url.search = ""; url.hash = ""; return url.toString(); }
      if (url.hostname === "music.youtube.com" && url.pathname === "/watch" && url.searchParams.get("v")) {
        const id = url.searchParams.get("v");
        if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
        url.search = `?v=${encodeURIComponent(id)}`;
        url.hash = "";
        return url.toString();
      }
      if (url.hostname === "music.youtube.com" && url.pathname === "/playlist" && url.searchParams.get("list")) {
        const id = url.searchParams.get("list");
        if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) return null;
        url.search = `?list=${encodeURIComponent(id)}`;
        url.hash = "";
        return url.toString();
      }
      if (url.hostname === "youtu.be" && /^\/[A-Za-z0-9_-]{6,20}\/?$/.test(url.pathname)) { url.search = ""; url.hash = ""; return url.toString(); }
    } catch { /* malformed or unsupported links are ignored */ }
    return null;
  }
  function fromHtml(html, pageUrl, observedAt = new Date().toISOString()) {
    const markup = String(html ?? "");
    const values = {};
    const add = (label, value, inputType = "") => {
      const field = fieldName(label);
      if (!field || ["password", "hidden", "file"].includes(String(inputType).toLowerCase())) return;
      const clean = safeFieldValue(field, value);
      if (clean !== null && values[field] == null) values[field] = clean;
    };
    const tree = parseVisibleTree(markup);
    const nodes = visibleNodes(tree);
    const labels = nodes.filter((node) => node.tag === "label");
    for (const node of nodes) {
      if (["input", "textarea", "select"].includes(node.tag)) {
        const a = node.attrs;
        if (a.disabled != null) continue;
        const controlValue = node.tag === "input" ? a.value : node.tag === "select"
          ? visibleNodes(node).find((child) => child.tag === "option" && child.attrs.selected != null)
            ? visibleText(visibleNodes(node).find((child) => child.tag === "option" && child.attrs.selected != null))
            : null
          : visibleText(node);
        const controlLabels = [a["data-field"], a["data-label"], a["aria-label"], a.name, a.id,
          ...labels.filter((label) => label.attrs.for && label.attrs.for === a.id).map(visibleText)].filter(Boolean);
        for (const label of controlLabels) add(label, controlValue, a.type);
      }
      if (node.attrs["data-field"]) add(node.attrs["data-field"], visibleText(node));
      if (node.attrs["data-albumtitle"] != null) add("title", node.attrs["data-albumtitle"]);
      if (node.attrs["data-album-genre-primary"] != null) add("primaryGenre", node.attrs["data-album-genre-primary"]);
      if (node.attrs["data-album-genre-secondary"] != null) add("secondaryGenre", node.attrs["data-album-genre-secondary"]);
      const classNames = String(node.attrs.class ?? "").split(/\s+/).map((name) => name.toLowerCase());
      if (classNames.includes("album-title")) add("title", visibleText(node));
      if (classNames.includes("band-name")) add("artist", visibleText(node));
      if (classNames.includes("upc")) {
        const match = visibleText(node).match(/^(?:(?:DistroKid\s+)?UPC\s*:?\s*)?(\d{8,14})$/i);
        if (match) add("upc", match[1]);
      }
    }
    for (const pair of visibleLabelPairs(tree)) add(pair.label, pair.value);
    for (const [field, value] of Object.entries(structuredReleaseFields(markup))) add(field, value);
    const tracks = [];
    for (const row of nodes.filter((node) => node.attrs["data-track-row"] != null)) {
      const track = {};
      for (const field of visibleNodes(row).filter((child) => child.attrs["data-field"] === "track-title" || child.attrs["data-field"] === "track-isrc")) {
        const name = field.attrs["data-field"];
        track[name === "track-title" ? "title" : "isrc"] = safeFieldValue(name === "track-title" ? "trackTitle" : "isrc", visibleText(field));
      }
      if (track.title || track.isrc) tracks.push({ title: track.title ?? null, isrc: track.isrc ?? null });
    }
    const urls = [];
    for (const anchor of nodes.filter((node) => node.tag === "a" && node.attrs.href)) {
      try {
        const url = safePublicUrl(anchor.attrs.href, pageUrl);
        if (url) urls.push(url);
      } catch { /* unsafe or malformed links are ignored */ }
    }
    let albumuuid = values.albumuuid;
    albumuuid ??= albumUuidFromUrl(pageUrl);
    if (!albumuuid) {
      let pageOrigin = null;
      try { pageOrigin = new URL(pageUrl).origin; } catch { /* malformed page URL */ }
      for (const anchor of nodes.filter((node) => node.tag === "a" && node.attrs.href)) {
        try {
          const linkedUrl = new URL(anchor.attrs.href, pageUrl);
          if (linkedUrl.origin !== pageOrigin) continue;
          const segments = linkedUrl.pathname.split("/").filter(Boolean);
          const candidate = segments.find((segment, index) => {
            if (!isAlbumUuid(segment)) return false;
            const previous = segments[index - 1]?.toLowerCase();
            return previous === "album" || previous === "release" || previous === "releases";
          });
          if (candidate) { albumuuid = candidate; break; }
        } catch { /* unrelated or malformed link */ }
      }
    }
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
    for (const row of nodes.filter((node) => node.attrs["data-release-row"] != null)) {
      const anchor = visibleNodes(row).find((node) => node.tag === "a" && node.attrs.href);
      if (!anchor) continue;
      let detailUrl;
      try { detailUrl = new URL(decode(anchor.attrs.href), pageUrl); } catch { continue; }
      const album = albumUuidFromUrl(detailUrl.toString());
      let pageOrigin;
      try { pageOrigin = new URL(pageUrl).origin; } catch { continue; }
      if (detailUrl.origin !== pageOrigin || !album) continue;
      const statusNode = visibleNodes(row).find((node) => node.attrs["data-field"] === "status");
      listReleases.push({
        ...release,
        sourceReleaseId: album,
        albumuuid: album,
        title: safeFieldValue("title", visibleText(anchor)),
        artist: safeFieldValue("artist", row.attrs["data-artist"]) ?? values.artist ?? null,
        releaseDate: null,
        primaryGenre: null,
        secondaryGenre: null,
        isrc: null,
        upc: null,
        tracks: [],
        visibleStatus: statusNode ? safeFieldValue("status", visibleText(statusNode)) : values.status ?? null,
        publicUrls: [],
      });
    }
    return { schemaVersion: 1, releases: listReleases.length ? listReleases : [release] };
  }
  function diagnoseHtml(html, pageUrl) {
    const markup = String(html ?? "");
    const tree = parseVisibleTree(markup);
    const snippets = visibleLabelPairs(tree).slice(0, 30).map(({ field, label, value, hierarchy }) => ({
      field, label: text(label, 48), value: SENSITIVE_VALUE.test(String(value)) ? null : text(value, 120), hierarchy: hierarchy.slice(-5),
    }));
    const tags = new Set();
    const classes = new Set();
    const ariaLabels = new Set();
    const dataAttributeNames = new Set();
    const walk = (node) => {
      if (!node || typeof node === "string") return;
      if (node.tag !== "#root") tags.add(node.tag);
      for (const [name, value] of Object.entries(node.attrs)) {
        if (name === "class") for (const token of String(value).split(/\s+/).filter((part) => /^[A-Za-z0-9_-]{1,64}$/.test(part) && !SENSITIVE_NAME.test(part)).slice(0, 8)) classes.add(token);
        if (name === "aria-label" && fieldName(value)) ariaLabels.add(text(value, 48));
        if (name.startsWith("data-")) dataAttributeNames.add(name);
      }
      node.children.forEach(walk);
    };
    walk(tree);
    const scripts = stateScriptMetadata(markup).map(({ type, id, json }) => ({
      type, id: SENSITIVE_NAME.test(String(id ?? "")) ? null : id, hasEmbeddedJson: Boolean(json),
    }));
    let pathname = null;
    try { pathname = new URL(pageUrl).pathname.slice(0, 300); } catch { /* invalid URL */ }
    return { pathname, visibleLabelSnippets: snippets, tags: [...tags].slice(0, 80), safeClasses: [...classes].slice(0, 80), ariaLabels: [...ariaLabels].slice(0, 40), dataAttributeNames: [...dataAttributeNames].slice(0, 40), scripts: scripts.slice(0, 30), embeddedJsonExists: scripts.some((script) => script.hasEmbeddedJson) };
  }
  function fromDocument(document, pageUrl, observedAt = new Date().toISOString()) {
    const escape = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const visible = (element) => {
      if (!element || element.nodeType !== 1) return false;
      const style = document.defaultView?.getComputedStyle?.(element);
      if (element.hidden || element.getAttribute("aria-hidden") === "true" || style?.display === "none" || style?.visibility === "hidden" || style?.opacity === "0") return false;
      return element.tagName?.toLowerCase() === "html" || element.tagName?.toLowerCase() === "body" || element.getClientRects?.().length > 0 || style?.display === "contents";
    };
    const allowedAttributes = ["aria-label", "aria-hidden", "class", "data-field", "data-label", "data-track-row", "data-release-row", "data-artist", "data-albumtitle", "data-album-genre-primary", "data-album-genre-secondary", "disabled", "for", "hidden", "href", "id", "name", "selected", "type"];
    const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
    const serialize = (node) => {
      if (node.nodeType === 3) return escape(node.nodeValue);
      if (node.nodeType !== 1) return "";
      const tag = node.tagName.toLowerCase();
      if (tag === "script") {
        const type = node.getAttribute("type") ?? "";
        const id = node.getAttribute("id") ?? "";
        const isState = type.toLowerCase() === "application/json" || ["__next_data__", "__initial_state__", "__nuxt_data__"].includes(id.toLowerCase());
        if (!isState || String(node.textContent ?? "").length > 500_000) return "";
        const safeType = /^[\w.+/-]{1,80}$/.test(type) ? type : "application/json";
        const safeId = /^[A-Za-z][\w:-]{0,79}$/.test(id) && !SENSITIVE_NAME.test(id) ? id : "";
        return `<script type="${escape(safeType)}"${safeId ? ` id="${escape(safeId)}"` : ""}>${String(node.textContent ?? "")}</script>`;
      }
      if (["style", "noscript", "template", "svg", "iframe", "object"].includes(tag) || !visible(node)) return "";
      const attrsOut = [];
      for (const name of allowedAttributes) {
        if (!node.hasAttribute(name)) continue;
        const value = node.getAttribute(name) ?? "";
        if (["data-field", "data-label", "data-albumtitle", "data-album-genre-primary", "data-album-genre-secondary"].includes(name)) attrsOut.push(`${name}="${escape(value)}"`);
        else if (name === "data-artist" && !SENSITIVE_VALUE.test(value)) attrsOut.push(`${name}="${escape(value)}"`);
        else if (["data-track-row", "data-release-row", "disabled", "hidden", "selected"].includes(name)) attrsOut.push(name);
        else if (name === "value") continue;
        else if (name === "href") attrsOut.push(`${name}="${escape(value)}"`);
        else if (["type", "id", "name", "for", "aria-label", "aria-hidden", "class"].includes(name)) attrsOut.push(`${name}="${escape(value)}"`);
      }
      if (tag === "input") {
        const type = String(node.type ?? node.getAttribute("type") ?? "").toLowerCase();
        if (!["password", "hidden", "file"].includes(type) && node.value != null) attrsOut.push(`value="${escape(node.value)}"`);
      }
      const opening = `<${tag}${attrsOut.length ? ` ${attrsOut.join(" ")}` : ""}>`;
      if (voidTags.has(tag)) return opening;
      const children = Array.from(node.childNodes ?? []).map(serialize).join("");
      return `${opening}${tag === "textarea" ? escape(node.value ?? node.textContent) : children}</${tag}>`;
    };
    return fromHtml(serialize(document.documentElement), pageUrl, observedAt);
  }
  function diagnoseDocument(document, pageUrl) {
    const visibleElement = (element) => {
      const style = document.defaultView?.getComputedStyle?.(element);
      return !element.hidden && element.getAttribute("aria-hidden") !== "true" && style?.display !== "none" && style?.visibility !== "hidden" && style?.opacity !== "0" && (element.getClientRects?.().length > 0 || style?.display === "contents");
    };
    const nodes = [...document.querySelectorAll("*")].filter(visibleElement);
    const tags = [...new Set(nodes.map((node) => node.tagName.toLowerCase()))].slice(0, 80);
    const safeClasses = [...new Set(nodes.flatMap((node) => [...node.classList].filter((part) => /^[A-Za-z0-9_-]{1,64}$/.test(part) && !SENSITIVE_NAME.test(part))))].slice(0, 80);
    const dataAttributeNames = [...new Set(nodes.flatMap((node) => node.getAttributeNames().filter((name) => name.startsWith("data-"))))].slice(0, 40);
    const ariaLabels = [...new Set(nodes.map((node) => node.getAttribute("aria-label")).filter((value) => value && fieldName(value)).map((value) => text(value, 48)))].slice(0, 40);
    const snippets = [];
    for (const node of nodes) {
      const label = text(node.innerText ?? node.textContent, 80);
      const field = fieldName(label);
      if (!field || snippets.length >= 30) continue;
      const next = node.nextElementSibling;
      if (!next || !visibleElement(next)) continue;
      const value = safeFieldValue(field, next.innerText ?? next.textContent);
      if (value) snippets.push({ field, label, value: text(value, 120), hierarchy: [node.parentElement?.parentElement?.tagName, node.parentElement?.tagName, node.tagName].filter(Boolean).map((tag) => tag.toLowerCase()).slice(-5) });
    }
    const scripts = [...document.scripts].slice(0, 30).map((script) => {
      const type = /^[\w.+/-]{1,80}$/.test(script.type ?? "") ? text(script.type, 80) : null;
      const id = /^[A-Za-z][\w:-]{0,79}$/.test(script.id ?? "") && !SENSITIVE_NAME.test(script.id) ? text(script.id, 80) : null;
      const hasEmbeddedJson = String(type ?? "").toLowerCase() === "application/json" || ["__next_data__", "__initial_state__", "__nuxt_data__"].includes(String(id ?? "").toLowerCase());
      return { type, id, hasEmbeddedJson };
    });
    let pathname = null;
    try { pathname = new URL(pageUrl).pathname.slice(0, 300); } catch { /* invalid URL */ }
    return { pathname, visibleLabelSnippets: snippets, tags, safeClasses, ariaLabels, dataAttributeNames, scripts, embeddedJsonExists: scripts.some((script) => script.hasEmbeddedJson) };
  }
  function selectBatchUrls(urls, pageUrl, limit = MAX_BATCH) {
    const origin = new URL(pageUrl).origin;
    const unique = new Set();
    for (const value of urls) {
      try {
        const url = new URL(value, pageUrl);
        if (url.origin !== origin || url.protocol !== "https:" || !albumUuidFromUrl(url.toString())) continue;
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
  const api = { fromHtml, fromDocument, diagnoseHtml, diagnoseDocument, selectBatchUrls, captureBatch, visibleLinks, maxBatch: MAX_BATCH };
  root.MusiamDistroKidCapture = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
