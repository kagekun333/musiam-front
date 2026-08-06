import puppeteer from "puppeteer";

const url = "https://www.hakusyaku.xyz/chat?utm_source=verification&utm_medium=automated_verification&utm_campaign=metal_print_verification&utm_content=ABI-LW01-05";
const expected = "静けさと力強さなら、今は静けさがほしい";

async function main() {
  const browser = await puppeteer.launch({ headless: true, channel: "chrome" });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });
    await page.waitForFunction((text) => Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.includes(String(text))), { timeout: 15_000 }, expected);
    const found = await page.$$eval("button", (buttons, text) => buttons.some((button) => button.textContent?.includes(String(text))), expected);
    if (!found) throw new Error("campaign-context starter is absent");
    console.log(JSON.stringify({ status: "PASS", content: "ABI-LW01-05", campaignContextStarterVisible: true, verificationTrafficOnly: true }));
  } finally {
    await browser.close();
  }
}

void main();
