"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { base } from "viem/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── 重要：walletconnect/metamask SDK を使わず、injected のみ ──
const config = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
  connectors: [injected({ shimDisconnect: true })],
  ssr: true,
});

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={base}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
