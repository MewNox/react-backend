require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);

app.get("/", (req, res) => {
  res.json({
    message: "Node.js API is running!",
  });
});

app.get("/api/hello", (req, res) => {
  res.json({
    message: "Hello from Node.js backend!",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});