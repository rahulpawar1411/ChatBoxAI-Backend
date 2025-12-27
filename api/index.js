const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const serverless = require("serverless-http");

dotenv.config();

const app = express();

// ======================
// CORS
// ======================
app.use(
  cors({
    origin: "https://chat-box-ai-frontend.vercel.app", // frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());

// ======================
// TEMP CHAT STORAGE
// ======================
const CHAT_FILE = path.join(process.cwd(), "tempChats.json");

if (!fs.existsSync(CHAT_FILE)) {
  fs.writeFileSync(CHAT_FILE, "[]", "utf-8");
}

let chats = JSON.parse(fs.readFileSync(CHAT_FILE, "utf-8") || "[]");

const saveChats = () =>
  fs.writeFileSync(CHAT_FILE, JSON.stringify(chats, null, 2));

const clearChats = () => {
  chats = [];
  saveChats();
};

// ======================
// OPENAI CONFIG
// ======================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ======================
// SYSTEM PROMPT
// ======================
const SYSTEM_PROMPT = `
You are a personal AI assistant of Great Websoft.
Answer ONLY using company information.
Never mention OpenAI or ChatGPT.

Company:
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

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.send("✅ Backend is running");
});

// ======================
// ASK ENDPOINT
// ======================
app.post("/ask", async (req, res) => {
  const { question } = req.body;
  if (!question) return res.json({ answer: "Please ask a question." });

  chats.push({ role: "user", content: question });
  saveChats();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...chats],
    });

    const answer = completion.choices[0].message.content;
    chats.push({ role: "assistant", content: answer });
    saveChats();

    res.json({ answer });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.json({ answer: "AI service error." });
  }
});

// ======================
// CLEAR CHAT
// ======================
app.post("/clear", (req, res) => {
  clearChats();
  res.json({ success: true });
});

// ======================
// EXPORT SERVERLESS HANDLER FOR VERCEL
// ======================
module.exports = serverless(app);

// ======================
// LOCAL DEVELOPMENT (optional)
// ======================
// if (require.main === module) {
//   const PORT = process.env.PORT || 5000;
//   app.listen(PORT, () =>
//     console.log(`✅ Local backend running on http://localhost:${PORT}`)
//   );
// }
