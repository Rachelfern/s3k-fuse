const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "qwen2.5:7b";
const REQUEST_TIMEOUT_MS = 30_000;

function getOllamaConfig() {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_BASE_URL,
    model: process.env.OLLAMA_MODEL ?? DEFAULT_MODEL,
  };
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

export async function generateOllamaJson(prompt: string): Promise<string> {
  const { baseUrl, model } = getOllamaConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    const content = data.message?.content?.trim();

    if (!content) {
      throw new Error("Ollama returned an empty response");
    }

    return content;
  } finally {
    clearTimeout(timeout);
  }
}
