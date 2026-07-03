import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";

const redis = Redis.fromEnv();

// POST /api/orders — store encrypted private data for one order
export async function POST(req: NextRequest) {
  try {
    const { commitment, blob } = await req.json();
    if (!commitment || !blob) {
      return Response.json({ error: "missing fields" }, { status: 400 });
    }
    await redis.set(`order:${commitment}`, blob);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// GET /api/orders — return all encrypted blobs
export async function GET() {
  try {
    const keys = await redis.keys("order:*");
    if (keys.length === 0) return Response.json([]);
    const values = await redis.mget<string[]>(...keys);
    const entries = keys.map((k, i) => ({
      commitment: k.slice(6), // strip "order:" prefix
      blob:       values[i],
    })).filter((e) => e.blob);
    return Response.json(entries);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
