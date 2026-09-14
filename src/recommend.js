export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { year, make, model, budget, priorityLabel } = req.body || {};

  if (!year || !make || !model) {
    res.status(400).json({ error: "Missing year, make, or model" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
    return;
  }

  const prompt = `You are a car audio fitment specialist. A customer has a ${year} ${make} ${model}, a budget of ${budget}, and wants a "${priorityLabel}" sound priority.

Recommend a realistic, buildable car audio setup for this exact vehicle and budget. Respond with ONLY raw JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "headUnit": "string or 'Factory unit is fine' if no change needed",
  "speakers": "string with size and type, e.g. 6.5 inch component set",
  "subwoofer": "string, or 'Not recommended at this budget' if applicable",
  "amplifier": "string with channel count and rough wattage",
  "installDifficulty": "Easy" | "Moderate" | "Involved",
  "wiringNotes": "one or two sentences on wiring/install considerations specific to this vehicle",
  "estimateLow": number (USD, parts only),
  "estimateHigh": number (USD, parts only),
  "reasoning": "two sentences on why this setup fits the stated priority and budget"
}`;

  try {
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error("Anthropic API error:", data);
      res.status(502).json({ error: "Upstream API error" });
      return;
    }

    const raw = (data.content || [])
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    res.status(200).json(parsed);
  } catch (err) {
    console.error("Recommendation error:", err);
    res.status(500).json({ error: "Failed to generate recommendation" });
  }
}