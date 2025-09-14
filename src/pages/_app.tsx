import type { AppProps } from "next/app";
import { useEffect } from "react";
import posthog from "posthog-js";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY as string | undefined;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST as string | undefined;
    if (!key || !host) return;

    posthog.init(key, {
      api_host: host,
      capture_pageview: true, // 初回ロードのみ自動
      person_profiles: "identified_only",
    });

    const onRoute = (url: string) => posthog.capture("$pageview", { $current_url: url });
    router.events.on("routeChangeComplete", onRoute);
    return () => router.events.off("routeChangeComplete", onRoute);
  }, [router.events]);

  // 任意：手動イベント送信用にwindowへ出す
  useEffect(() => { (window as any).posthog = posthog; }, []);

  return <Component {...pageProps} />;
}
