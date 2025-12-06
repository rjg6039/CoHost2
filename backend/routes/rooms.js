import express from "express";
import Room from "../models/Room.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();
router.use(authRequired);

// List rooms
router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find({ user: req.userId }).sort({ createdAt: 1 });
    res.json({ rooms });
  } catch (err) {
    console.error("List rooms error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create room
router.post("/", async (req, res) => {
  try {
    const { name, key } = req.body || {};
    if (!name) return res.status(400).json({ error: "Name is required" });

    const room = await Room.create({
      user: req.userId,
      name,
      key: key || name.toLowerCase().replace(/\s+/g, "-"),
      tables: []
    });
    res.status(201).json({ room });
  } catch (err) {
    console.error("Create room error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update room tables / name
router.put("/:id", async (req, res) => {
  try {
    const { tables, name } = req.body || {};
    const room = await Room.findOne({ _id: req.params.id, user: req.userId });
    if (!room) return res.status(404).json({ error: "Room not found" });

    if (name) room.name = name;
    if (Array.isArray(tables)) room.tables = tables;

    await room.save();
    res.json({ room });
  } catch (err) {
    console.error("Update room error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete room
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Room.deleteOne({ _id: req.params.id, user: req.userId });
    if (!deleted.deletedCount) return res.status(404).json({ error: "Room not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete room error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
