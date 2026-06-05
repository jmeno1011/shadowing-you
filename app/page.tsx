"use client";

import { useMemo, useState } from "react";
import { groupSegmentsIntoSentences } from "../lib/transcript-sentences";
import { extractYouTubeVideoId } from "../lib/youtube-url";

type Segment = {
  start: number;
  dur: number;
  text: string;
};

type TranscriptResponse = {
  segments: Segment[];
  source?: string;
};

const NO_TRANSCRIPT_MESSAGE =
  "No public transcript found. Captions may be disabled for this video, unavailable for Shorts, or restricted by YouTube. Paste the transcript manually to continue.";

const examples = [
  ["arj7oStGLkU", "TED: Ken Robinson"],
  ["8jPQjjsBbIc", "TED: Simon Sinek"],
  ["iCvmsMzlF7o", "Obama Harvard Speech"],
] as const;

function formatTime(secs: number) {
  const mins = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  return `${String(mins).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function toSrtTime(value: number) {
  const hours = Math.floor(value / 3600);
  const mins = Math.floor((value % 3600) / 60);
  const secs = Math.floor(value % 60);
  const ms = Math.round((value % 1) * 1000);
  return `${pad(hours)}:${pad(mins)}:${pad(secs)},${String(ms).padStart(3, "0")}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function download(filename: string, text: string) {
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentVideoId, setCurrentVideoId] = useState("");
  const [blurOn, setBlurOn] = useState(false);
  const [largeOn, setLargeOn] = useState(false);
  const [activeTab, setActiveTab] = useState<"shadowing" | "plain" | "paste">("shadowing");
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const totalSecs =
      segments.length > 0
        ? Math.round(segments[segments.length - 1].start + segments[segments.length - 1].dur)
        : 0;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const wordCount = segments.reduce((total, segment) => total + segment.text.split(" ").length, 0);

    return {
      duration: `${mins}:${String(secs).padStart(2, "0")}`,
      segmentCount: segments.length,
      wordCount,
    };
  }, [segments]);

  function toggleTheme() {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem("theme", next);
  }

  async function fetchTranscript(videoUrl = url) {
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      setError("Enter a YouTube or Shorts URL.");
      return;
    }

    const videoId = extractYouTubeVideoId(trimmed);
    if (!videoId) {
      setError("Enter a valid YouTube URL. Shorts, watch, embed, and youtu.be links are supported.");
      return;
    }

    setCurrentVideoId(videoId);
    setError("");
    setLoading(true);
    setSegments([]);

    try {
      const response = await fetch(`/api/transcript?videoId=${encodeURIComponent(videoId)}`);
      const data = (await response.json()) as TranscriptResponse | { error?: string };

      if (!response.ok || !("segments" in data) || data.segments.length === 0) {
        throw new Error("error" in data && data.error ? data.error : "No transcript found.");
      }

      setSegments(groupSegmentsIntoSentences(data.segments));
      setActiveTab("shadowing");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message.includes("No public transcript found")
          ? NO_TRANSCRIPT_MESSAGE
          : "Transcript extraction failed. Paste the transcript manually to continue.",
      );
      setActiveTab("paste");
    } finally {
      setLoading(false);
    }
  }

  function copyAll() {
    navigator.clipboard.writeText(segments.map((segment) => segment.text).join("\n")).then(() => {
      alert("Copied to clipboard.");
    });
  }

  function downloadTxt() {
    const text = segments.map((segment) => `[${formatTime(segment.start)}] ${segment.text}`).join("\n");
    download(`transcript_${currentVideoId || "script"}.txt`, text);
  }

  function downloadSrt() {
    const srt = segments
      .map((segment, index) => {
        const start = toSrtTime(segment.start);
        const end = toSrtTime(segment.start + segment.dur);
        return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`;
      })
      .join("\n");
    download(`transcript_${currentVideoId || "script"}.srt`, srt);
  }

  function loadPasted() {
    const raw = pasteText.trim();
    if (!raw) return;

    const parsed: Segment[] = [];
    let index = 0;
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const timeMatch =
        trimmed.match(/^\[?(\d+):(\d+)\]?\s*(.*)/) || trimmed.match(/^\((\d+):(\d+)\)\s*(.*)/);

      if (timeMatch) {
        const start = Number.parseInt(timeMatch[1], 10) * 60 + Number.parseInt(timeMatch[2], 10);
        const text = timeMatch[3].trim();
        if (text) parsed.push({ start, dur: 4, text });
      } else {
        parsed.push({ start: index * 4, dur: 4, text: trimmed });
      }
      index += 1;
    }

    setSegments(groupSegmentsIntoSentences(parsed));
    setCurrentVideoId("");
    setActiveTab("shadowing");
    setError("");
  }

  function activateSegment(index: number) {
    setActiveSegment(index);
    if (currentVideoId) {
      window.open(
        `https://www.youtube.com/watch?v=${currentVideoId}&t=${Math.floor(segments[index].start)}s`,
        "_blank",
      );
    }
  }

  function loadExample(videoId: string) {
    const nextUrl = `https://www.youtube.com/watch?v=${videoId}`;
    setUrl(nextUrl);
    void fetchTranscript(nextUrl);
  }

  return (
    <>
      <header>
        <div className="logo">
          <i className="ti ti-microphone" />
          Shadowing<span>You</span>
        </div>
        <div className="header-actions">
          <button className="btn sm" type="button" onClick={toggleTheme} aria-label="Toggle theme">
            <i className="ti ti-moon theme-icon theme-icon-light" aria-hidden="true" />
            <i className="ti ti-sun theme-icon theme-icon-dark" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">YouTube and Shorts transcript workflow</p>
          <h1>
            Extract, read, and shadow
            <br />
            <em>without friction</em>
          </h1>
          <p>Paste a YouTube or Shorts link. Shadowing You turns available captions into a readable practice script.</p>
        </section>

        <section className="search-card">
          <div className="section-heading">
            <span className="step-label">Step 1</span>
            <h2>Choose a video</h2>
          </div>
          <div className="input-row">
            <input
              type="text"
              value={url}
              placeholder="YouTube or Shorts URL"
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void fetchTranscript();
              }}
            />
            <button className="btn primary" type="button" disabled={loading} onClick={() => void fetchTranscript()}>
              <i className="ti ti-download" /> Extract transcript
            </button>
          </div>
          <div className="chips">
            <span className="chip-label">Examples</span>
            {examples.map(([videoId, label]) => (
              <button className="chip" key={videoId} type="button" onClick={() => loadExample(videoId)}>
                {label}
              </button>
            ))}
          </div>
          <div className="notice">
            <strong>How extraction works</strong> - The browser calls a local Next.js API route, and the server fetches
            available public captions. If captions are disabled or unavailable, use manual paste below.
          </div>
        </section>

        {error ? (
          <section className="error-box" role="status">
            <div>
              <strong>Transcript unavailable</strong>
              <p>{error}</p>
            </div>
            <button className="btn sm" type="button" onClick={() => setActiveTab("paste")}>
              Paste manually
            </button>
          </section>
        ) : null}

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            Extracting transcript...
          </div>
        ) : null}

        {(segments.length > 0 || activeTab === "paste") && !loading ? (
          <section className="result">
            <div className="stats">
              <div className="stat">
                <div className="stat-label">Duration</div>
                <div className="stat-val">{stats.duration}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Segments</div>
                <div className="stat-val">{stats.segmentCount}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Words</div>
                <div className="stat-val">{stats.wordCount.toLocaleString()}</div>
              </div>
            </div>

            <div className="tabs">
              {(["shadowing", "plain", "paste"] as const).map((tab) => (
                <button
                  className={`tab ${activeTab === tab ? "active" : ""}`}
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "shadowing" ? "Shadowing" : tab === "plain" ? "Plain text" : "Manual paste"}
                </button>
              ))}
            </div>

            {activeTab === "shadowing" ? (
              <div className="tab-panel active">
                <div className="controls">
                  <span className="controls-label">Practice mode</span>
                  <div className="toggle-group">
                    <button
                      className={`toggle ${blurOn ? "on" : ""}`}
                      type="button"
                      onClick={() => setBlurOn((value) => !value)}
                    >
                      <i className="ti ti-eye-off" /> Blur
                    </button>
                    <button
                      className={`toggle ${largeOn ? "on" : ""}`}
                      type="button"
                      onClick={() => setLargeOn((value) => !value)}
                    >
                      <i className="ti ti-typography" /> Larger text
                    </button>
                  </div>
                  <div className="sep" />
                  <span className="controls-label">Click a line to open the video at that timestamp</span>
                  <div className="flex-1" />
                  <button className="btn sm" type="button" disabled={segments.length === 0} onClick={copyAll}>
                    <i className="ti ti-copy" /> Copy all
                  </button>
                </div>
                <div className="script-box">
                  {segments.map((segment, index) => (
                    <button
                      className={`seg ${largeOn ? "seg-large" : ""} ${activeSegment === index ? "active" : ""}`}
                      key={`${segment.start}-${index}`}
                      type="button"
                      onClick={() => activateSegment(index)}
                    >
                      <span className="seg-num">
                        <span className="seg-n">#{index + 1}</span>
                        <span>{formatTime(segment.start)}</span>
                      </span>
                      <span className="seg-body">
                        <span className={`seg-text ${blurOn ? "blur" : ""}`}>{segment.text}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "plain" ? (
              <div className="tab-panel active">
                <div className="action-bar plain-actions">
                  <button className="btn sm" type="button" disabled={segments.length === 0} onClick={copyAll}>
                    <i className="ti ti-copy" /> Copy
                  </button>
                  <button className="btn sm" type="button" disabled={segments.length === 0} onClick={downloadTxt}>
                    <i className="ti ti-file-download" /> Save .txt
                  </button>
                  <button className="btn sm" type="button" disabled={segments.length === 0} onClick={downloadSrt}>
                    <i className="ti ti-subtitles" /> Save .srt
                  </button>
                </div>
                <pre className="plain-text">{segments.map((segment) => segment.text).join("\n")}</pre>
              </div>
            ) : null}

            {activeTab === "paste" ? (
              <div className="tab-panel active">
                <div className="section-heading">
                  <span className="step-label">Fallback</span>
                  <h2>Paste a transcript manually</h2>
                </div>
                <p className="paste-hint">
                  If automatic extraction fails, copy text from{" "}
                  <a href="https://youtubetranscript.com" target="_blank" rel="noreferrer">
                    youtubetranscript.com
                  </a>
                  , YouTube captions, or another transcript source and paste it here.
                  <br />
                  Timestamps such as <code>[0:00]</code> are parsed automatically.
                </p>
                <textarea
                  className="paste-area"
                  value={pasteText}
                  placeholder="Paste transcript text here..."
                  onChange={(event) => setPasteText(event.target.value)}
                />
                <div className="action-bar">
                  <button className="btn primary" type="button" onClick={loadPasted}>
                    <i className="ti ti-player-play" /> Load for shadowing
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </main>

      <footer>Shadowing You - YouTube and Shorts transcript practice</footer>
    </>
  );
}
