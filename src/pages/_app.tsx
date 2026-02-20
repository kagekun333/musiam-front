import "@/app/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useRouter } from "next/router";
import GlobalBackground from "@/components/GlobalBackground";
import Nav from "@/components/Nav";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || typeof window === "undefined") return;

    (async () => {
      const { default: posthog } = await import("posthog-js");
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        capture_pageview: false,
      });

      // ルーティング時のPV
      const handleRoute = () => posthog.capture("$pageview");
      router.events.on("routeChangeComplete", handleRoute);
      return () => router.events.off("routeChangeComplete", handleRoute);
    })();
  }, [router.events]);

  return (
    <>
      <GlobalBackground />
      <Nav />
      <Component {...pageProps} />
    </>
  );
}
