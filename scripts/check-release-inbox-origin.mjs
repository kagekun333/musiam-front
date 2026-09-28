import { pathToFileURL } from "node:url";

export function compareReleaseInboxOrigin(extensionId, configuredExtensionOrigin) {
  if (!/^[a-p]{32}$/.test(String(extensionId ?? ""))) return { status: "INVALID_EXTENSION_ID" };
  const expectedOrigin = `chrome-extension://${extensionId}`;
  if (typeof configuredExtensionOrigin !== "string" || !/^chrome-extension:\/\/[a-p]{32}$/.test(configuredExtensionOrigin)) {
    return { status: "INVALID_CONFIGURED_ORIGIN", expectedOrigin };
  }
  return configuredExtensionOrigin === expectedOrigin
    ? { status: "MATCH", expectedOrigin, configuredOrigin: configuredExtensionOrigin }
    : { status: "MISMATCH", expectedOrigin, configuredOrigin: configuredExtensionOrigin };
}

function argument(name) {
  return process.argv.slice(2).find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const extensionId = argument("extension-id");
  const configuredOrigin = argument("configured-extension-origin");
  const result = compareReleaseInboxOrigin(extensionId, configuredOrigin);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.status !== "MATCH") process.exitCode = 1;
}
