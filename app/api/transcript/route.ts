import { NextRequest, NextResponse } from "next/server";
import { getTranscript } from "../../../lib/transcript/service";

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get("videoId");

  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
    return NextResponse.json({ error: "Invalid YouTube video id." }, { status: 400 });
  }

  const transcript = await getTranscript(videoId);

  if (!transcript) {
    return NextResponse.json({ error: "No public transcript found." }, { status: 404 });
  }

  return NextResponse.json(transcript);
}
