import { getConfig } from "../config";
import { createSmallLLMClient } from "../clients/small-llm/client";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const config = getConfig();

type CollectedTestData = {
  collectedAt: string;
  serverReady: boolean;
  status: {
    model_downloaded: boolean;
    llama_server_running: boolean;
    model_name: string;
  } | null;
};

async function waitForServer(baseUrl: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  const client = createSmallLLMClient({ baseUrl });

  console.log(`⏳ Waiting for server at ${baseUrl} (timeout: ${timeoutMs / 1000}s)...`);

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await client.health.check();
      if (res.ok) {
        console.log(`✅ Server healthy after ${((Date.now() - start) / 1000).toFixed(1)}s`);
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.error(`❌ Server not ready after ${timeoutMs / 1000}s`);
  return false;
}

async function main() {
  const ready = await waitForServer(config.api.baseUrl, config.timeouts.startup);

  let status = null;
  if (ready) {
    const client = createSmallLLMClient({ baseUrl: config.api.baseUrl });
    try {
      status = await client.status.get();
      console.log(`📊 Status: model=${status.model_name}, downloaded=${status.model_downloaded}, running=${status.llama_server_running}`);
    } catch (e) {
      console.warn(`⚠️  Could not fetch status: ${e}`);
    }
  }

  const data: CollectedTestData = {
    collectedAt: new Date().toISOString(),
    serverReady: ready,
    status,
  };

  mkdirSync(dirname(config.generatedDataFile), { recursive: true });
  writeFileSync(config.generatedDataFile, JSON.stringify(data, null, 2));
  console.log(`💾 Test data written to ${config.generatedDataFile}`);

  if (!ready) {
    process.exit(1);
  }
}

main();
