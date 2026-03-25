const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

const optionalEnv = (name: string, fallback?: string): string | undefined =>
  process.env[name]?.trim() || fallback;

export type E2EConfig = {
  api: { baseUrl: string };
  timeouts: {
    startup: number;
    inference: number;
    health: number;
  };
  generatedDataFile: string;
};

export const getConfig = (): E2EConfig => ({
  api: {
    baseUrl: optionalEnv("API_BASE_URL", "http://localhost:8080")!.replace(/\/+$/, ""),
  },
  timeouts: {
    startup: Number(optionalEnv("STARTUP_TIMEOUT_MS", "300000")),
    inference: Number(optionalEnv("INFERENCE_TIMEOUT_MS", "120000")),
    health: Number(optionalEnv("HEALTH_TIMEOUT_MS", "5000")),
  },
  generatedDataFile: new URL(".generated/test-data.json", import.meta.url).pathname,
});
