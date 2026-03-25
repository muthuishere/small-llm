import { describe, test, expect, beforeAll, setDefaultTimeout } from "bun:test";

setDefaultTimeout(120_000);
import { getConfig } from "../../config";
import { createSmallLLMClient } from "../../clients/small-llm/client";
import { loadTestData, type CollectedTestData } from "../../utils/test-data";

const config = getConfig();
const client = createSmallLLMClient({
  baseUrl: config.api.baseUrl,
  inferenceTimeout: config.timeouts.inference,
});
let testData: CollectedTestData;

beforeAll(async () => {
  testData = await loadTestData(config.generatedDataFile);
  expect(testData.serverReady).toBe(true);
});

describe("chatwithtools smoke", () => {
  test("POST /api/chatwithtools — calculator tool invocation", async () => {
    const result = await client.chatWithTools.send({
      message: "What is 15 multiplied by 7?",
      tools: ["calculator"],
    });

    expect(result.response).toBeTruthy();
    expect(result.tokens_used).toBeGreaterThan(0);
    // Tool calls may or may not be populated depending on model behavior
    // but response should always be present
  });

  test("POST /api/chatwithtools — datetime tool", async () => {
    const result = await client.chatWithTools.send({
      message: "What is the current date and time?",
      tools: ["datetime"],
    });

    expect(result.response).toBeTruthy();
    expect(result.tokens_used).toBeGreaterThan(0);
  });

  test("POST /api/chatwithtools — with context", async () => {
    const result = await client.chatWithTools.send({
      message: "Based on the menu, what is the total for a burger and fries?",
      tools: ["calculator"],
      context: "Menu: Burger $8.50, Fries $3.25, Drink $2.00, Salad $6.75",
    });

    expect(result.response).toBeTruthy();
    expect(result.tokens_used).toBeGreaterThan(0);
  });

  test("POST /api/chatwithtools — no tools specified still works", async () => {
    const result = await client.chatWithTools.send({
      message: "Hello, how are you?",
    });

    expect(result.response).toBeTruthy();
    expect(result.tokens_used).toBeGreaterThan(0);
  });

  test("POST /api/chatwithtools — missing message returns 400", async () => {
    const res = await client.transport.post("/api/chatwithtools", {});
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
