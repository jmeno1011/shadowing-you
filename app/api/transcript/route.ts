import { NextRequest, NextResponse } from "next/server";
import { getTranscriptReport, hasDeploymentFetchFailure } from "../../../lib/transcript/service";

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get("videoId");
  const debug = request.nextUrl.searchParams.get("debug") === "1";

  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
    return NextResponse.json({ error: "Invalid YouTube video id." }, { status: 400 });
  }

  const report = await getTranscriptReport(videoId);

  if (!report.result) {
    const deploymentFetchFailure = hasDeploymentFetchFailure(report.attempts);
    const payload = {
      error: deploymentFetchFailure
        ? "Transcript extraction failed from this deployment environment."
        : "No public transcript found.",
      reason: deploymentFetchFailure ? "deployment_fetch_failed" : "no_public_transcript",
      ...(debug ? { attempts: report.attempts } : {}),
    };

    return NextResponse.json(payload, { status: deploymentFetchFailure ? 502 : 404 });
  }

  return NextResponse.json({
    ...report.result,
    ...(debug ? { attempts: report.attempts } : {}),
  });
}
