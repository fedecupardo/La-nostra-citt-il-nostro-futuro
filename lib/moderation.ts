type TextModerationResult = {
  allowed: boolean;
  isReport: boolean;
  abusive: boolean;
  reason: string;
};

type ImageModerationResult = {
  allowed: boolean;
  relevant: boolean;
  safe: boolean;
  reason: string;
};

const model = () => process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseResult(content: unknown): TextModerationResult {
  if (typeof content !== "string") throw new Error("OpenRouter ha restituito una risposta non valida.");
  const json = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(json) as Partial<TextModerationResult>;
  if (
    typeof parsed.allowed !== "boolean" ||
    typeof parsed.isReport !== "boolean" ||
    typeof parsed.abusive !== "boolean" ||
    typeof parsed.reason !== "string"
  ) {
    throw new Error("OpenRouter ha restituito un risultato di moderazione non valido.");
  }
  return parsed as TextModerationResult;
}

function parseImageResult(content: unknown): ImageModerationResult {
  if (typeof content !== "string") throw new Error("OpenRouter ha restituito una risposta non valida.");
  const json = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(json) as Partial<ImageModerationResult>;
  if (
    typeof parsed.allowed !== "boolean" ||
    typeof parsed.relevant !== "boolean" ||
    typeof parsed.safe !== "boolean" ||
    typeof parsed.reason !== "string"
  ) {
    throw new Error("OpenRouter ha restituito un risultato immagini non valido.");
  }
  return parsed as ImageModerationResult;
}

async function openRouter(body: unknown): Promise<unknown> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${required("OPENROUTER_API_KEY")}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
      "X-Title": "Milano Partecipa",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`OpenRouter non disponibile (HTTP ${response.status}).`);
  return response.json();
}

export async function moderateText(title: string, body: string): Promise<TextModerationResult> {
  const payload = (await openRouter({
      model: model(),
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Sei il moderatore di una piattaforma civica italiana. Valuta il testo senza discriminare opinioni politiche legittime. " +
            "Una segnalazione deve descrivere un problema, una richiesta o un'idea concreta relativa alla città. " +
            "Blocca insulti, minacce, odio, molestie, volgarità gratuite, contenuti sessuali espliciti, spam, pubblicità e testo illeggibile. " +
            "Rispondi esclusivamente con JSON: allowed (boolean), isReport (boolean), abusive (boolean), reason (string breve in italiano).",
        },
        {
          role: "user",
          content: `Titolo:\n${title}\n\nTesto:\n${body}`,
        },
      ],
    })) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  return parseResult(payload.choices?.[0]?.message?.content);
}

export async function moderateImage(
  title: string,
  description: string,
  bytes: Uint8Array,
  mime: string,
): Promise<ImageModerationResult> {
  const payload = (await openRouter({
    model: model(),
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Sei il moderatore delle immagini di una piattaforma civica italiana. " +
          "Valuta se l'immagine è pubblicabile e attinente alla segnalazione. " +
          "Blocca nudità o sessualità esplicita, violenza grafica, odio, minacce, propaganda estremista, " +
          "contenuti illegali, dati personali leggibili, immagini manipolate per ingannare, pubblicità e spam. " +
          "Rispondi esclusivamente con JSON: allowed (boolean), relevant (boolean), safe (boolean), reason (string breve in italiano).",
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Titolo:\n${title}\n\nDescrizione:\n${description}` },
          {
            type: "image_url",
            image_url: { url: `data:${mime};base64,${Buffer.from(bytes).toString("base64")}` },
          },
        ],
      },
    ],
  })) as { choices?: Array<{ message?: { content?: unknown } }> };
  return parseImageResult(payload.choices?.[0]?.message?.content);
}

export function assertTextAllowed(result: TextModerationResult): void {
  if (!result.allowed || !result.isReport || result.abusive) {
    throw new Error(
      result.abusive
        ? "Il testo contiene termini offensivi o volgari."
        : "Il contenuto non sembra una segnalazione o proposta civica pertinente.",
    );
  }
}

export function assertImageAllowed(result: ImageModerationResult): void {
  if (!result.allowed || !result.relevant || !result.safe) {
    throw new Error(
      !result.safe
        ? "Un'immagine contiene contenuti non pubblicabili."
        : "Un'immagine non è pertinente alla segnalazione.",
    );
  }
}
