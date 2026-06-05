# YouTube Sync Mode Implementation Plan

## Goal

Add an optional sync mode that shows a YouTube player on the current page and highlights the transcript sentence that matches the current playback time.

This should be controlled by an On/Off toggle:

- Off: keep the current transcript-only experience.
- On: show the embedded YouTube player and sync the script with playback.

## Recommended UX

- Add a `Sync with video` toggle near the transcript controls.
- When sync is off, hide the player and keep the existing transcript flow.
- When sync is on:
  - Show the YouTube iframe player above or beside the transcript, depending on viewport width.
  - Highlight the active sentence based on `player.getCurrentTime()`.
  - Auto-scroll the transcript to keep the active sentence visible.
  - Keep click-to-open behavior, or change click behavior to seek inside the embedded player when sync mode is on.
- If the player cannot be embedded, keep the transcript visible and show an inline fallback message with an `Open on YouTube` link.

## Technical Approach

Use the official YouTube IFrame Player API. Do not build a custom video player around YouTube media streams.

The safe boundary is:

- YouTube video playback: official iframe player.
- Shadowing You UI: transcript panel, active sentence highlight, auto-scroll, sync toggle, fallback messaging.

Customizing the internal YouTube controls, removing YouTube branding, or fetching raw video streams should not be part of this feature.

## Current Code To Build On

- `app/page.tsx`
  - Holds `currentVideoId`, `segments`, and transcript UI state.
  - Good place to add `syncEnabled`, `activeSegment`, and player event wiring.
- `lib/transcript-sentences.ts`
  - Produces sentence-level transcript segments.
  - Existing `start` and `dur` fields can drive sync matching.
- `app/globals.css`
  - Add player layout, active sentence, sticky player, and fallback message styles here.

## Proposed Components

Create these components if `app/page.tsx` starts getting too large:

- `components/youtube-player.tsx`
  - Loads the YouTube IFrame API script.
  - Creates and owns `YT.Player`.
  - Emits ready, time update, state change, and error events.
- `components/sync-transcript.tsx`
  - Receives `segments`, `activeSegment`, and callbacks.
  - Handles active styling and scroll behavior.

If keeping the first implementation small, the player can start inside `app/page.tsx`, but extract it once the event code grows.

## Data Flow

1. User extracts transcript.
2. `groupSegmentsIntoSentences()` returns sentence-level segments.
3. User turns `Sync with video` on.
4. Page renders YouTube iframe for `currentVideoId`.
5. Player emits current playback time on an interval while playing.
6. App finds the active segment:

```ts
const activeIndex = segments.findIndex(
  (segment) => currentTime >= segment.start && currentTime < segment.start + segment.dur,
);
```

7. Active transcript row receives active styling.
8. Active row scrolls into view when it changes.

## Timestamp Caveat

Some sentence segments are created by merging or splitting YouTube caption fragments.

When a single caption fragment contains multiple sentences, the app currently distributes the original duration evenly across those sentences. This is readable, but not always frame-accurate.

For better sync accuracy later:

- Preserve original caption fragment timestamps.
- When splitting one fragment into multiple sentences, estimate duration by character count or word count instead of equal distribution.
- Consider storing `sourceStart` and `sourceEnd` if more precise debugging is needed.

## YouTube Embed Restrictions

Embedding can fail even when transcript extraction works.

Handle these official IFrame API error codes:

- `2`: invalid video id or invalid player parameter.
- `5`: HTML5 player playback issue.
- `100`: video removed or private.
- `101`: owner does not allow playback in embedded players.
- `150`: same meaning as `101`.
- `153`: missing HTTP referrer or API client identity.

Also expect:

- Age-restricted videos may redirect viewers back to YouTube.
- Some copyright, music, region, or owner restrictions may allow playback on YouTube but block third-party embeds.
- Browser extensions or network filters can also break embedded playback.

Fallback message:

```text
This video cannot be played inline. You can still use the transcript here, or open the video on YouTube.
```

Fallback action:

```ts
`https://www.youtube.com/watch?v=${currentVideoId}`
```

## IFrame Setup Notes

Use `enablejsapi=1` and pass the app origin.

Example iframe/player parameters:

```ts
{
  videoId,
  playerVars: {
    enablejsapi: 1,
    origin: window.location.origin,
    playsinline: 1,
    rel: 0,
  },
  events: {
    onReady,
    onStateChange,
    onError,
  },
}
```

For a manual iframe URL:

```text
https://www.youtube.com/embed/{videoId}?enablejsapi=1&origin={origin}&playsinline=1&rel=0
```

## State Design

Suggested state in `app/page.tsx`:

```ts
const [syncEnabled, setSyncEnabled] = useState(false);
const [playerReady, setPlayerReady] = useState(false);
const [playerError, setPlayerError] = useState("");
const [currentTime, setCurrentTime] = useState(0);
const [activeSegment, setActiveSegment] = useState<number | null>(null);
```

When sync mode is turned off:

- Stop the timer.
- Hide or destroy the player.
- Keep the current transcript loaded.

## Timer Strategy

Use an interval only while the player is playing.

Suggested interval:

- 250ms for smooth highlighting.
- 500ms if performance becomes an issue.

Avoid running the timer while paused, ended, or player unavailable.

## Click Behavior

When sync mode is off:

- Keep current behavior: open YouTube at timestamp in a new tab.

When sync mode is on and player is ready:

- Clicking a sentence should call `player.seekTo(segment.start, true)`.
- Optionally call `player.playVideo()` after seek.

When sync mode is on but player has an embed error:

- Keep the current external YouTube link behavior.

## Styling Notes

Add clear active sentence styling:

- Stronger left border or background.
- Preserve readability in dark mode.
- Avoid layout shift when active state changes.

Player layout:

- Desktop: player above transcript or a two-column layout if enough width is available.
- Mobile: player stacked above transcript.
- Keep player aspect ratio at 16:9.
- Do not make the transcript area too short; this app is script-first.

## Testing Checklist

Unit tests:

- Active segment resolver returns the correct segment for a playback time.
- Boundary behavior at `start`, `start + dur`, and gaps.
- Player error code mapper returns user-facing fallback messages.

Manual verification:

1. Run dev server on port 3001:

```bash
npm run dev -- --port 3001
```

2. Load a video with public captions.
3. Turn `Sync with video` on.
4. Start playback.
5. Confirm active sentence changes as the video plays.
6. Click a transcript sentence and confirm the player seeks.
7. Turn sync off and confirm transcript remains usable.
8. Test an embed-restricted or private video and confirm fallback message appears.
9. Test a Shorts URL and confirm iframe loads with the same video id.
10. Test dark mode refresh and confirm no hydration warning returns.

Build verification:

```bash
npm test
npm run build
```

## External References

- YouTube IFrame Player API: https://developers.google.com/youtube/iframe_api_reference
- YouTube embedded player parameters: https://developers.google.com/youtube/player_parameters
- YouTube Help, embed restrictions and referrer requirement: https://support.google.com/youtube/answer/171780
