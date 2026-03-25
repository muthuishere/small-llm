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

describe("chatwithobject smoke", () => {
  test("POST /api/chatwithobject — extracts structured data from text", async () => {
    const result = await client.chatWithObject.extract({
      message:
        "John Smith is 30 years old and works as a software engineer at Google.",
      schema: {
        name: "string",
        age: "number",
        job_title: "string",
        company: "string",
      },
    });

    expect(result.result).toBeTruthy();
    expect(result.tokens_used).toBeGreaterThan(0);
    expect(result.raw_response).toBeTruthy();

    const extracted = result.result as Record<string, unknown>;
    expect(extracted).toHaveProperty("name");
    expect(extracted).toHaveProperty("age");
  });

  test("POST /api/chatwithobject — with few-shot examples", async () => {
    const result = await client.chatWithObject.extract({
      message: "The laptop costs $999 and has 16GB RAM.",
      schema: {
        product: "string",
        price: "number",
        ram: "string",
      },
      few_shot_examples: [
        {
          input: "The phone costs $699 and has 8GB RAM.",
          output: { product: "phone", price: 699, ram: "8GB" },
        },
      ],
    });

    expect(result.result).toBeTruthy();
    expect(result.tokens_used).toBeGreaterThan(0);
  });

  test("POST /api/chatwithobject — missing required fields returns 400", async () => {
    const res = await client.transport.post("/api/chatwithobject", {
      message: "some text",
      // missing schema
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
