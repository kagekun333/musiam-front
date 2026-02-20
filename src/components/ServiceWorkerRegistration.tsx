"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

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
