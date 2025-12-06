import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "../models/index.js";
import authRoutes from "./routes/authRoutes.js";
const { sequelize } = db;

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("Backend running with PostgreSQL");
});

const PORT = process.env.PORT || 5000;


app.use("/api/auth", authRoutes);


app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log(" PostgreSQL Connected");
  } catch (e) {
    console.log("❌ Failed to connect:", e.message);
  }

  console.log(` Server running on port ${PORT}`);
});
