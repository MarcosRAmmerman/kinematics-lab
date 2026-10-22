# Kinematics Lab

Local React + TypeScript physics minigames with separate play and analysis scenes. No accounts or backend; runtime assets are local.

## Start on Windows

Double-click **Start Kinematics Lab.bat**. It switches to the project directory, checks for Node/npm, installs dependencies if Vite is missing, and invokes `npm.cmd run dev -- --open`. Vite opens the default browser at its actual serving address, including an alternate port if necessary. Keep the console open while playing; close it or press Ctrl+C to stop.

The batch launcher is preserved unchanged in this iteration. It requires Node.js 22.12+ (validated with Node 24).

## Development

```sh
npm install
npm run dev
npm test
npm run build
```

On Windows PowerShell, use `npm.cmd` when execution policy blocks `npm.ps1`. Open the URL printed by Vite, normally http://127.0.0.1:5173. Serve the production `dist/` bundle over HTTP rather than a file URL.

## Ready, play, results, analysis

Choose a game from the explorer. Its ready scene shows controls, objective, and configuration. Start begins a three-second countdown. Physics and commands stay frozen and no samples are recorded until GO. Ready configuration floats inside the scene and disappears without reserving a blank area. The compact 3 / 2 / 1 / GO indicator is a pointer-transparent scene overlay. Ready/countdown/play share scene, control, graph, and toolbar geometry. A persistent toolbar holds simulation elapsed/total time, a thin progress bar, Pause, Stop, and Reset (Cancel during countdown).

Challenge duration is configured per game and selectable before play:

| Game | Default duration | Target |
|---|---:|---|
| Trace a Sine Wave | 10 s | 4 m amplitude, 5 s period: two full oscillations |
| Match the Curve | 10 s sine / 5 s other curves | Sine uses exactly two periods; linear, quadratic, or smoothstep retain configurable duration |
| Free Play | 6 s | Unscored automatic recording; adjustable 2-60 s or Unlimited |
| Tron Bike | 5 s | Five equal-duration velocity segments |
| Precision Docking | 10 s standard / 8 s advanced | Station at 10 m |
| Burn & Coast | 10 s standard / 8 s advanced | Coast corridor 4-12 m, destination 16 m |
| Intercept | 8 s standard / 10 s advanced | Moving target starting at 3 m |

Rocket durations can be set to 8, 10, 12, or 15 seconds. Other challenges also offer 5 seconds. Both sine games offer periods of 4, 5, or 6 seconds; duration is always twice the selected period (8, 10, or 12 seconds). Their duration field is read-only and follows the period. Other curves retain independent duration configuration. Other position curves scale to their configured attempt duration. Bike segment lengths are duration / 5, with velocities +3, 0, -3, 0, +3 m/s.

Challenges record every fixed step plus the t=0 sample, end exactly at the configured time, and retain the entire recording. For example, a ten-second challenge contains 1,201 samples. Results show score, outcome, trajectory previews, Retry, Analyze, and Back to Explorer. Retry begins a fresh countdown. Analysis displays the entire attempt, including longer sine and rocket runs.

Free Play defaults to a six-second, unscored recording that automatically opens Results. Its Ready duration input accepts 2-60 seconds in 0.1-second increments, and timed runs retain the entire recording. Unlimited is optional and keeps only the latest five seconds (601 samples). Rocket free flight remains unlimited. Stop in the top toolbar freezes the available recording; unlimited captures preserve their original simulation timestamps. Pause & analyze temporarily freezes a live run; Resume continues with neutral input. Completed recordings cannot resume. Retry repeats the configuration immediately; Adjust & retry returns to Ready so duration and options can be changed.

## Controls and rocket missions

- **Displacement**: drag the track, adjust the position slider, or use left/right arrows. The car follows filtered sampled position.
- **Tron Bike**: hold Left Arrow/A or Right Arrow/D for -3/+3 m/s. Release all movement keys, or hold conflicting directions, for zero velocity. Key repeat is ignored; aliases remain held independently. Pointer/touch buttons also move while held and stop on release. There is no Space-to-stop keyboard command.
- **Pedal Pulses**: hold arrows or thrust buttons for -2/+2 m/s squared. Release to coast.
- **Mouse Throttle**: analog acceleration between -2 and +2 m/s squared. Center or Coast for zero thrust. Arrow keys also work.

Both rocket control modes expose a Mission selector on the ready screen. Disable Timed challenge for unrestricted flight. P pauses active play into analysis outside editable controls. Pointer cancellation/loss, keyup, and window blur release held thrust; blur also pauses play. Bike held keys are also cleared on focus loss, pause, scene teardown, and unmount. Arrow movement prevents page scrolling.

**Precision Docking:** finish within position and velocity tolerances of the 10 m station. Optional stopping assist shows `x + sign(v) * v² / (2 * 2)`, the projected stopping position under immediate maximum reverse thrust. It predicts a maneuver; it does not apply it. Advanced difficulty disables the assist.

**Burn & Coast:** reach 16 m at low speed after crossing the entire 4-12 m corridor with engines off. Starting at rest, an example feasible schedule is +2 thrust for 2 s, coast for 2 s, -2 thrust for 2 s, then coast at rest. Scores reward final position (40%), final speed (30%), corridor coasting (20%), and low integrated absolute acceleration (10%). The displayed fuel metric is a thrust-effort proxy, `integral |a| dt` in m/s, not physical fuel mass. Engine use inside the corridor prevents a successful completion. The metric accounts for partial steps at corridor boundaries.

**Intercept:** catch an amber target and match its velocity at the same recorded moment. The standard target starts at x=3 m with v=1 m/s. The advanced target also has constant a=0.08 m/s squared. A match is latched when both tolerances are met; simulation and recording continue to the configured endpoint with no teleport, snap, or automatic braking. Graphs show target position, velocity, and acceleration; the instrument strip shows relative distance and speed.

Standard tolerances are 0.35 m and 0.25 m/s; advanced tolerances are 0.20 m and 0.15 m/s. Docking and Burn & Coast require matching at the final sample; Intercept accepts any simultaneous match during the attempt. Docking/Intercept scores weight position 60% and speed 40%. Unsuccessful attempts can earn partial credit. Thrust magnitude and physical laws are unchanged across difficulty settings.

## Graphs and derivative trends

During play, graphs are read-only, use the live simulation timestamp, have no pointer handlers, and cannot scrub or draw interactive tangents. Analysis and the isolated calculus tools enable inspection, scrubbing, expansion, replay speed, and CSV export. Replay uses recorded samples, not rerun physics. The most recent completed attempt is retained in sessionStorage with its duration, period, mission, and difficulty, and can be used as a matching ghost on retry. Storage failure leaves the current attempt in memory.

Position-controlled games show both raw derivatives (thin, 20% opacity) and an **Estimated Trend** for velocity and acceleration by default. The trend is drawn over the raw trace at 98% opacity, using the same graph color. This is a local least-squares quadratic fit to recorded position, not a fit to the challenge target. It never modifies samples, raw CSV, scene motion, position scoring, or the ideal reference.

- Live: causal trailing window, default 350 ms; uses only samples already recorded. Append-only estimates are cached by immutable sample identity. A trailing fit can lag rapidly changing motion; it is an estimate evaluated at the current timestamp, not a time-shifted exact derivative.
- Analysis: clearly labeled centered offline fit by default, with a selectable causal trailing comparison. Window options are 250, 350, and 400 ms. Centered windows shift inward near recording boundaries and evaluate the fitted polynomial at each original timestamp. The first two causal samples retain raw estimates because a quadratic fit needs three points.
- **Raw estimate** is enabled by default; its analysis checkbox can hide the faint raw overlay. Live graphs always show it. CSV always contains the originals. Raw and trend data share original timestamps.
- Default trend range uses the 95th percentile of trend/reference values with a minimum unit range and headroom; raw spikes do not drive that scale. Paths are clipped to the graph, and an explicit off-scale count appears when values exceed the visible range. **Full range** in analysis includes every visible sample. Neither scaling nor smoothing changes scores.

Results use a shared summary/navigation component for all games and full-width recorded graphs with larger readouts, ticks, and units. Analysis uses the same larger graphs plus expansion and timeline inspection. Compact live graphs remain read-only.

The separate Tangent Explorer retains exact analytic references and identification prompts. Area Explorer retains signed rectangle/triangle/mixed regions, interval prediction, and animation on an eight-second analytic domain. Blue adds; amber subtracts.

## Architecture and physics

- `src/physics.ts`: preserved pure integration, numerical differentiation, original analytic references, scoring, recording lookup, area integration, and CSV.
- `src/session.ts`: independent live/analysis state, fixed-step clock, configurable duration, bounded Free Play, input lifecycle, and duration-aware gameplay references.
- `src/smoothing.ts`: normalized local quadratic least squares, boundary-aware causal/centered derivatives, live caching, and robust display ranges.
- `src/missions.ts`: rocket configurations, physically consistent targets, relative-motion checks, stopping prediction, corridor accounting, and scores.
- `src/Graph.tsx`: synchronized SVG graphs, explicit interaction gating, clipping indications, raw/trend overlays, targets, impulses, and tangents.
- `src/camera.ts`: shared rendering-only smooth camera, fixed world-to-screen scale, and velocity-based star feedback.
- `src/ResultsPanel.tsx`: shared results headings, summary, and retry/analysis/explorer actions.
- `src/App.tsx`: scenes, controls, mission configuration, recording, replay, and persistence.

The simulation runs at 120 Hz. Frame gaps are capped at 100 ms; paused/countdown wall time does not accumulate into physics. Integer tick timestamps give exact configured endpoints.

Displacement uses a 60 ms exponential position filter and backward differences for raw v/a. Rocket integration remains `x += v*dt + 0.5*a*dt*dt`, then `v += a*dt`, exact for constant acceleration during a step. There is no horizontal gravity, drag, or artificial speed limit. The previous camera used `round(x / 20) * 20`, which jumped at x=10, 30, etc. It now uses continuous world-space offsets, a dead zone, limited directional look-ahead, and exponential damping driven by frame delta. The world scale stays at 32 SVG units/m. One camera implementation serves all rocket missions and both control modes, as well as the bike. Target indicators show direction and world position when offscreen. Ruler marks use integer world coordinates rather than camera-relative labels. Camera state never enters physics, scores, or CSV.

Bike command jumps are separate delta-v impulses in m/s, never finite acceleration magnitudes. Tangents at impulses are suppressed. Replay selects the nearest original sample. Signed trapezoidal areas are exact for the supplied linear/constant exploration curves; the area tool is not an impulse integrator.

Tracking score remains `100 * clamp(1 - position_RMSE / 8, 0, 1)`, independent of derivative trends. The entire configured attempt is scored.

## Camera feedback and accessibility

Stars are a lightweight SVG visualization. Their phase depends on integrated spacecraft displacement, so their apparent speed and direction track velocity, including coasting and reversal. Streak length increases gradually above 2 m/s and is capped. Neither acceleration nor camera position directly changes the physical state. With `prefers-reduced-motion: reduce`, star phase is fixed and streaks are disabled; necessary continuous camera tracking remains.

## Verification

```sh
npm test
npm run build
npm run test:browser
```

The browser suite uses development-only Playwright and locally installed Microsoft Edge in headless mode, with an isolated profile. On a machine without Edge, install it or change `channel` in `playwright.config.ts` to an installed Chromium-family browser. It starts its own strict-port local Vite server on port 5180 and stops it afterward. Runtime app dependencies are unchanged.

The original 53 regression cases are retained (countdown assertions were updated for the requested GO indicator and removal of reserved space). Added unit tests cover timed unscored recordings up to 60 seconds, held-key aliases/conflicts/repeat/focus cleanup, continuous camera behavior, world-state independence, star direction/reduced motion, and timestamp agreement.

Real-browser checks at **1366x768 and 1920x1080** measure scene/control/graph/toolbar bounding rectangles before, during, and after countdown. They check that primary controls and live graphs fit without scrolling, timed Free Play automatically finishes, the timer uses simulation time, raw traces are present, results graphs are enlarged, replay and duration changes work, sine duration follows two periods, key release/conflicts/blur stop the bike, dragging into graph regions preserves live input, and rockets cross the old camera threshold without a jump. Screenshots are saved under ignored `test-results/` for visual review; failed runs also retain traces.

The browser clock is paused between explicit advances so screenshot capture cannot introduce unmeasured simulation time. SVG streak tests inspect geometry and stroke, since horizontal SVG lines have zero geometric height despite visible stroke.

Known limits: browser verification covers headless Edge on Windows at the two desktop resolutions, not physical touch hardware or every mobile browser. Frame gaps remain capped at 100 ms to avoid catch-up jumps. Reduced motion suppresses decorative stars, not the camera required to keep the ship visible. Extremely long Unlimited runs retain only five seconds by design; timed recordings retain up to 60 seconds. No Git repository was initialized or restructured. The Windows batch launcher is unchanged.
