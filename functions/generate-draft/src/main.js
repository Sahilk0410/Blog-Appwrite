export default async ({ req, res, log, error }) => {
    if (req.method !== "POST") {
        return res.json({ error: "Method not allowed." }, 405);
    }

    const topic = req.bodyJson?.topic;
    if (typeof topic !== "string" || !topic.trim() || topic.length > 500) {
        return res.json({ error: "Provide a topic between 1 and 500 characters." }, 400);
    }

    const apiKey = globalThis.process?.env?.GEMINI_API_KEY;
    if (!apiKey) {
        error("GEMINI_API_KEY is not configured.");
        return res.json({ error: "The AI writer is not configured yet." }, 500);
    }

    try {
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey,
                },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{
                            text: `Write an original blog post draft about this topic: ${topic.trim()}\n\nReturn a JSON object with exactly two string fields: "title" and "content". The content should be plain text with 3 to 5 short paragraphs separated by blank lines. Do not include markdown or HTML.`,
                        }],
                    }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: "OBJECT",
                            properties: {
                                title: { type: "STRING" },
                                content: { type: "STRING" },
                            },
                            required: ["title", "content"],
                        },
                    },
                }),
            }
        );

        if (!response.ok) {
            error(`Gemini request failed with status ${response.status}.`);
            return res.json({ error: "The AI provider could not generate a draft." }, 502);
        }

        const payload = await response.json();
        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text !== "string") {
            error("Gemini returned no draft text.");
            return res.json({ error: "The AI provider returned an empty draft." }, 502);
        }

        const draft = JSON.parse(text);
        if (typeof draft.title !== "string" || typeof draft.content !== "string") {
            error("Gemini returned an invalid draft structure.");
            return res.json({ error: "The AI provider returned an invalid draft." }, 502);
        }

        log("AI draft generated successfully.");
        return res.json({ title: draft.title, content: draft.content });
    } catch (err) {
        error(`AI draft generation failed: ${err.message}`);
        return res.json({ error: "Draft generation failed. Please try again." }, 502);
    }
};