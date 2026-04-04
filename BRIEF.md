# Zen Track — Claude Code Build Brief

## Context

You are building a mobile wellness game called **Zen Track**. It is a web app where the user tracks two balls simultaneously: one with their eyes (using WebGazer.js for camera-based gaze estimation) and one with their finger (touch input). The dual-focus mechanic induces relaxation by fully occupying the user's attention.

Read the full PRD (PRD.md in this repo) for complete specifications. This brief tells you what to build and in what order.

## Tech Stack

- **Next.js** (App Router)
- **Tailwind CSS** for styling
- **WebGazer.js** for browser-based eye tracking (install via npm or load from CDN)
- **Recharts** for score history charts
- **localStorage** for data persistence
- **Deploy to Vercel**

## Design Direction

This is a wellness/meditation product. The design must feel calming, not gamified.

- **Background**: Deep charcoal (#0f1117) or very dark navy
- **Eye Ball**: Soft blue/teal glow with subtle radial gradient and blur
- **Touch Ball**: Soft coral/peach glow with subtle radial gradient and blur
- **Text**: Off-white (#e8e8e8), low-opacity where possible
- **Typography**: Use one clean, modern sans-serif (e.g., "DM Sans" or "Outfit" from Google Fonts). Avoid Inter, Roboto, and system fonts.
- **Transitions**: Everything uses ease-in-out with long durations (300-600ms). No snappy or bouncy animations.
- **Spacing**: Generous padding and margins throughout. Touch targets minimum 48px.
- **Border radius**: Rounded. Pill-shaped buttons. Soft edges everywhere.
- **Visual effects**: Subtle background gradient that shifts slowly. Balls should have a soft glow (box-shadow or radial gradient). Consider a very faint noise/grain texture overlay on the background for depth.

Do NOT use purple gradients, bright colors, or anything visually stimulating. This app should feel like a deep breath.

---

## Milestones

Build these in order. Each milestone should result in a working state you can verify before moving on.

---

### Milestone 1: Project Setup and Deployment Pipeline

**Goal**: Empty Next.js app deployed to Vercel, accessible via URL on mobile.

Tasks:
1. Initialize a Next.js project with App Router and Tailwind CSS
2. Set up the base layout with the dark background color and Google Font import
3. Create a simple home page with the app name "Zen Track" centered on screen
4. Configure for Vercel deployment (make sure `next.config.js` is clean)
5. Deploy to Vercel and confirm the URL loads on a phone browser

**Checkpoint**: You can open the Vercel URL on a phone and see "Zen Track" on a dark background.

---

### Milestone 2: Home Screen

**Goal**: Fully designed home screen with duration selection and navigation.

Tasks:
1. Build the home screen layout:
   - App name "Zen Track" with tagline "Focus on two. Relax into one."
   - Three pill-shaped duration buttons: 2 min, 5 min, 7 min
   - "History" text button at the bottom
2. Duration buttons should glow subtly on the selected state
3. Tapping a duration button navigates to the calibration/game flow, passing the selected duration
4. Style everything per the design direction. Mobile-first, centered layout, generous spacing.

**Checkpoint**: Home screen looks polished on mobile. Tapping a duration button navigates (even if the destination page is empty).

---

### Milestone 3: Eye Tracking Calibration Screen

**Goal**: Camera permission flow and 5-point gaze calibration using WebGazer.js.

Tasks:
1. Install/integrate WebGazer.js
2. Build the calibration screen:
   - Friendly message explaining camera use: "We use your camera to track your eyes. Nothing is recorded or stored."
   - Request camera permission
   - If denied, show a gentle message explaining the game needs camera access, with a "Try Again" option
3. 5-point calibration sequence:
   - Show a glowing dot at position 1 (center of screen)
   - User looks at the dot and taps it
   - Dot moves to position 2 (top-left, inset 20% from edges), repeat
   - Continue through positions 3-5 (top-right, bottom-left, bottom-right)
   - Show a small progress indicator (e.g., "3 of 5")
4. After calibration completes, show a "Start" button that transitions to the game screen
5. Cache WebGazer calibration data in localStorage so returning users skip calibration if data exists (WebGazer supports this via `webgazer.saveDataAcrossSessions(true)`)

**Checkpoint**: Camera permission works on mobile. Calibration feels smooth. WebGazer is initialized and returning gaze predictions after calibration.

---

### Milestone 4: Game Screen — Ball Movement and Timer

**Goal**: Two balls moving in smooth arcs on screen with a countdown timer. No tracking logic yet.

Tasks:
1. Build the game screen with the dark background
2. Implement a 3-second countdown overlay before the game starts ("3... 2... 1...")
3. Render two balls:
   - Eye Ball: ~50px diameter, soft blue/teal, radial gradient, subtle glow (box-shadow)
   - Touch Ball: ~50px diameter, soft coral/peach, radial gradient, subtle glow
   - Each ball has a tiny icon or label (eye icon / hand icon) — use simple SVG or emoji as placeholder
4. Implement parametric ball movement using `requestAnimationFrame`:
   - Eye Ball path: `x = centerX + ampX * sin(0.4 * t)`, `y = centerY + ampY * cos(0.3 * t)`
   - Touch Ball path: `x = centerX + ampX * sin(0.5 * t + π/3)`, `y = centerY + ampY * cos(0.35 * t + π/4)`
   - Amplitudes = ~35% of screen width/height so balls stay within safe margins
   - `t` increments smoothly based on elapsed time in seconds
   - Tune frequencies so movement feels slow and organic. Adjust if it feels too fast or too slow.
5. Display a subtle timer at the top of the screen showing remaining time (e.g., "4:32")
6. When timer reaches 0, transition to the results screen (placeholder for now)

**Checkpoint**: Two glowing balls drift smoothly around the screen in different patterns. Timer counts down. Feels calming to watch.

---

### Milestone 5: Tracking and Scoring Engine

**Goal**: Wire up eye tracking and touch tracking. Calculate accuracy scores in real time.

Tasks:
1. **Eye tracking integration**:
   - Start WebGazer prediction listener when the game starts
   - Every 100ms, sample: `webgazer.getCurrentPrediction()` returns `{x, y}` or null
   - Compare gaze `{x, y}` to Eye Ball center position
   - If prediction is null, skip that sample (don't penalize)
2. **Touch tracking integration**:
   - Listen for `touchstart`, `touchmove`, `touchend` events on the game area
   - Every 100ms, sample current touch position
   - Compare touch `{x, y}` to Touch Ball center position
   - If no active touch, that sample scores 0%
3. **Accuracy calculation** (per sample):
   ```
   distance = sqrt((ballX - trackX)^2 + (ballY - trackY)^2)
   maxDistance = sqrt(screenWidth^2 + screenHeight^2) / 2
   sampleAccuracy = Math.max(0, (1 - distance / maxDistance)) * 100
   ```
4. **Running averages**: Keep running totals of eye samples and touch samples. At game end, compute:
   - `eyeAccuracy` = average of all valid eye samples
   - `touchAccuracy` = average of all touch samples
   - `combinedAccuracy` = (eyeAccuracy + touchAccuracy) / 2
5. **Visual feedback during gameplay**:
   - When a ball's tracking accuracy for the current sample is > 70%, increase its glow brightness slightly
   - When < 40%, dim the glow slightly
   - Use smooth CSS transitions so the glow changes feel organic, not flickery
6. Store the final scores in a ref/state to pass to the results screen

**Checkpoint**: Play a full session. Gaze estimates appear (even if imprecise). Touch tracking is responsive. Scores compute at the end.

---

### Milestone 6: Results Screen

**Goal**: Beautiful results screen showing the session score with breakdown.

Tasks:
1. Build the results screen:
   - "Session Complete" header with a soft fade-in
   - Large combined accuracy percentage in the center (e.g., "78%") with a circular progress ring or arc around it
   - Below: two smaller cards showing Eye Accuracy and Touch Accuracy separately
   - Each card has the percentage, a small icon, and a one-word label
2. Two buttons at the bottom:
   - "Play Again" — returns to home screen
   - "View History" — navigates to history screen
3. Save the session data to localStorage:
   ```json
   {
     "id": "generated-uuid",
     "date": "ISO string",
     "duration": 120,
     "eyeAccuracy": 72.4,
     "touchAccuracy": 85.1,
     "combinedAccuracy": 78.75
   }
   ```
   Append to an array stored under the key `"zentrack_sessions"`.
4. Animate the score number counting up from 0 to the final value on load

**Checkpoint**: After a game session, the results screen shows accurate scores with a smooth presentation. Data is saved to localStorage.

---

### Milestone 7: History Screen with Graph

**Goal**: Session history list and accuracy-over-time chart.

Tasks:
1. Build the history screen:
   - Back arrow or "Home" link at the top
   - Title: "Your Sessions"
2. **Session list**:
   - Reverse chronological order
   - Each row shows: date (formatted nicely), duration, combined accuracy %
   - Tapping a row expands it to show eye and touch accuracy breakdown
   - If no sessions exist, show a friendly empty state ("No sessions yet. Play your first game!")
3. **Chart**:
   - Use Recharts to render a line chart
   - X-axis: session dates (formatted as short dates)
   - Y-axis: accuracy % (0-100)
   - Default view: single line showing combined accuracy
   - Toggle (pill-shaped tabs): "Combined" | "Detailed"
   - Detailed view: three lines (combined, eye, touch) with matching colors (white, blue/teal, coral/peach)
   - Style the chart to match the dark theme (dark background, light grid lines, colored lines)
4. **Clear history** button at the bottom with a confirmation dialog
5. Handle edge cases: only 1 session (show a dot not a line), many sessions (chart should scroll or compress)

**Checkpoint**: History shows all past sessions. Chart renders with real data. Toggling between combined and detailed views works.

---

### Milestone 8: Polish and Mobile Optimization

**Goal**: Final pass to make everything feel premium on mobile.

Tasks:
1. **Responsive checks**:
   - Test layout on different phone screen sizes (use Chrome DevTools device toolbar)
   - Ensure balls stay within safe zones on all screen sizes
   - Ensure all touch targets are at least 48px
   - Fix any overflow or scroll issues during gameplay
2. **WebGazer cleanup**:
   - Hide the WebGazer video preview overlay (it shows by default — turn it off: `webgazer.showVideoPreview(false)`)
   - Hide the gaze prediction dot: `webgazer.showPredictionPoints(false)`
   - Make sure WebGazer pauses/stops when not in the game screen to save resources
3. **Loading states**:
   - Add a loading indicator while WebGazer initializes (it takes a few seconds)
   - Smooth transitions between all screens (fade in/out)
4. **PWA basics** (optional but nice):
   - Add a manifest.json with app name and theme color
   - Add a basic service worker for offline support
   - Add an app icon (can be a simple SVG-based icon)
5. **Meta tags**: Set viewport, theme-color, and description for mobile browsers
6. **Performance**: Ensure requestAnimationFrame loop and WebGazer don't cause jank. If needed, reduce WebGazer sampling rate.
7. **Final visual pass**:
   - Consistent spacing and alignment across all screens
   - All text legible and properly sized
   - All animations smooth
   - Background gradient or subtle visual texture present

**Checkpoint**: The app feels like a finished product when opened on a phone. No visual bugs, no jank, no rough edges.

---

## Key Technical Notes for Claude Code

1. **WebGazer.js**: Import via CDN (`<script>` tag in layout) or npm. It attaches to `window.webgazer`. Key API:
   - `webgazer.begin()` — starts camera and tracking
   - `webgazer.setGazeListener(callback)` — callback receives `(data, timestamp)` where data has `.x` and `.y`
   - `webgazer.getCurrentPrediction()` — returns `{x, y}` or null
   - `webgazer.showVideoPreview(false)` — hides camera preview
   - `webgazer.showPredictionPoints(false)` — hides gaze dot overlay
   - `webgazer.saveDataAcrossSessions(true)` — persists calibration
   - `webgazer.end()` — stops tracking

2. **Touch events**: Use `onTouchStart`, `onTouchMove`, `onTouchEnd` on the game container. `e.touches[0].clientX` and `e.touches[0].clientY` give position. Also support mouse events for desktop testing.

3. **Ball movement**: Use `requestAnimationFrame` with a time-based `t` value (not frame-based) so movement speed is consistent across devices.

4. **localStorage**: Use a try/catch wrapper. Some browsers in private mode may restrict localStorage.

5. **Vercel deployment**: Just push to a GitHub repo connected to Vercel, or use `npx vercel` CLI. No special configuration needed for a standard Next.js app.

6. **Testing on mobile**: During development, use `npx next dev --hostname 0.0.0.0` to access the dev server from a phone on the same WiFi network. Camera/WebGazer will only work over HTTPS or localhost, so Vercel preview deployments are the best way to test eye tracking on a real phone.

## File Structure Suggestion

```
/app
  /page.tsx              — Home screen
  /calibration/page.tsx  — Calibration flow
  /game/page.tsx         — Game screen
  /results/page.tsx      — Results screen
  /history/page.tsx      — History + chart
  /layout.tsx            — Root layout (dark bg, font, meta)
  /globals.css           — Tailwind + custom styles
/components
  /Ball.tsx              — Glowing ball component
  /Timer.tsx             — Countdown timer display
  /ScoreRing.tsx         — Circular progress ring for results
  /SessionCard.tsx       — History list item
  /AccuracyChart.tsx     — Recharts line chart wrapper
/lib
  /scoring.ts            — Accuracy calculation functions
  /storage.ts            — localStorage read/write helpers
  /ballPaths.ts          — Parametric movement functions
  /useWebGazer.ts        — Custom hook for WebGazer lifecycle
/public
  /manifest.json         — PWA manifest
```

## One Last Thing

The app's entire purpose is relaxation. If ever in doubt about a design or interaction choice, pick the option that feels calmer, softer, and more spacious. Less is more. Silence is fine. Breathing room matters.
