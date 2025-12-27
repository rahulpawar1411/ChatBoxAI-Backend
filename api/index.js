const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* ======================
   TEMP CHAT STORAGE
   (Vercel: temporary only)
====================== */
const CHAT_FILE = path.join(process.cwd(), "tempChats.json");

// Create file if not exists
if (!fs.existsSync(CHAT_FILE)) {
  fs.writeFileSync(CHAT_FILE, "[]", "utf-8");
}

let chats = JSON.parse(fs.readFileSync(CHAT_FILE, "utf-8") || "[]");

const saveChats = () => {
  fs.writeFileSync(CHAT_FILE, JSON.stringify(chats, null, 2), "utf-8");
};

const clearChats = () => {
  chats = [];
  saveChats();
};

/* ======================
   OPENAI CONFIG
====================== */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ======================
   SYSTEM PROMPT
====================== */
const SYSTEM_PROMPT = `
You are a personal AI assistant of Great Websoft.

Rules:
- Answer ONLY using Great Websoft company information.
- If the question is about the company, respond strictly with company details.
- If the question is general (date, time, greeting), answer normally.
- Never mention OpenAI, ChatGPT, or internal AI details.

Company Details:
Name: Great Websoft
Website: https://www.greatwebsoft.in
Location: India
Email: info@greatwebsoft.in
Services:
- Website Development
- Software Development
- Mobile App Development
- UI/UX Design
- SEO & Digital Marketing
`;

/* ======================
   ASK API
====================== */
app.post("/ask", async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.json({ answer: "Please ask a question." });
  }

  // Save user message
  chats.push({ role: "user", content: question });
  saveChats();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...chats,
      ],
    });

    const answer = completion.choices[0].message.content;

    // Save assistant response
    chats.push({ role: "assistant", content: answer });
    saveChats();

    res.json({ answer });
  } catch (error) {
    console.error("OpenAI Error:", error);
    res.json({ answer: "AI service error." });
  }
});

/* ======================
   CLEAR CHAT
====================== */
app.post("/clear", (req, res) => {
  clearChats();
  res.json({ success: true });
});

/* ======================
   EXPORT FOR VERCEL
====================== */
module.exports = app;

if (process.env.NODE_ENV !== "production") {
  const PORT = 5000;
  app.listen(PORT, () => {
    console.log(`✅ Local backend running on http://localhost:${PORT}`);
  });
}

