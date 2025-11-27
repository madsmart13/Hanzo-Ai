// server.js
import express from "express";
import fetch from "node-fetch"; // اگر Node >=18 میشه از global fetch استفاده کرد، اما برای پشتیبانی قطعی node-fetch راحت است
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_KEY) {
  console.error("❌ لطفاً OPENAI_API_KEY را در فایل .env قرار بده.");
  process.exit(1);
}

// مسیر تست ساده
app.get("/test", (req, res) => {
  res.send("Server OK");
});

// مسیر استریم: دریافت پیام از فرانت -> فوروارد به OpenAI (stream: true) -> فرستادن chunks به کلاینت
app.post("/ask", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message missing" });

    // به کلاینت می‌گوییم این پاسخ به صورت stream می‌آید:
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // درخواست به OpenAI
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",   // هر مدلی که می‌خواهی
        input: message,
        stream: true
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("OpenAI error:", r.status, errText);
      res.write(`data: ${JSON.stringify({ error: "openai_error", status: r.status, body: errText })}\n\n`);
      return res.end();
    }

    const reader = r.body.getReader();
    const decoder = new TextDecoder();

    // وقتی داده از OpenAI می‌آید، آن را مستقیم به کلاینت می‌فرستیم به صورت خطوط SSE
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      // برخی سرورهای OpenAI chunkهایی مثل "\n" یا "data: ..." می‌دهند.
      // ما هر چیزی که آمد را برای کلاینت با پیشوند data: می‌نویسیم تا قابل پردازش باشد.
      // (کلاینت همانند قبل chunkها را خواهد خواند)
      res.write(chunk);
    }

    res.end();
  } catch (err) {
    console.error("Server error:", err);
    if (!res.headersSent) res.status(500).json({ error: "server_error" });
    else res.end();
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});
