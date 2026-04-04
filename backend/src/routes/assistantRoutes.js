import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import axios from "axios";

dotenv.config();
const router = express.Router();

// 🔥 Gemini Caller Function
async function callGemini(model, contents) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });

  return await res.json();
}

// 🔥 MAIN ROUTE
router.post("/message", async (req, res) => {
  try {
    console.log("REQ BODY =>", req.body);

    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // =====================================
    // 🔥 ML CALL (FIXED PAYLOAD)
    // =====================================
    let mlData = null;

    try {
      const mlPayload = {
        N: req.body.N || 90,
        P: req.body.P || 40,
        K: req.body.K || 40,
        temperature: req.body.temperature || 25,
        humidity: req.body.humidity || 80,
        ph: req.body.ph || 6.5,
        rainfall: req.body.rainfall || 200,
      };

      const mlResponse = await axios.post(
        `${process.env.ML_SERVICE_URL}/predict`,
        mlPayload,
      );

      mlData = mlResponse.data;
      console.log("ML RESPONSE =>", mlData);
    } catch (err) {
      console.log("ML Error:", err.message);
    }

    // =====================================
    // 🔥 SYSTEM PROMPT
    // =====================================
    const systemPrompt = `
You are an AI Farming Assistant.

${
  mlData
    ? `Recommended Crop: ${mlData.recommended_crop}`
    : "Crop prediction not available"
}

Use Hinglish and simple farmer-friendly language.
Give irrigation, fertilizer, pest control and organic alternatives.
Give short step-by-step answers.
`;

    // =====================================
    // 🔥 MESSAGES BUILD
    // =====================================
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

    // =====================================
    // 🔥 GEMINI CALL
    // =====================================
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

    console.log("Fallback Gemini 2.5...");
    data = await callGemini("gemini-2.5-flash", messages);

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ AI failed to respond.";

    return res.json({
      success: true,
      reply,
      ml: mlData,
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;
