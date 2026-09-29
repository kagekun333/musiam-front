export type RuntimeDataScope = "production" | "preview" | "development" | "local";

export function resolveRuntimeDataScope(vercelEnv: string | undefined): RuntimeDataScope {
  if (vercelEnv === "production" || vercelEnv === "preview" || vercelEnv === "development") return vercelEnv;
  return "local";
}

export function chatHistoryKey(conversationId: string, scope: RuntimeDataScope): string {
  switch (scope) {
    case "production": return `chat-history:v1:${conversationId}`;
    case "preview": return `chat-history:preview:v1:${conversationId}`;
    case "development": return `chat-history:development:v1:${conversationId}`;
    case "local": return `chat-history:local:v1:${conversationId}`;
  }
}

export function appleReleaseOverlayKey(scope: RuntimeDataScope): string {
  switch (scope) {
    case "production": return "musiam:release-overlay:v1";
    case "preview": return "musiam:release-overlay:preview:v1";
    case "development": return "musiam:release-overlay:development:v1";
    case "local": return "musiam:release-overlay:local:v1";
  }
}
