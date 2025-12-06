import express from "express";
import Party from "../models/Party.js";
import User from "../models/User.js";
import Room from "../models/Room.js";
import bcrypt from "bcryptjs";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authRequired);

// GET /api/waitlist  → current waiting / seated
router.get("/", async (req, res) => {
  try {
    const parties = await Party.find({
      user: req.userId,
      state: { $in: ["waiting", "seated"] }
    }).sort({ addedAt: 1 });

    res.json({ parties });
  } catch (err) {
    console.error("Get waitlist error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/waitlist → add party
router.post("/", async (req, res) => {
  try {
    const {
      name,
      size,
      phone,
      notes,
      room,
      handicap,
      highchair,
      window,
      quotedMinutes,
      time
    } = req.body;

    if (!name || !size) {
      return res.status(400).json({ error: "Name and size are required" });
    }

    const party = await Party.create({
      user: req.userId,
      name,
      size: Number(size),
      phone,
      notes,
      room: room || "main",
      handicap: !!handicap,
      highchair: !!highchair,
      window: !!window,
      quotedMinutes: quotedMinutes || null,
      time: time || null
    });

    res.status(201).json({ party });
  } catch (err) {
    console.error("Create party error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/waitlist/:id/state - state transitions
router.patch("/:id/state", async (req, res) => {
  try {
    const { state, tableId, cancelReason } = req.body;

    const party = await Party.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!party) return res.status(404).json({ error: "Party not found" });

    if (state === "seated") {
      party.state = "seated";
      party.seatedAt = new Date();
      if (tableId !== undefined) party.tableId = tableId;
    } else if (state === "completed") {
      party.state = "completed";
      party.completedAt = new Date();
      party.tableId = null;
    } else if (state === "cancelled") {
      party.state = "cancelled";
      party.cancelledAt = new Date();
      party.cancelReason = cancelReason || party.cancelReason;
      party.tableId = null;
    } else if (state === "waiting") {
      party.state = "waiting";
      party.tableId = null;
    }

    await party.save();
    res.json({ party });
  } catch (err) {
    console.error("Update state error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/waitlist/:id - update party details
router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      size,
      phone,
      notes,
      room,
      handicap,
      highchair,
      window,
      quotedMinutes,
      time
    } = req.body;

    const party = await Party.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!party) return res.status(404).json({ error: "Party not found" });

    if (name !== undefined) party.name = name;
    if (size !== undefined) party.size = Number(size);
    if (phone !== undefined) party.phone = phone;
    if (notes !== undefined) party.notes = notes;
    if (room !== undefined) party.room = room;
    if (handicap !== undefined) party.handicap = !!handicap;
    if (highchair !== undefined) party.highchair = !!highchair;
    if (window !== undefined) party.window = !!window;
    if (quotedMinutes !== undefined) party.quotedMinutes = quotedMinutes;
    if (time !== undefined) party.time = time;

    await party.save();
    res.json({ party });
  } catch (err) {
    console.error("Update party error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/waitlist/history?days=30
router.get("/history", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const parties = await Party.find({
      user: req.userId,
      state: { $in: ["completed", "cancelled"] },
      addedAt: { $gte: since }
    }).sort({ addedAt: -1 });

    res.json({ parties });
  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/waitlist/rooms  -> distinct rooms for this user
router.get("/rooms", async (req, res) => {
  try {
    const rooms = await Room.find({ user: req.userId }).sort({ createdAt: 1 });
    const names = rooms.map(r => r.key);
    const list = names.length ? names : ["main"];
    res.json({ rooms: list });
  } catch (err) {
    console.error("Rooms list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/waitlist/history  (requires password)
router.delete("/history", async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid password" });

    const result = await Party.deleteMany({
      user: req.userId,
      state: { $in: ["completed", "cancelled"] }
    });

    res.json({ cleared: result.deletedCount || 0 });
  } catch (err) {
    console.error("Clear history error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/waitlist/reset-layout (no DB persistence yet, returns default layout)
router.post("/reset-layout", async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid password" });

    const defaultLayout = {
      rooms: {
        main: { name: "Main Dining Room", tables: [] }
      }
    };

    res.json({ layout: defaultLayout });
  } catch (err) {
    console.error("Reset layout error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
