"use client";

import { useState, useEffect, useCallback } from "react";

type NotificationPermission = "default" | "granted" | "denied";

interface UsePushNotificationReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  subscription: PushSubscription | null;
  subscribe: () => Promise<PushSubscription | null>;
  unsubscribe: () => Promise<void>;
}

// VAPID公開鍵 (環境変数から取得)
// .env.local に NEXT_PUBLIC_VAPID_PUBLIC_KEY を設定してください
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export function usePushNotification(): UsePushNotificationReturn {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission as NotificationPermission);

      // 既存のサブスクリプションを取得
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) setSubscription(sub);
        })
        .catch(console.error);
    }
  }, []);

  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!isSupported) return null;
    if (!VAPID_PUBLIC_KEY) {
      console.error("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY が設定されていません");
      return null;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as NotificationPermission);

      if (perm !== "granted") return null;

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      setSubscription(sub);

      // サーバーにサブスクリプションを送信
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      return sub;
    } catch (err) {
      console.error("[Push] サブスクリプション失敗:", err);
      return null;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();
      setSubscription(null);

      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
    } catch (err) {
      console.error("[Push] アンサブスクリプション失敗:", err);
    }
  }, [subscription]);

  return { permission, isSupported, subscription, subscribe, unsubscribe };
}
