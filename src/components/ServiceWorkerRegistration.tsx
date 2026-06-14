"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // 開発環境ではSWを登録しない + 既存のSWとキャッシュを掃除する。
    // (sw.js は /_next/static/ を Cache First で配信するため、開発中は
    //  古いチャンクが居座り "Cannot read properties of undefined (reading 'call')"
    //  を引き起こす。本番はチャンクがcontent-hash付きなので問題ない)
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => { if (k.startsWith("musiam-")) caches.delete(k); }));
      }
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // 新しいバージョンが利用可能 - 必要に応じて通知できる
              console.log("[SW] 新しいバージョンが利用可能です。");
            }
          });
        });

        if (process.env.NODE_ENV === "development") {
          console.log("[SW] Service Worker 登録成功:", registration.scope);
        }
      } catch (err) {
        console.error("[SW] Service Worker 登録失敗:", err);
      }
    };

    // ページロード後に登録
    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
      return () => window.removeEventListener("load", registerSW);
    }
  }, []);

  return null;
}
