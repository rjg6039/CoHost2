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
  let completedCount = 0;
  let waitingCount = 0;
  let seatedCount = 0;
  const byHour = {};

  for (const p of parties) {
    totalGuests += p.size || 0;
    if (p.state === "cancelled") cancelledCount++;
    if (p.state === "completed") completedCount++;
    if (p.state === "waiting") waitingCount++;
    if (p.state === "seated") seatedCount++;

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

  const peakHour =
    hourly.slice().sort((a, b) => b.guests - a.guests)[0]?.hour ?? null;

  return {
    totalParties,
    totalGuests,
    avgPartySize,
    avgWaitMinutes,
    cancelledCount,
    completedCount,
    waitingCount,
    seatedCount,
    peakHour,
    hourly
  };
}

function buildDailyStats(parties) {
  const byDate = {};

  for (const p of parties) {
    const date = new Date(p.addedAt || p.createdAt);
    const key = isNaN(date) ? null : date.toISOString().slice(0, 10);
    if (!key) continue;

    if (!byDate[key]) {
      byDate[key] = {
        date: key,
        parties: 0,
        guests: 0,
        cancelled: 0,
        completed: 0,
        waitSamples: 0,
        totalWaitMinutes: 0
      };
    }

    const bucket = byDate[key];
    bucket.parties++;
    bucket.guests += p.size || 0;
    if (p.state === "cancelled") bucket.cancelled++;
    if (p.state === "completed") bucket.completed++;

    if (p.addedAt && p.seatedAt) {
      const diffMs = p.seatedAt - p.addedAt;
      const minutes = diffMs / 60000;
      if (minutes >= 0 && minutes < 240) {
        bucket.totalWaitMinutes += minutes;
        bucket.waitSamples++;
      }
    }
  }

  return Object.values(byDate)
    .map(entry => ({
      ...entry,
      avgWaitMinutes: entry.waitSamples
        ? entry.totalWaitMinutes / entry.waitSamples
        : 0
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function buildRoomStats(parties) {
  const byRoom = {};

  for (const p of parties) {
    const room = p.room || "main";
    if (!byRoom[room]) {
      byRoom[room] = {
        room,
        parties: 0,
        guests: 0,
        cancelled: 0,
        completed: 0,
        waitSamples: 0,
        totalWaitMinutes: 0
      };
    }

    const bucket = byRoom[room];
    bucket.parties++;
    bucket.guests += p.size || 0;
    if (p.state === "cancelled") bucket.cancelled++;
    if (p.state === "completed") bucket.completed++;

    if (p.addedAt && p.seatedAt) {
      const diffMs = p.seatedAt - p.addedAt;
      const minutes = diffMs / 60000;
      if (minutes >= 0 && minutes < 240) {
        bucket.totalWaitMinutes += minutes;
        bucket.waitSamples++;
      }
    }
  }

  return Object.values(byRoom)
    .map(entry => ({
      ...entry,
      avgWaitMinutes: entry.waitSamples
        ? entry.totalWaitMinutes / entry.waitSamples
        : 0,
      avgPartySize: entry.parties ? entry.guests / entry.parties : 0
    }))
    .sort((a, b) => b.guests - a.guests);
}

function buildAnalyticsResponse(parties, periodDays) {
  const metrics = computeMetrics(parties);
  const daily = buildDailyStats(parties);
  const rooms = buildRoomStats(parties);

  return {
    periodDays,
    metrics,
    daily,
    rooms
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

    const analytics = buildAnalyticsResponse(parties, days);
    res.json(analytics);
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
    }).limit(500);

    const analytics = buildAnalyticsResponse(parties, days);

    if (!process.env.OPENAI_API_KEY) {
      const topHour =
        analytics.metrics.hourly.sort((a, b) => b.guests - a.guests)[0]?.hour ??
        null;

      return res.json({
        provider: "fallback",
        insights: [
          "Add an OpenAI API key to generate live AI insights from your data.",
          `Across the last ${days} days, average wait time is ${analytics.metrics.avgWaitMinutes.toFixed(
            1
          )} minutes for ${analytics.metrics.totalParties} parties.`,
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
            "Given metrics and sample data, produce 3-5 concise operational insights about peaks, staffing, cancellations, and guest experience."
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              periodDays: days,
              metrics: analytics.metrics,
              daily: analytics.daily.slice(-21),
              rooms: analytics.rooms,
              sampleParties: parties.slice(0, 60).map(p => ({
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

    res.json({ provider: "openai", insights: lines.slice(0, 5) });
  } catch (err) {
    console.error("Analytics insights error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
