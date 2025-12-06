import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Party from "../models/Party.js";
import Room from "../models/Room.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, restaurantName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      passwordHash,
      restaurantName: restaurantName || "CoHost Restaurant"
    });

    // Seed default room (empty)
    await Room.create({
      user: user._id,
      name: "Main Dining Room",
      key: "main",
      tables: []
    });

    // Seed demo parties for new accounts so analytics and history have data
    try {
      const now = Date.now();
      const sampleParties = [
        {
          user: user._id,
          name: "Johnson Family",
          size: 4,
          room: "main",
          state: "completed",
          addedAt: new Date(now - 3 * 60 * 60 * 1000),
          seatedAt: new Date(now - 2.5 * 60 * 60 * 1000),
          completedAt: new Date(now - 2 * 60 * 60 * 1000)
        },
        {
          user: user._id,
          name: "Smith Group",
          size: 6,
          room: "patio",
          state: "cancelled",
          addedAt: new Date(now - 90 * 60 * 1000),
          cancelledAt: new Date(now - 60 * 60 * 1000),
          cancelReason: "No-show"
        },
        {
          user: user._id,
          name: "Lee Party",
          size: 2,
          room: "bar",
          state: "waiting",
          addedAt: new Date(now - 15 * 60 * 1000)
        },
        {
          user: user._id,
          name: "Garcia Reunion",
          size: 5,
          room: "main",
          state: "seated",
          addedAt: new Date(now - 50 * 60 * 1000),
          seatedAt: new Date(now - 30 * 60 * 1000)
        },
        {
          user: user._id,
          name: "Patel Duo",
          size: 2,
          room: "bar",
          state: "completed",
          addedAt: new Date(now - 26 * 60 * 60 * 1000),
          seatedAt: new Date(now - 25.5 * 60 * 60 * 1000),
          completedAt: new Date(now - 25 * 60 * 60 * 1000)
        }
      ];
      await Party.insertMany(sampleParties);
    } catch (seedErr) {
      console.warn("Failed to seed sample parties for new user", seedErr);
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        restaurantName: user.restaurantName
      }
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        restaurantName: user.restaurantName
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user._id,
      email: user.email,
      restaurantName: user.restaurantName
    });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// PATCH /api/auth/me  (update restaurantName)
router.patch("/me", async (req, res) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { restaurantName } = req.body;

    const user = await User.findById(payload.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (restaurantName && typeof restaurantName === "string") {
      user.restaurantName = restaurantName.trim() || user.restaurantName;
      await user.save();
    }

    res.json({
      id: user._id,
      email: user.email,
      restaurantName: user.restaurantName
    });
  } catch (err) {
    console.error("Update /me error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;
