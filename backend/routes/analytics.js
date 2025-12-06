import express from "express";
import OpenAI from "openai";
import Party from "../models/Party.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.use(authRequired);

function computeMetrics(parties) {
  const totalParties = parties.length;
  let totalGuests = 0;
  let totalWaitMinutes = 0;
  let waitsCount = 0;
  let cancelledCount = 0;
  const byHour = {};

  for (const p of parties) {
    totalGuests += p.size || 0;
    if (p.state === "cancelled") cancelledCount++;

    if (p.addedAt && p.seatedAt) {
      const diffMs = p.seatedAt - p.addedAt;
      const minutes = diffMs / 60000;
      if (minutes >= 0 && minutes < 240) {
        totalWaitMinutes += minutes;
        waitsCount++;
      }
    }

    const d = p.addedAt || p.createdAt;
    if (d) {
      const hour = new Date(d).getHours();
      if (!byHour[hour]) byHour[hour] = { parties: 0, guests: 0 };
      byHour[hour].parties++;
      byHour[hour].guests += p.size || 0;
    }
  }

  const avgWaitMinutes = waitsCount ? totalWaitMinutes / waitsCount : 0;
  const avgPartySize = totalParties ? totalGuests / totalParties : 0;

  const hourly = Object.entries(byHour)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([hour, val]) => ({
      hour: Number(hour),
      parties: val.parties,
      guests: val.guests
    }));

  return {
    totalParties,
    totalGuests,
    avgPartySize,
    avgWaitMinutes,
    cancelledCount,
    hourly
  };
}

// GET /api/analytics/summary?days=30
router.get("/summary", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const parties = await Party.find({
      user: req.userId,
      addedAt: { $gte: since }
    });

    const metrics = computeMetrics(parties);
    res.json({ metrics });
  } catch (err) {
    console.error("Analytics summary error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/analytics/insights?days=30
router.get("/insights", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const parties = await Party.find({
      user: req.userId,
      addedAt: { $gte: since }
    }).limit(300);

    const metrics = computeMetrics(parties);

    if (!process.env.OPENAI_API_KEY) {
      const topHour =
        metrics.hourly.sort((a, b) => b.guests - a.guests)[0]?.hour ?? null;

      return res.json({
        insights: [
          "Backend is running in demo mode. Add an OpenAI API key to enable live AI insights.",
          `Across the last ${days} days, average wait time is ${metrics.avgWaitMinutes.toFixed(
            1
          )} minutes for ${metrics.totalParties} parties.`,
          topHour !== null
            ? `Guest volume peaks around ${topHour}:00. Consider heavier coverage around that hour.`
            : "Traffic is too low or too flat to identify a clear peak hour yet."
        ]
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an analytics assistant for a restaurant waitlist app. " +
            "Given metrics and sample data, produce 3–5 concise operational insights about peaks, staffing, and guest experience."
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              periodDays: days,
              metrics,
              sampleParties: parties.slice(0, 50).map(p => ({
                size: p.size,
                state: p.state,
                room: p.room,
                addedAt: p.addedAt,
                seatedAt: p.seatedAt,
                completedAt: p.completedAt,
                cancelledAt: p.cancelledAt,
                cancelReason: p.cancelReason
              }))
            },
            null,
            2
          )
        }
      ],
      max_completion_tokens: 300,
      temperature: 0.4
    });

    const text = completion.choices[0]?.message?.content || "";
    const lines = text
      .split("\n")
      .map(l => l.replace(/^[\-\*\d\.\s]+/, "").trim())
      .filter(Boolean);

    res.json({ insights: lines.slice(0, 5) });
  } catch (err) {
    console.error("Analytics insights error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;