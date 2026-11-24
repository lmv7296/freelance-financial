---
name: frontend-design
description: >-
  Use this skill whenever creating, modifying, or styling UI components, pages, forms,
  or dashboards in this project. Enforces a distinctive Design Thesis (Anthropic), Apple-grade
  fluid interaction physics (Emil Kowalski / WWDC: interruptible springs, pointer-down response,
  velocity handoff, rubber-banding, depth), and Material Design 3 + HeroUI shadcn primitives
  governed by strict Anti-AI-Slop constraints.
---

# Frontend Design & Fluid Interaction Engineering Guide

This skill governs all frontend architecture, visual aesthetics, and interaction mechanics. It synthesizes three proven pillars:

1. **Anthropic Frontend Design Thesis**: Give every interface an opinionated visual identity and a clear point of view before writing code. Build with the subject's authentic materials and pass the **Subject Swap Test**.
2. **Apple Fluid Interaction Engineering (Emil Kowalski / WWDC)**: Interfaces that feel like a physical extension of the user—zero latency on pointer-down, direct 1:1 manipulation, fully interruptible spring physics, momentum projection, rubber-banding, optical typography, and spatial consistency.
3. **Material Design 3 + HeroUI Shadcn System**: Structural elevation logic, tactile pill primitives, radiant glassmorphic surface depth, and gradient icon pods, bound by strict **Anti-AI-Slop** negative constraints.

---

## The Five-Phase Design Loop

Every screen or interactive component must progress through these five phases before completion:

```
[1. Frame Subject] ➔ [2. Design Thesis] ➔ [3. Swap Test] ➔ [4. Fluid Build] ➔ [5. Rendered Critique]
```

---

## Phase 1: Frame the Subject & Constraints

**Before writing a single line of CSS or JSX, anchor to the concrete subject:**

1. **The Concrete Subject**: What specific real-world domain is being built? (e.g. Dutch freelance installations, trade contracting invoicing, KV-meter electrical reports).
2. **Audience & Context**: Who uses this interface and in what setting? (e.g. a busy tradesperson on a mobile phone in a van vs. an accountant on a desktop).
3. **The Single Job**: What is the singular goal of this screen? (e.g. create a split-item invoice and send a WhatsApp payment request within 30 seconds).
4. **Emotional Posture**:
   - _Financial / Field Work_: Precision, craftsmanship, clarity, tactile reliability, confidence.
   - _Forbidden_: Over-hyped AI-tech neon gradients, playful gamification, or sterile corporate table soup.
5. **Real Domain Copy**: Never use placeholder text like "Lorem ipsum", "John Doe", "Acme Inc", or "Seamless solutions". Use authentic domain data (`Jan & Sophie de Vries • CV Ketel Onderhoud`, `NL84920194B01`, `Pitch 14 Vredenburg Markt`).

---

## Phase 2: Formulate the Design Thesis

> "The hero is a thesis. Open with the most characteristic thing in the subject's world."

1. **The Visual World Thesis**:
   - State what makes this visual world unique in one clear sentence.
   - Avoid the 3 cliché AI aesthetics:
     - ❌ Cliché 1: Warm cream background (`#F4F1EA`) + terracotta serif.
     - ❌ Cliché 2: Dark `#000000` pitch background + single neon acid-green/violet accent.
     - ❌ Cliché 3: Dry monochrome broadsheet with hairline borders and zero radius.
   - Instead, craft intentional, subject-specific palettes (e.g. deep indigo obsidian `#1E1B4B`, crisp slate borders, emerald verified accents, and luminous warm white cards).
2. **Typography with Optical Sizing**:
   - Headings: `font-bold tracking-tight` (as type gets larger, letter-spacing tightens).
   - Data & Numerics: All currency, dates, invoice IDs, and percentages MUST use tabular numerics (`tabular-nums font-mono`) to prevent visual jitter during updates.
   - Eyebrows & Tags: `text-[10px] sm:text-[11px] font-bold tracking-wider uppercase`.
   - Body Copy: `text-sm leading-relaxed text-muted-foreground`.
3. **Structure is Information, Not Decoration**:
   - Never use arbitrary `01 / 02 / 03` step badges unless the content is genuinely an ordered sequence.
   - Dividers and badges must encode category, state, or boundary—never decorative fluff.

---

## Phase 3: The Subject Swap Test

Before proceeding to code, run the **Subject Swap Test**:

> **"If we swap out the company logo and copy with a different company in a completely different industry, does this design still look like it could be theirs?"**

- If **YES**: The design is generic, templated AI slop. Reject it and integrate distinctive domain artifacts (e.g., invoice preview receipts, KvK verification pills, physical meter badges, trade categorizations).
- If **NO**: The design has a true point of view rooted in the subject's real world. Proceed to build.

---

## Phase 4: Apple Fluid Interaction Engineering

Interfaces should behave like continuous physical objects, not stepped state machines.

### 1. Response — Kill Latency on the Press
- **Respond on pointer-down, never on release**: Active feedback must occur the instant a finger or cursor touches the element.
- **Instant Press Feedback**:
  ```css
  /* Respond immediately on press */
  .interactive-element:active {
    transform: scale(0.97);
    transition: transform 100ms ease-out;
  }
  ```
- **Audit All Artificial Latencies**: Eliminate arbitrary timers, excessive debounces on user inputs, and click delays.

### 2. Direct Manipulation — 1:1 Pointer Tracking
- When a user drags a drawer, slider, or sheet, the element must stay glued 1:1 to the pointer.
- Preserve the exact grab offset: never snap to the center of the element on touch.
- Use Pointer Events with `setPointerCapture` so tracking persists even if the cursor escapes the element bounds.

### 3. Interruptibility — The #1 Motion Principle
- **Never lock user input during an animation.** If a modal or sheet is animating in, the user must be able to fling it back immediately.
- **Animate from Presentation (Current) Value**: On interrupt, read the element's live rendered transform and animate from where it currently is, NOT from a static target value.
- **Springs over `@keyframes`**: CSS `@keyframes` and linear transitions snap or break on reversal. Use spring physics that naturally blend velocity upon re-targeting.

### 4. Spring Mechanics (Behavior Over Fixed Duration)
Apple frames spring motion with two intuitive designer parameters instead of generic physics triplets:
- **Damping Ratio**:
  - `1.0` = **Critically Damped** (No bounce, smooth rapid settle). Use this as the default for 90% of UI transitions (dialogs, dropdowns, page navigations).
  - `0.8` = **Sub-critically Damped** (Slight bounce). Use ONLY when preceding physical momentum exists (e.g. a flick, drag release, or toss).
- **Response**: Speed of target reach in seconds (typically `0.3s` to `0.4s`).
- **Standard Apple Web Parameters**:

| Interaction | Damping | Response | Motion Feel |
| :--- | :--- | :--- | :--- |
| **Dialog / Popover Open** | `1.0` | `0.35s` | Critically damped, zero bounce |
| **Card Hover Lift / Drop** | `1.0` | `0.25s` | Snappy elevation shift |
| **Drawer / Bottom Sheet** | `0.8` | `0.30s` | Subtle physical settle |
| **Swipe / Fling Dismiss** | `0.8` | `0.40s` | Momentum follow-through |

### 5. Velocity Handoff & Momentum Projection
When releasing a gesture:
1. **Pass gesture velocity** directly into the spring's initial velocity.
2. **Project the resting position** using Apple's exponential decay formula:
   ```js
   // decelerationRate: 0.998 standard, 0.99 snappy
   function project(initialVelocity /* px/s */, decelerationRate = 0.998) {
     return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
   }

   const projectedEndpoint = currentPosition + project(releaseVelocity);
   const targetSnap = nearestSnapPoint(projectedEndpoint);
   animateSpringTo(targetSnap, { velocity: releaseVelocity });
   ```

### 6. Asymptotic Rubber-Banding
When dragging beyond hard bounds (e.g. list boundaries, drawer limits), apply Apple's asymptotic resistance formula:
```js
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
```

### 7. Spatial Consistency
- **Symmetric Trajectories**: What slides in from the right must dismiss to the right. Never enter from the right and exit to the bottom.
- **Anchored Origins**: Context menus and popovers must scale out from the trigger button (`transform-origin: trigger`), reinforcing spatial causality.

### 8. Materials, Vibrancy & Depth
- **Translucent Depth**: Use `backdrop-blur-md` or `backdrop-blur-xl` with semi-opaque surfaces (`bg-card/90` or `bg-background/80`).
- **Specular Rim Highlights**: 1px micro-borders (`border border-border/70` in light mode, `border-white/[0.08]` in dark mode) to simulate physical light reflection on glass edges.
- **Gradient-Toned Icon Pods**:
  ```jsx
  <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary border border-primary/25 shadow-xs">
    <Icon className="size-5" />
  </div>
  ```

---

## Phase 5: The Pre-Flight Slop Test Checklist

Before concluding any UI work, verify every item:

- [ ] **NO Cookie-Cutter Identical Grids**: Cards have varied hierarchy, distinct weightings, or contextual badges—not identical cookie-cutter boxes.
- [ ] **NO Emojis as UI Icons**: Emojis (💰, 🚀, 📄) are forbidden as interface iconography. Use crisp Lucide SVGs styled in coherent icon pods.
- [ ] **NO Generic AI Purple Gradients**: Avoid `#6366F1` to `#8B5CF6` gradient soup slapped onto dead gray backgrounds.
- [ ] **NO Dead Space**: Cards balance vertical rhythm with micro-stats, status badges, and clear actions.
- [ ] **Tabular Numbers for Data**: All numeric, currency, and count displays use `tabular-nums font-mono`.
- [ ] **Tactile Press Feedback**: Interactive buttons, cards, and tabs implement responsive press scaling (`active:scale-[0.97]` or `active:scale-[0.98]`).
- [ ] **High-Contrast Accessibility (WCAG 2.1 AA/AAA)**: Status badges pair rich, legible foregrounds with tinted backgrounds (`text-emerald-700 bg-emerald-500/15`).
- [ ] **Visible Focus Rings**: All interactive controls support `focus-visible:ring-2 focus-visible:ring-primary/20`.
- [ ] **Touch Target Safety**: All tap targets have a minimum hit area of 40×40px (`h-9.5` or `h-10` minimum for primary actions).
- [ ] **Reduced Motion Alternative**: Support `@media (prefers-reduced-motion: reduce)` by falling back to gentle opacity cross-fades without physical translation shock.

---

## Component Primitives Reference

### 1. Elevated Cards
```jsx
<Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-md shadow-xs hover:-translate-y-1 hover:shadow-lg hover:border-border transition-all duration-300 ease-out">
  {/* Content */}
</Card>
```

### 2. Pill Buttons
```jsx
<Button className="rounded-full px-5 h-9.5 font-semibold shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all cursor-pointer">
  {/* Action */}
</Button>
```

### 3. Status Capsule Badges
```jsx
<span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
  Voldaan
</span>
```
