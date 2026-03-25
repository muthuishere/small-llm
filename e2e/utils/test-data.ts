import { readFileSync } from "fs";

export type CollectedTestData = {
  collectedAt: string;
  serverReady: boolean;
  status: {
    model_downloaded: boolean;
    llama_server_running: boolean;
    model_name: string;
  } | null;
};

export const loadTestData = async (path: string): Promise<CollectedTestData> => {
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as CollectedTestData;
};
