import { NextRequest, NextResponse } from "next/server";
import { buildVibeResult } from "@/lib/buildVibe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { artist, track } = await req.json();
    if (!artist || !track) {
      return NextResponse.json({ error: "artist and track are required" }, { status: 400 });
    }
    const result = await buildVibeResult(artist, track);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 });
  }
}
