
export default async function handler(req, res) {
    const allowedOrigin = process.env.ALLOWED_ORIGIN;
    const origin = req.headers.origin;

    // CORS configuration
    if (origin && origin === allowedOrigin) {
        res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    }

    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    // Check API key
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: "Groq API key is not configured."
        });
    }

    try {
        const { messages } = req.body || {};

        // Validate messages
        if (!Array.isArray(messages) || messages.length === 0 ||
            messages.length > 12) {
            return res.status(400).json({
                error: "Invalid messages."
            });
        }

        const validMessages = [];

        for (const message of messages) {
            if (
                !message ||
                !["user", "assistant"].includes(message.role) ||
                typeof message.content !== "string" ||
                message.content.length === 0 ||
                message.content.length > 6000
            ) {
                return res.status(400).json({
                    error: "Invalid message format."
                });
            }

            validMessages.push({
                role: message.role,
                content: message.content
            });
        }

        const systemPrompt = `
You are JARVIS Lite, the AI study assistant
inside Study Hub.

Help students with:
- School subjects and concepts
- Exam preparation
- Timetables and study planning
- Homework explanations
- General questions

Be friendly, clear and accurate.
Use simple explanations when appropriate.
Never invent facts when uncertain.
`;

        // Call Groq
        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt
                        },
                        ...validMessages
                    ],
                    temperature: 0.7,
                    max_completion_tokens: 1000
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Groq API error:", data);

            return res.status(502).json({
                error: "Groq could not process the request."
            });
        }

        const answer =
            data.choices?.[0]?.message?.content;

        if (!answer) {
            return res.status(502).json({
                error: "No response received from Groq."
            });
        }

        return res.status(200).json({
            answer
        });

    } catch (error) {
        console.error("Backend error:", error);

        return res.status(500).json({
            error: "Internal server error."
        });
    }
}
