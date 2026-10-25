require("dotenv").config();

const bcrypt = require("bcryptjs");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");

const app = express();
const port = Number(process.env.PORT || 5000);
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be set to a random value of at least 32 characters.");
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || process.env.DB_DATABASE || "miyeon",
  ssl: ["localhost", "127.0.0.1"].includes(process.env.DB_HOST || "localhost")
    ? undefined
    : { minVersion: "TLSv1.2", rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
});

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);

function createToken(user) {
  return jwt.sign(
    { name: user.name, email: user.email },
    jwtSecret,
    { subject: String(user.id), expiresIn: "1d" },
  );
}

function requireAuth(req, res, next) {
  const authorization = req.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Please log in to continue." });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Your session has expired. Please log in again." });
    }
    return next(error);
  }
}

app.get("/", (req, res) => {
  res.json({ message: "Node.js API is running!" });
});

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!name || name.length > 100) {
      return res.status(400).json({ message: "Name must be between 1 and 100 characters." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({ message: "Password must be at least 8 characters and no more than 72 bytes." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, passwordHash],
    );
    const user = { id: result.insertId, name, email };

    return res.status(201).json({ user, token: createToken(user) });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "An account with that email already exists." });
    }
    return next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const [rows] = await pool.execute(
      "SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }

    const publicUser = { id: user.id, name: user.name, email: user.email };
    return res.json({ user: publicUser, token: createToken(publicUser) });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: Number(req.user.sub),
      name: req.user.name,
      email: req.user.email,
    },
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) {
    return next(error);
  }
  return res.status(500).json({ message: "Something went wrong. Please try again." });
});

async function start() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Unable to start API. Check MySQL connection settings and database access.", error);
  process.exitCode = 1;
});
