# Design Specification - Dashboard and App Shell Redesign (Forest Green & Lime)

**Date**: 2026-06-20  
**Status**: Pending Review  
**Topic**: CS Prep Dashboard & App Shell Redesign  

---

## 1. Executive Summary
This design specification defines the visual, typographic, and component upgrades for the authenticated application shell (`app/(main)`) and the dashboard page. The goal is to move the student portal from a standard white/blue grid layout to a premium, immersive **Forest Green & Lime** digital console. The interface uses a dark forest green background, custom active indicators, glassmorphic headers, and customized SVG progress graphs that highlight academic metrics.

---

## 2. Visual Theme & Colors
Consistent with the landing page design tokens:
- **Brand Background**: `#0A231C` (Deep forest green console theme base)
- **Sidebar Background**: `#061814` (Darker forest green contrast)
- **Card Backgrounds**: `#0e352a` (Deep emerald/forest cards)
- **Accent Highlight**: `#E8F29E` (Glowing lime accent for buttons, borders, and active states)
- **Primary Text**: `#FFFFFF` (White)
- **Muted Text**: `#a8bcb5` (Sage Green)
- **Borders & Dividers**: `rgba(232, 242, 158, 0.08)` (Subtle glowing lime-tinted borders)
- **Success Tone**: `#E8F29E` (Lime highlight)
- **Warning/Error Tones**: `#ff6b6b` (Crimson accent for errors or weakest subjects)

---

## 3. Typography
- **Headings & Stat Numbers**: Sora (Geometric sans-serif, bold, modern, tight letter-spacing)
- **Editorial Subtitles**: Playfair Display (Serif, italic, elegant, e.g., in headers and modal titles)
- **Data Tables & Copy**: Inter (Clean, highly readable body copy)

---

## 4. Shell & Layout Components

### 4.1 Sidebar (`components/Sidebar.tsx`)
- **Background**: Change from `#0f2640` to deep contrast dark green `#061814`.
- **Active Navigation Item**:
  - Background hover/active: `bg-white/[0.03]` or `bg-white/[0.05]`.
  - Active border: Left-border highlight using glowing lime `#E8F29E` (instead of `#e8590c`).
  - Active icon and text color: `#E8F29E` or pure `#FFFFFF`.
- **Plan Status Box**:
  - Background `#0e352a` with border `rgba(232, 242, 158, 0.08)`.
  - Upgrade button: `#E8F29E` background with dark text `#0A231C`, hover scaling, and smooth hover transition.
- **Log Out Button**: Text color transition to red/emerald and matching hover states.

### 4.2 TopBar (`components/TopBar.tsx`)
- **Background**: Translucent glassmorphic header using `bg-[#0A231C]/80 backdrop-blur-md`.
- **Border**: Border-bottom with `rgba(232, 242, 158, 0.08)`.
- **Text & Breadcrumbs**:
  - Title: `#FFFFFF` using `font-playfair` for italics and Sora for main titles.
  - Breadcrumbs: Sage green `#a8bcb5` for secondary elements, hover states transitions.

### 4.3 Upgrade Modal (`components/UpgradeModal.tsx`)
- **Background**: Overlay using `bg-black/80 backdrop-blur-md`.
- **Modal Container**: `#0A231C` base background with `border border-[rgba(232,242,158,0.15)]`.
- **Plans Grid**:
  - Non-popular card: `#0e352a` base, border `rgba(232, 242, 158, 0.08)`.
  - Popular card: Highlighted border `border-[#E8F29E]` and glow.
- **Accent Details**:
  - Replace all orange `#e8590c` elements with glowing lime `#E8F29E` (popular badge, main call to action buttons).
  - Main button: `#E8F29E` bg with dark `#0A231C` text for maximum contrast.
  - Checkmarks: Light lime color `#E8F29E` checks.
  - Razorpay Theme Color: Update script color field config to `#E8F29E`.

---

## 5. Dashboard Page (`app/(main)/dashboard/page.tsx`)

### 5.1 Free Plan Gate
- Upgrade panel matching the landing page theme: Deep dark forest green `#0A231C` card, `#E8F29E` action button, text detailing premium benefits in modern typography.

### 5.2 Stat Cards Grid
- StatCard container background changed to `#0e352a`, border `rgba(232, 242, 158, 0.08)`.
- Value font using Sora, with color styling matching their status (e.g. Lime/White for high performance, Sage/Rose for lower performance).

### 5.3 Subject Progress & Common Mistakes
- **Subject Progress Bar**: 
  - Background bar track: `bg-[#061814]`.
  - Filled progress bar indicator: Gradient or solid `#E8F29E` lime indicator.
- **Common Mistakes Box**:
  - Warning/Tip banner: Dark olive background with lime details, replacing the light orange boxes.
  - Bullet icons: Glowing lime dots `#E8F29E`.

### 5.4 History Table
- Styled with dark background `#0e352a` or `#061814` for headers and rows.
- Text colors updated: Active text to `#E8F29E`, normal text to white/sage green, and border lines to `rgba(232, 242, 158, 0.04)`.

### 5.5 SVG Score Trend Chart
- Chart Area fill: Gradient from `#E8F29E` (lime) to transparent, with an opacity overlay.
- Line path: Pure `#E8F29E` lime stroke with responsive stroke-width.
- Grid line: Dasharray with subtle opacity.

---

## 6. Verification Plan
- **TypeScript & Lint Verification**: Run `npx tsc --noEmit` and build pipelines to verify code correctness.
- **Visual Design Verification**: Inspect on browser at `http://localhost:3000/dashboard` to check responsiveness, scroll bar aesthetics, active sidebar states, and the SVG chart gradients.
