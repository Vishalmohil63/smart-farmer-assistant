import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import axios from "axios";

dotenv.config();
const router = express.Router();

// Gemini Caller Function
async function callGemini(model, contents) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });

  return await res.json();
}

router.post("/message", async (req, res) => {
  try {
    console.log("REQ BODY =>", req.body);

    const { message, history } = req.body;

    if (!message)
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });

    // 🔥 ML CALL START
    let mlData = null;

    try {
      const mlResponse = await axios.post(
        `${process.env.ML_SERVICE_URL}/predict`,
        req.body
      );
      mlData = mlResponse.data;
    } catch (err) {
      console.log("ML Error:", err.message);
    }
    // 🔥 ML CALL END

    const systemPrompt = `
You are an AI Farming Assistant.  
Use Hinglish and simple farmer-friendly language.  
Give irrigation, fertilizer, pest control and organic alternatives.  
Give short, practical, step-by-step answers.
`;

    const messages = [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },

      ...(history || []).map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      })),

      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    // ---------------------------------
    // 1) TRY MAIN MODEL → gemini-2.0-flash
    // ---------------------------------
    console.log("Trying Gemini 2.0 Flash...");
    let data = await callGemini("gemini-2.0-flash", messages);

    if (!data.error) {
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "⚠️ No content returned.";

      return res.json({
        success: true,
        reply,
        ml: mlData,
      });
    }

    console.log("Gemini 2.0 Flash Error >>", data.error);

    // ---------------------------------
    // 2) FALLBACK → gemini-2.5-flash
    // ---------------------------------
    console.log("Trying Gemini 2.5 Flash Fallback...");
    data = await callGemini("gemini-2.5-flash", messages);

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ AI unable to generate a response.";

    return res.json({
      success: true,
      reply,
      ml: mlData,
    });

  } catch (err) {
    console.error("AI Assistant Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while generating AI response.",
    });
  }
});

export default router;