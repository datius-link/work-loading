import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import db from "../models/index.js";
import authRoutes from "./routes/authRoutes.js";
import serviceProviderRoutes from "./routes/serviceProvideProfile/serviceProviderRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";

dotenv.config();
const { sequelize } = db;

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// 1️⃣ Create HTTP server
const httpServer = createServer(app);

// 2️⃣ Create WebSocket server
export const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// 3️⃣ WebSocket logic
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log("Joined room:", userId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// 4️⃣ Routes
app.use("/api/auth", authRoutes);
app.use("/api/service-provider", serviceProviderRoutes);
app.use("/api/jobs", jobRoutes);

const PORT = process.env.PORT || 5000;

// 5️⃣ Start server
httpServer.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log("🔥 Server + PostgreSQL + WebSockets running on port", PORT);
  } catch (e) {
    console.log("❌ DB Connection Failed:", e.message);
  }
});
