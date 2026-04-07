export interface AIResponse {
  content: string;
  usage: { input: number; output: number };
}

export async function callModel(
  token: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 2048,
): Promise<AIResponse> {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch(
        "https://models.inference.ai.azure.com/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
            temperature: 0.1,
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = (await res.json()) as {
          choices: Array<{ message: { content: string } }>;
          usage: { prompt_tokens: number; completion_tokens: number };
        };
        return {
          content: json.choices[0].message.content,
          usage: {
            input: json.usage.prompt_tokens,
            output: json.usage.completion_tokens,
          },
        };
      }

      if (res.status === 429 || res.status >= 500) {
        const delay = 1000 * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      const errorText = await res.text();
      throw new Error(`AI API error: ${res.status} ${errorText.substring(0, 200)}`);
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof DOMException && err.name === "AbortError") {
        if (attempt < maxRetries - 1) {
          continue;
        }
        throw new Error("AI API: request timed out after 30s (all retries exhausted)");
      }

      throw err;
    }
  }

  throw new Error("AI API: max retries exceeded");
}
