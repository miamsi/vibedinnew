import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/lastfm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const results = await searchTracks(q);
    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ results: [], error: err.message }, { status: 200 });
  }
}
