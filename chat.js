
export default async function handler(req, res) {

    // CORS - allow browser requests from any origin
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle browser preflight request
    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: "Groq API key is missing."
        });
    }

    try {
        const { messages } = req.body || {};

        if (
            !Array.isArray(messages) ||
            messages.length === 0 ||
            messages.length > 12
        ) {
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
                !message.content.trim() ||
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
                            content: "You are JARVIS Lite, a helpful study assistant. Explain concepts clearly, help with school subjects, and support exam preparation."
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
            console.error("Groq error:", data);

            return res.status(502).json({
                error: "Groq API request failed."
            });
        }

        return res.status(200).json({
            answer: data.choices?.[0]?.message?.content ||
                "No response received."
        });

    } catch (error) {
        console.error("Backend error:", error);

        return res.status(500).json({
            error: "Internal server error."
        });
    }
}
