import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import cropRoutes from "./routes/cropRoutes.js";
import soilRoutes from "./routes/soilRoutes.js";
import organicTipsRoutes from "./routes/organicTipsRoutes.js";
import cropCalendarRoutes from "./routes/cropCalendarRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Static folder for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/auth/user", userRoutes);

app.use("/api/crop", cropRoutes);           // Crop recommendation / other crop-related API
app.use("/api/soil", soilRoutes);
app.use("/api/organic", organicTipsRoutes);

// FIXED — No more path conflict
app.use("/api/crop", cropCalendarRoutes);   // Crop Calendar route (changed from /api/crop)

app.use("/api/assistant", assistantRoutes);     // AI Farming Assistant route

// Health check
app.get("/", (req, res) => res.send("Smart Farming Assistant Backend Running"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
export default app;
