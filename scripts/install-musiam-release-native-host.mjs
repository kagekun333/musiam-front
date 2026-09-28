import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST_NAME = "com.hakusyaku.musiam.release_inbox";
const EXTENSION_ORIGIN = "chrome-extension://okhkdhofjkdogeilbnmmmdpflppeabff/";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hostPath = path.join(repoRoot, "tools/release-native-host/run-host");
const installDirectory = path.join(process.env.HOME ?? "", "Library/Application Support/Google/Chrome/NativeMessagingHosts");
const target = path.join(installDirectory, `${HOST_NAME}.json`);

if (!process.env.HOME || !path.isAbsolute(hostPath) || !path.isAbsolute(installDirectory)) {
  process.stderr.write("Native host install precondition failed.\n");
  process.exit(1);
}

await fs.mkdir(installDirectory, { recursive: true, mode: 0o700 });
const directoryInfo = await fs.lstat(installDirectory);
if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) {
  process.stderr.write("Native host install directory is not a plain directory.\n");
  process.exit(1);
}
try {
  const existingInfo = await fs.lstat(target);
  if (existingInfo.isSymbolicLink() || !existingInfo.isFile()) {
    process.stderr.write("The exact native host target is not a regular file.\n");
    process.exit(1);
  }
  const existing = JSON.parse(await fs.readFile(target, "utf8"));
  if (existing.name !== HOST_NAME) {
    process.stderr.write("The exact native host target belongs to another host.\n");
    process.exit(1);
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const manifest = {
  name: HOST_NAME,
  description: "Hakusyaku MUSIAM release inbox",
  path: hostPath,
  type: "stdio",
  allowed_origins: [EXTENSION_ORIGIN],
};
const temporaryTarget = `${target}.tmp-${process.pid}`;
await fs.writeFile(temporaryTarget, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx", mode: 0o600 });
await fs.rename(temporaryTarget, target);
await fs.chmod(target, 0o600);
process.stdout.write(`Installed ${HOST_NAME} for the exact MUSIAM extension origin.\n`);
