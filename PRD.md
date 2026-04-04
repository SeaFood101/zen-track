# Zen Track — Product Requirements Document

## Overview

Zen Track is a mobile wellness game that induces relaxation through dual-focus attention. The user tracks two balls simultaneously: one with their eyes (via front camera eye tracking) and one with their finger (via touch). By splitting focus across two modalities, the game occupies the user's full attention, quieting mental chatter and producing a meditative state.

## Target User

Adults looking for a quick, low-effort relaxation tool. No gaming experience needed. The app should feel more like a breathing exercise than a video game.

## Core Concept

Two balls move across the screen in slow, smooth arcs. They move independently of each other, forcing the user to split their attention:

- **Eye Ball** — A softly glowing orb the user follows with their gaze. The front camera and WebGazer.js estimate where the user is looking and measure proximity to the ball.
- **Touch Ball** — A second orb the user follows by pressing and dragging their finger on the screen. Touch position is compared to the ball's center.

The dual-tracking mechanic is the core innovation. It forces present-moment focus because the brain cannot wander while coordinating two separate tracking tasks.

## App Flow

### Screen 1: Home

- App name and a one-line tagline (e.g., "Focus on two. Relax into one.")
- Three duration buttons: **2 min**, **5 min**, **7 min**
- A "History" button to view past sessions
- Clean, calming aesthetic. No clutter.

### Screen 2: Calibration

- Triggered on first use, or if eye tracking hasn't been calibrated recently
- Brief explanation: "We need your camera to track your eyes. Nothing is recorded or stored."
- Camera permission request
- 5-point calibration: user looks at a dot and taps it, repeated at 5 screen positions (center, four corners inset from edges)
- Progress indicator showing dots completed
- "Start Game" button appears after calibration

### Screen 3: Game

- 3-second countdown before balls begin moving
- Two distinct balls on screen, each with a subtle label or color to differentiate:
  - Eye Ball: cooler tone (soft blue/teal), labeled with a small eye icon
  - Touch Ball: warmer tone (soft coral/peach), labeled with a small hand/touch icon
- Balls move in slow, smooth parametric arcs (sine/cosine curves with different frequencies so paths don't sync)
- Ball speed: approximately 2-4 seconds per arc cycle. Calm, never frantic.
- Balls stay within safe margins (15% inset from screen edges)
- Subtle visual feedback:
  - When eye gaze is close to the Eye Ball, it glows slightly brighter
  - When touch is close to the Touch Ball, it glows slightly brighter
  - No harsh penalties or red indicators. Keep it calming.
- Timer displayed subtly at the top (small, low-opacity text)
- No pause button. The game is short enough to commit to. If the user leaves, the session is abandoned.
- Optional: soft ambient background gradient that shifts slowly during play

### Screen 4: Results

- Session complete message
- **Combined Score**: large, prominent percentage (average of eye and touch accuracy)
- Expandable breakdown:
  - Eye Tracking Accuracy: X%
  - Touch Tracking Accuracy: X%
- "Play Again" button (returns to home with last duration pre-selected)
- "View History" button

### Screen 5: History

- List of past sessions (most recent first), showing:
  - Date and time
  - Duration
  - Combined score
  - Tap to expand and see eye/touch breakdown
- **Graph view**: line chart showing combined accuracy over time
  - Toggle to overlay eye and touch as separate lines
  - X-axis: session date
  - Y-axis: accuracy %
- "Clear History" with confirmation prompt

## Scoring System

### Data Collection

- Every 100ms during gameplay, sample:
  - Eye Ball center position (x, y)
  - Estimated gaze position from WebGazer (x, y)
  - Touch Ball center position (x, y)
  - Current touch position (x, y)
- If no touch is active, touch accuracy for that sample = 0%
- If WebGazer returns no gaze estimate, eye accuracy for that sample is excluded (not penalized, since camera issues aren't the user's fault)

### Accuracy Calculation

For each sample:

```
distance = euclidean distance between (ball center, tracked position)
max_distance = screen diagonal / 2
sample_accuracy = max(0, 1 - (distance / max_distance)) * 100
```

This gives 100% when perfectly on the ball, ~0% when at the farthest possible point.

**Eye Accuracy** = average of all valid eye samples
**Touch Accuracy** = average of all touch samples
**Combined Accuracy** = (Eye Accuracy + Touch Accuracy) / 2

### What Gets Stored (localStorage)

Each session saves a JSON object:

```json
{
  "id": "uuid",
  "date": "2026-04-04T14:30:00Z",
  "duration": 120,
  "eyeAccuracy": 72.4,
  "touchAccuracy": 85.1,
  "combinedAccuracy": 78.75
}
```

Array of sessions stored under a single localStorage key.

## Ball Movement Specification

Both balls follow parametric paths using sine and cosine functions:

```
x(t) = centerX + amplitudeX * sin(frequencyX * t + phaseX)
y(t) = centerY + amplitudeY * cos(frequencyY * t + phaseY)
```

- Eye Ball: lower frequency, wider arcs, more horizontal bias
- Touch Ball: slightly higher frequency, more vertical bias, offset phase
- Amplitudes constrained so balls stay within the safe zone (15% margin)
- Frequencies tuned so the two paths never fully sync but occasionally intersect, keeping the experience organic

## Design Direction

### Aesthetic

- **Tone**: Soft, minimal, premium. Think meditation app meets modern product design.
- **Color palette**: Dark muted background (deep charcoal or very dark navy), soft glowing orbs, muted accent colors. Nothing bright or stimulating.
- **Typography**: One clean sans-serif. Minimal text throughout. Let the visuals breathe.
- **Motion**: All transitions are slow and eased. No snappy animations. Everything floats and fades.
- **Spacing**: Generous whitespace. Nothing cramped.

### Key Design Principles

1. **Calming over impressive** — Every design choice should reduce stimulation
2. **Glanceable** — During gameplay, no reading required. Visual cues only.
3. **Forgiving** — Scores should feel encouraging. A 60% is still relaxing. The score is a gentle metric, not a grade.
4. **Touch-first** — All interactive elements sized for thumbs. No tiny targets.

## Technical Stack

- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS
- **Eye Tracking**: WebGazer.js (browser-based, uses front camera + ML)
- **Charts**: Recharts (for history graphs)
- **Storage**: localStorage
- **Deployment**: Vercel
- **No backend, no auth, no database**

## Constraints and Scope Limits

- Mobile web only (responsive, but optimized for portrait phone screens)
- Eye tracking accuracy will be approximate. This is acceptable. The game's value is in the act of focusing, not in achieving perfect scores.
- No sound/audio in MVP (could be added later)
- No user accounts or cross-device sync
- No social features
- No app store distribution (web app only, accessed via URL)
- WebGazer calibration is needed per browser session. We should cache calibration data in localStorage when possible.

## Success Criteria

A user should be able to:

1. Open the URL on their phone
2. Understand the game in under 10 seconds
3. Complete calibration in under 30 seconds
4. Play a full 2-minute session without confusion
5. See their score and feel motivated to try again
6. Return days later and see their history
