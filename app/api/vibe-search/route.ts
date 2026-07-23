import { NextRequest, NextResponse } from "next/server";
import { hasGroq, suggestSeedsFromMood } from "@/lib/groq";
import { trackExists } from "@/lib/lastfm";
import { buildVibeResult } from "@/lib/buildVibe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();
    if (!description || typeof description !== "string" || description.trim().length < 3) {
      return NextResponse.json({ error: "Describe the mood you're after." }, { status: 400 });
    }

    if (!hasGroq()) {
      return NextResponse.json(
        { error: "Mood search needs a Groq API key configured on the server." },
        { status: 400 }
      );
    }

    const candidates = await suggestSeedsFromMood(description);
    if (!candidates.length) {
      return NextResponse.json(
        { error: "Couldn't translate that mood into a song. Try describing it differently." },
        { status: 404 }
      );
    }

    // Validate candidates against Last.fm in parallel, then take the
    // highest-confidence one (first in the model's own ranking) that's real.
    const checks = await Promise.all(candidates.map((c) => trackExists(c.artist, c.track)));
    const seed = candidates.find((_, i) => checks[i]);

    if (!seed) {
      return NextResponse.json(
        { error: "Found some ideas but none of them exist on Last.fm yet. Try another mood." },
        { status: 404 }
      );
    }

    const result = await buildVibeResult(seed.artist, seed.track);
    return NextResponse.json({ ...result, moodQuery: description });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 });
  }
}
