// server.js
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.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;

if (!OPENAI_KEY) {
    console.error("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");
    process.exit(1);
}

app.post("/api/hanzo", async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message missing" });

    try {
        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${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}`
            },
            body: JSON.stringify({
                model: "gpt-4.1-mini",
                input: message,
                stream: true
            })
        });

        // Streaming
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            res.write(chunk); // مستقیم به کلاینت ارسال می‌کنیم
        }
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
