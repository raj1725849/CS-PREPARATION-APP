# Design Specification - Scroll-Pinned Features Showcase

This document specifies the technical and design implementation for pinning the Features section in the viewport while animating its text and mockup states synchronously via scroll progress.

## Goal
To prevent the features section from scrolling past too quickly, the showcase will pin (lock) in the center of the screen. As the candidate scrolls, the left-side cards slide up in a smooth flow, and the right-side mockups transition between their corresponding states. Once all features are showcased, normal scrolling resumes.

To ensure the layout remains fully visible without vertical clipping on laptop/desktop viewports (e.g. 768px height or smaller), the total height of the content is optimized to under 600px.

---

## Technical Architecture

### 1. Viewport Pinning Layout
The component layout will use CSS Sticky positioning:
- **Scroll Track Wrapper**: A `div` with `.relative` and a height of `300vh`. This establishes a scrollable track that is three times the height of the viewport.
- **Sticky Pin Box**: An inner `div` with `.sticky.top-0.h-screen.w-full.overflow-hidden.flex.flex-col.justify-center.items-center.py-6.z-10`. This pins the section full-screen in the viewport and centers the content vertically.
- **Grid Container**: Inside the Pin Box, a two-column grid (`.grid.grid-cols-1.lg:grid-cols-2.gap-12.w-full.max-w-[1000px].mx-auto.px-6.h-[400px].items-center`) houses the content.

### 2. Left Column: Scrollable Text Cards
- We wrap the text cards inside a viewport box with a fixed height of `h-[380px]`.
- An inner sliding track containing the cards is translated vertically (`y`) using Framer Motion's `useTransform` mapped to `scrollYProgress`:
  ```typescript
  const y = useTransform(scrollYProgress, [0, 1], ["0px", "-760px"]);
  ```
- Each card has a fixed height of `h-[380px]` and is styled to fit within this space.

### 3. Right Column: Mockup Visual
- The right-side visual container has a matching height of `h-[380px]` and stays fixed in the viewport.
- We monitor the `scrollYProgress` using `useMotionValueEvent` and update the active index:
  - `progress` from `0.00` to `0.33` $\rightarrow$ Card 0 active (Evaluation Mockup)
  - `progress` from `0.33` to `0.66` $\rightarrow$ Card 1 active (ICSI Mock Paper Mockup)
  - `progress` from `0.66` to `1.00` $\rightarrow$ Card 2 active (Analytics Dashboard Mockup)
- AnimatePresence will smoothly morph the mockup visual based on the active index.

---

## Verification Plan

### Automated Checks
- Verify typescript compiles cleanly:
  ```bash
  npx tsc --noEmit
  ```
- Build next.js application to check for production SSR safety:
  ```bash
  npm run build
  ```

### Manual Verification
- Test scroll feel on trackpad and mouse wheel to ensure scroll-locking is smooth and transitions are properly aligned.
- Verify section does not overflow or cause horizontal/vertical layout shifts.
