# Design Specification - Landing Page Redesign (Forest Green & Lime)

**Date**: 2026-06-20  
**Status**: Pending Review  
**Topic**: CS Prep Landing Page Redesign  

---

## 1. Executive Summary
This design specification defines the visual, typographic, and animation upgrades for the CS Prep landing page. The goal is to transition the page from a standard SaaS appearance to a premium, dark academic digital experience. The interface uses a deep forest green background, glowing lime highlights, and an editorial typography layout.

---

## 2. Visual Theme & Colors
- **Color Strategy**: Committed / Drenched (dark forest green branding).
- **Primary Background**: `#0A231C` (OKLCH: `oklch(0.2 0.04 150)`)
- **Card Backgrounds**: `#0e352a` (OKLCH: `oklch(0.25 0.05 150)`)
- **Accent Highlight**: `#E8F29E` (OKLCH: `oklch(0.92 0.12 110)`)
- **Primary Text**: `#FFFFFF` (White)
- **Muted Text**: `#a8bcb5` (Sage Green)
- **Dividers & Borders**: `rgba(232, 242, 158, 0.08)`

---

## 3. Typography
- **Headings**: Sora (Geometric sans-serif, bold, tight letter-spacing)
- **Editorial Contrast**: Playfair Display (Serif, italic, elegant, used in headers for key terms like *exam intelligence*, *four steps*, *becoming a CS*)
- **Body Copy**: Inter (Clean, highly readable sans-serif, limited to 65-75ch line length)

---

## 4. Section Upgrades

### 4.1 Hero Section
- **Tagline**: "Go beyond compliance. Master *your syllabus* with AI."
- **Subtitle**: "Evaluates law and tax answers line-by-line, explains why you lost marks, and drafts ideal answers."
- **Layout**: Left-aligned text overlay with the volumetric light beam background visual (`/hero_bg.png`) shifted to the right side of the screen. High-contrast, minimal layout with two action buttons.

### 4.2 Features Showcase (Progressive Sticky Scroll)
- **Layout**: Two columns.
  - **Left column**: Lists the 3 main features (AI Answer Evaluation, Mock Papers, Performance Dashboard) as scrollable cards. Cards fade in/out based on viewport intersection.
  - **Right column**: Stays sticky. Renders a single high-fidelity dashboard frame.
- **Animation (Approach 1 - Progressive Element Reveal)**: Instead of panel-swapping, the elements *inside* the dashboard morph in place as the user scrolls:
  - **Step 1 (Evaluation)**: Shows the answer sheet, and AI point redlines draw themselves sequentially.
  - **Step 2 (Mock Papers)**: The answer sheet morphs into a mock exam paper, scrolling through structured questions.
  - **Step 3 (Dashboard)**: The paper fades, and subject proficiency bar charts grow from 0% to their values.

### 4.3 Footer Section
- **Background**: Deep forest green with an SVG grid pattern (lime colored lines at low opacity).
- **Editorial Bold Title**: "Start your journey to *becoming a CS* today."
- **Grid Layout**: Clean, structured grid of links (Platform, Support) and bottom signature.

---

## 5. Verification Plan
- **Type Check**: Ensure no TypeScript compilation errors:
  ```bash
  npx tsc --noEmit
  ```
- **Local Review**: Run the dev server to visually inspect animations and layouts:
  ```bash
  npm run dev
  ```
