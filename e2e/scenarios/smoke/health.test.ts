import { describe, test, expect, beforeAll } from "bun:test";
import { getConfig } from "../../config";
import { createSmallLLMClient } from "../../clients/small-llm/client";
import { loadTestData, type CollectedTestData } from "../../utils/test-data";

const config = getConfig();
let testData: CollectedTestData;

beforeAll(async () => {
  testData = await loadTestData(config.generatedDataFile);
});

describe("health smoke", () => {
  test("server is reachable and healthy", async () => {
    const client = createSmallLLMClient({ baseUrl: config.api.baseUrl });
    const res = await client.health.check();
    expect(res.ok).toBe(true);
    expect(res.body.status).toBe("ok");
  });

  test("collected test data confirms server ready", () => {
    expect(testData.serverReady).toBe(true);
  });
});

describe("status smoke", () => {
  test("GET /api/status — returns model info", async () => {
    const client = createSmallLLMClient({ baseUrl: config.api.baseUrl });
    const status = await client.status.get();
    expect(status.model_downloaded).toBe(true);
    expect(status.server_running).toBe(true);
    expect(status.model_name).toBeTruthy();
    expect(status.model_name.toLowerCase()).toContain("qwen");
  });
});
