---
name: c
description: >-
  Use this skill whenever creating, modifying, or styling UI components, pages, forms,
  or dashboards in this project. Enforces shadcn/ui primitives customized with an expressive
  Material Design 3 and HeroUI fusion, governed by strict Anti-AI-Slop design constraints:
  bespoke typography pairings, nuanced contextual palettes, custom iconography, intentional
  cubic-bezier easing curves, and a pre-flight Slop Test checklist.
---

# Material Design 3 + HeroUI Fusion Guide with Anti-AI-Slop Constraints

This design system blends the **structural clarity and elevation logic of Google Material Design 3 (M3)** with the **radiant, tactile aesthetics of HeroUI (formerly NextUI)**, governed by **strict anti-AI-slop design constraints**.

Every generated UI must feel intentional, artisanal, and production-grade. Generic "AI template" patterns are explicitly prohibited.

---

## 1. Context & Audience Inference (Phase 0 Mandate)

**Before writing a single line of CSS, JSX, or layout code, you MUST infer and anchor to the domain context:**

1. **Target Audience**: Who is using this screen? (e.g., freelance contractors, finance managers, designers, enterprise ops).
2. **Emotional Posture**: What sentiment must the interface evoke?
   - _Financial / Invoicing_: Confidence, precision, trustworthiness, tactile control.
   - _Not_: Over-hyped tech-SaaS neon glow, toyish gamification, or corporate monotony.
3. **Information Density**: Financial workflows require clear hierarchy, legible tabular numbers, and scannable statuses—never bloated, empty decorative fluff.

---

## 2. Anti-AI Typography Criteria

### Prohibited Typography

- **STRICTLY FORBIDDEN**: Default, overused "AI-standard" font selections:
  - `Inter`, `Roboto`, `Arial`, plain browser default `system-ui`, or `Space Grotesk`.
- **STRICTLY FORBIDDEN**: Mismatched font fallbacks that silently drop to browser Times New Roman or Georgia.

### Required Typographic System

- **Curated Pairings**: Pair fonts with distinct character suited to the project voice:
  - _Editorial Financial_: Character-rich modern sans (e.g., `Geist`, `Plus Jakarta Sans`, `Outfit`, `Cabinet Grotesk`) paired with a purposeful display serif for large milestones or monospaced tabular figures (`Geist Mono`, `JetBrains Mono`) for financial figures.
- **Tabular Numerics**: All numeric financial data (revenues, invoice amounts, percentages) must use tabular figure styling (`tabular-nums` / `font-mono`) to prevent visual jitter and align data cleanly.
- **Hierarchy & Tracking**:
  - Headings: `tracking-tight font-semibold` or `font-bold`.
  - Uppercase tags/badges: `tracking-wider text-[11px] font-bold uppercase`.
  - Body: `leading-relaxed text-sm text-muted-foreground`.

---

## 3. Color Palette Restrictions & Depth Logic

### Prohibited Color Schemes

- **STRICTLY FORBIDDEN**: Generic "AI SaaS defaults":
  - Neon purple/indigo gradients (`#6366F1` to `#8B5CF6`) plastered on stark `#FFFFFF` or pitch black `#000000`.
  - Flat, desaturated grayish card soup with zero warmth or depth.
  - Lazy single-layer drop shadows (`shadow-md` with harsh opacity).

### Required Color & Surface Architecture

- **Nuanced, Contextual Palettes**:
  - Ground the app in purposeful undertones: slate-tinted zinc, warm stone, deep obsidian (`oklch(0.14 ...)`), and rich emerald / amber / sapphire accent roles.
- **Multi-Layered Surface Depth**:
  - **Glassmorphic Tonal Surface**: `bg-card/90 backdrop-blur-md border border-border/70`
  - **Luminous Rim Borders**: Soft 1px outlines (`border-border/70` in light mode, `border-white/[0.08]` in dark mode).
  - **Gradient-Toned Icon Pods**: Never plain flat squares. Use dual-stop soft radial or diagonal gradient pods with colored borders:

    ```jsx
    // Amber / Pending Warning Pod
    <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-xs">
      <Clock className="size-5" />
    </div>

    // Emerald / Revenue Success Pod
    <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs">
      <DollarSign className="size-5" />
    </div>
    ```

---

## 4. The "Slop Test" Layout Checklist (Pre-Flight Negative Constraints)

Before finalizing any component or page layout, run through this checklist and eliminate all flagged patterns:

- [ ] **NO Cookie-Cutter Uniform Card Grids**:
  - _Prohibited_: An endless grid where every single card has the exact same width, height, and content structure.
  - _Required_: Asymmetric rhythm, Bento-grid layouts, primary/secondary card weighting, or combined master-detail panes.
- [ ] **NO Emoji Arrays in Place of Icons**:
  - _Prohibited_: Using emojis (e.g. 💰, 📈, 🚀, ⏳, 📄, ⚠️) as interface iconography.
  - _Required_: Crisp, hand-picked SVGs from `lucide-react` or Radix icons, styled inside coherent icon containers.
- [ ] **NO Predictable AI Placeholder Copy**:
  - _Prohibited_: "Lorem ipsum", "John Doe", "Acme Corporation", "Manage your workflows with our cutting-edge AI tools", "Track everything seamlessly".
  - _Required_: Realistic, grounded domain data (e.g., "Elena Rostova • Branding Retainer", "INV-2041 • Due in 5 days", "Stripe Connect Payout • Processing").
- [ ] **NO Giant Dead Space**:
  - _Prohibited_: Empty cards with a tiny number in the corner and 80% blank white space.
  - _Required_: Balanced vertical distribution, contextual trend pills, secondary micro-stats, or inline progress bars.

---

## 5. Motion, Easing & Micro-Interactions

### Prohibited Motion

- **STRICTLY FORBIDDEN**: Browser-default `linear` transitions (`transition: all 0.2s linear`) or harsh un-eased snapping.

### Required Motion Principles

- **Curated Cubic-Bezier Easing**:
  - **Entrance / Elevation Lift**: Use snappy deceleration curves:
    - CSS: `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo) or Tailwind: `ease-out duration-300`.
  - **Tactile Compression**:
    - Quick responsive return: `active:scale-[0.98] transition-transform duration-150 ease-out`.
- **Realistic Timing Standards**:
  - Micro-toggles and button presses: **100ms – 150ms**
  - Card hover lifts and elevation shifts: **250ms – 300ms**
  - Modals, drawers, and expand/collapse accordions: **350ms – 400ms**
- **Dynamic Hover States**:
  - Elevated cards must subtly lift on hover (`hover:-translate-y-1 hover:shadow-xl hover:border-border/90`).

---

## 6. Accessibility & Visual Validation Mandate

- **Color Contrast (WCAG 2.1 AA / AAA)**:
  - Faint yellow-on-white or low-contrast gray text is strictly forbidden.
  - Status text must pair dark saturated foregrounds with tinted backgrounds:
    - `bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25`
    - `bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25`
    - `bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25`
- **Focus Rings**:
  - Every interactive surface must support visible, high-contrast keyboard focus indicators (`focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-hidden`).
- **Touch Target Discipline**:
  - Interactive elements must maintain a minimum bounding box of 40×40px (`h-10` minimum for primary actions, pill buttons with ample horizontal padding `px-5`).

---

## 7. Component Implementation Standards

### 1. Cards (`@/components/ui/card` + `ReusableCard`)

- Always apply M3 corner radius: **`rounded-2xl`** (16px) or **`rounded-3xl`** (24px).
- Pair with HeroUI surface finishes:
  - **`elevated`**: `border border-border/70 bg-card/90 backdrop-blur-md shadow-xs hover:-translate-y-1 hover:shadow-xl hover:border-border/90 transition-all duration-300 ease-out`
  - **`glass`**: `border border-white/20 dark:border-white/10 bg-card/60 backdrop-blur-xl shadow-lg hover:-translate-y-1 hover:shadow-2xl`
  - **`outlined`**: `border border-border/90 shadow-none bg-card hover:-translate-y-1 hover:shadow-md hover:border-foreground/30`
  - **`filled` (Tonal)**: `border-none shadow-none bg-muted/60 dark:bg-muted/30 hover:bg-muted/80 hover:-translate-y-0.5`

### 2. Buttons (`@/components/ui/button`)

- M3 Pill Shape: **`rounded-full`** with tactile press scaling (`active:scale-[0.97]`).
- Primary CTA: High contrast, subtle resting shadow, hover elevation (`rounded-full px-5 font-semibold shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all`).
- Secondary: Pill outline with tonal background hover (`rounded-full px-5 border-border/80 hover:bg-muted/60 active:scale-[0.97] transition-all font-medium`).

### 3. Status Chips & Trend Badges

- Pill capsules with 1px border and optional glowing status dots:
  ```jsx
  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
    Settled
  </span>
  ```

---

## 8. Summary Checklist for Code Generation

Before outputting code, verify:

1. Did I choose purposeful, non-generic typography with tabular numerals for data?
2. Did I eliminate generic purple SaaS gradients and flat drop shadows?
3. Did the layout pass the **Slop Test** (no identical cookie-cutter cards, zero emojis as icons, realistic domain copy)?
4. Are hover and press interactions governed by intentional cubic-bezier easing curves?
5. Is the design custom-tailored to the target industry rather than a generic tech template?
6. Are color contrast ratios and keyboard focus rings fully compliant with production accessibility standards?
