# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the landing page to feature a forest green and lime-yellow color palette, a cinematic hero section, an editorial font pairing, and a progressive sticky scroll features showcase.

**Architecture:** Update variables in `globals.css` to skin the landing page components, apply the Sora and Playfair Display typography styling, re-layout the Hero with a left-aligned container, and implement a morphing dashboard container in `Features.tsx` that animates elements progressively.

**Tech Stack:** Next.js, Tailwind CSS v4, Framer Motion, Lucide React

---

### Task 1: Navigation & Globals Configuration

**Files:**
- Modify: `app/globals.css`
- Modify: `components/landing/Nav.tsx`

- [ ] **Step 1: Verify `globals.css` variables and utility classes**
  Ensure these colors and font classes are present at the top of `app/globals.css`:
  ```css
  @theme {
    /* ... other variables ... */
    --color-lp-bg: #0A231C;
    --color-lp-bg-card: #0e352a;
    --color-lp-bg-alt: #061814;
    --color-lp-accent: #E8F29E;
    --color-lp-accent-hover: #d9e28f;
    --color-lp-text: #FFFFFF;
    --color-lp-muted: #a8bcb5;
    --color-lp-dim: #7a8e87;
    --color-lp-verydim: #52635d;
    --color-lp-border-subtle: rgba(232, 242, 158, 0.08);
    --color-lp-border-medium: rgba(232, 242, 158, 0.2);
  }

  .font-playfair-italic {
    font-family: var(--font-display), serif;
    font-style: italic;
  }
  ```

- [ ] **Step 2: Refine scroll blurs and button colors in `Nav.tsx`**
  Ensure [Nav.tsx](file:///c:/Users/LENOVO/CS%20PREP/components/landing/Nav.tsx) has the correct scroll background transitions and solid lime button styling:
  ```typescript
  const background = useTransform(
    scrollY,
    [0, 60],
    ["rgba(10, 35, 28, 0)", "rgba(10, 35, 28, 0.95)"]
  );
  const borderBottom = useTransform(
    scrollY,
    [0, 60],
    ["1px solid rgba(232, 242, 158, 0)", "1px solid rgba(232, 242, 158, 0.1)"]
  );
  ```
  And ensure the "Get Started" button uses the solid lime design:
  ```typescript
  className="bg-lp-accent hover:bg-lp-accent-hover text-[#0A231C] px-5 py-2.5 rounded-[12px] text-[14px] font-bold transition-all shadow-[0_4px_14px_0_rgba(232,242,158,0.2)]"
  ```

- [ ] **Step 3: Verification**
  Run: `npx tsc --noEmit`
  Expected: Compile successfully.
  Run: `npm run dev` and verify that the Navigation bar blurs cleanly on scroll.

- [ ] **Step 4: Commit**
  ```bash
  git add app/globals.css components/landing/Nav.tsx
  git commit -m "style: refine global colors and navigation bar styles"
  ```

---

### Task 2: Minimalist Cinematic Hero Redesign

**Files:**
- Modify: `components/landing/Hero.tsx`

- [ ] **Step 1: Modify layout to left-aligned with right-side background balance**
  Update [Hero.tsx](file:///c:/Users/LENOVO/CS%20PREP/components/landing/Hero.tsx) to align content left, matching Option B:
  ```typescript
  // Update section container and text alignment:
  <section className="relative flex flex-col items-center lg:items-start justify-center min-h-screen px-6 pt-36 pb-24 overflow-hidden text-center lg:text-left w-full">
    {/* Cinematic Background Image Layer */}
    <div 
      className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 scale-105"
      style={{ 
        backgroundImage: "url('/hero_bg.png')",
        filter: "brightness(0.85) contrast(1.05)" 
      }}
    />
    
    {/* Radial Overlay to balance visual weight */}
    <div 
      className="absolute inset-0 pointer-events-none z-0" 
      style={{ 
        background: "radial-gradient(circle at right, rgba(10,35,28,0.2) 0%, #0A231C 75%)" 
      }}
    />

    {/* Left-aligned content container */}
    <div className="relative z-10 flex flex-col items-center lg:items-start max-w-[800px] lg:pl-12">
      <Chip className="mb-6">For ICSI Company Secretary candidates</Chip>
      <h1 className="text-[clamp(2.2rem,5vw,4.2rem)] leading-[1.12] font-bold font-sora text-lp-text tracking-tight mb-8">
        Go beyond compliance. <br />Master <span className="font-playfair-italic text-lp-accent font-normal">your syllabus</span> with AI.
      </h1>
      <p className="text-[15px] md:text-[17px] text-lp-muted max-w-[540px] mb-12 leading-[1.75]">
        Evaluates law and tax answers line-by-line, explains why you lost marks, and drafts ideal answers.
      </p>
      
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
        <Link href="/login?signup=true" className="w-full sm:w-auto">
          <button className="w-full sm:w-auto bg-lp-accent hover:bg-lp-accent-hover text-[#0A231C] px-10 py-4 rounded-[12px] text-[16px] font-bold tracking-wide transition-all duration-300 shadow-[0_8px_30px_rgba(232,242,158,0.25)]">
            Active Intelligence
          </button>
        </Link>
        <a href="#features" className="w-full sm:w-auto">
          <button className="w-full sm:w-auto bg-transparent border border-lp-border-medium hover:border-lp-accent text-lp-text px-10 py-4 rounded-[12px] text-[16px] font-semibold tracking-wide transition-all duration-300 hover:bg-[rgba(232,242,158,0.05)]">
            See it in action
          </button>
        </a>
      </div>
    </div>
  </section>
  ```

- [ ] **Step 2: Verification**
  Verify in browser that the tagline is styled correctly and aligns left on desktop.

- [ ] **Step 3: Commit**
  ```bash
  git add components/landing/Hero.tsx
  git commit -m "feat: redesign hero section to left-aligned editorial layout"
  ```

---

### Task 3: Progressive Sticky Scroll Features Showcase

**Files:**
- Modify: `components/landing/Features.tsx`

- [ ] **Step 1: Refine active card styling and spacing**
  Ensure the left-hand scrollable cards in [Features.tsx](file:///c:/Users/LENOVO/CS%20PREP/components/landing/Features.tsx) have sufficient scroll height (`min-h-[75vh]`) so the transitions do not feel rushed.
  Update card styling to fade cleanly:
  ```typescript
  className="feature-scroll-card min-h-[75vh] flex flex-col justify-center transition-all duration-500 py-16 first:pt-0 last:pb-24"
  ```

- [ ] **Step 2: Implement element-level transitions inside the sticky mockup container**
  Instead of rendering separate containers, render a single dashboard mockup layout that dynamically updates its contents based on `activeIndex`:
  ```typescript
  {/* Sticky Mockup Visual Showcase */}
  <div className="lg:sticky lg:top-[120px] w-full aspect-[4/3] rounded-2xl bg-[#0e352a]/60 border border-lp-border-medium shadow-[0_20px_50px_rgba(232,242,158,0.04)] overflow-hidden flex flex-col p-4 md:p-6 min-h-[350px] md:min-h-[420px] z-10 backdrop-blur-md">
    
    {/* Unified Mock Dashboard Shell */}
    <div className="w-full h-full flex flex-col justify-between text-left font-sans text-xs text-white">
      {/* Header (common for all views) */}
      <div className="flex justify-between items-center pb-3 border-b border-lp-border-subtle">
        <div>
          <h4 className="font-bold font-sora text-lp-text">Active Study Intelligence</h4>
          <p className="text-[10px] text-lp-muted">Student Session Tracker</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-lp-accent font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-lp-accent animate-ping" />
          <span>Live Analysis</span>
        </div>
      </div>

      {/* Dynamic Content Area (Morphs based on activeIndex) */}
      <div className="flex-grow py-4 overflow-y-auto scrollbar-none relative">
        <AnimatePresence mode="wait">
          {activeIndex === 0 && (
            <motion.div
              key="eval"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-2.5"
            >
              <div className="bg-lp-bg-card/40 border border-lp-border-subtle p-3 rounded-lg flex items-center justify-between">
                <span>Subject: Company Law</span>
                <span className="font-bold text-lp-accent">3.5 / 5.0 Marks</span>
              </div>
              <div className="bg-red-950/20 border border-red-900/20 p-2.5 rounded-lg">
                <p className="font-semibold text-red-300">Section 101(1) citation missing</p>
                <p className="text-[9px] text-lp-muted mt-0.5">Deducted 1.0 mark. Official rubric requires citing 21 clear days notice rules.</p>
              </div>
            </motion.div>
          )}

          {activeIndex === 1 && (
            <motion.div
              key="paper"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <div className="text-center space-y-0.5 border-b border-lp-border-subtle/50 pb-2">
                <span className="text-[9px] uppercase tracking-wider text-lp-muted">EXECUTIVE PROGRAMME</span>
                <h5 className="font-bold text-lp-text">SECURITIES LAWS & CAPITAL MARKETS</h5>
              </div>
              <div className="text-[10px] text-lp-muted leading-relaxed">
                <strong>Q1.</strong> Draft a Board Resolution to approve the buyback of equity shares under Section 68. [10 Marks]
              </div>
            </motion.div>
          )}

          {activeIndex === 2 && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <div className="flex justify-between items-center bg-lp-accent/5 p-2 rounded border border-lp-accent/10 text-[10px]">
                <span className="text-lp-muted">Proficiency: <strong>68% average</strong></span>
                <span className="text-lp-accent">36 papers attempted</span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[9px] text-lp-dim mb-1">
                    <span>Company Law</span>
                    <span>72%</span>
                  </div>
                  <div className="h-1 bg-lp-bg-card rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-lp-accent"
                      initial={{ width: 0 }}
                      animate={{ width: "72%" }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-lp-dim mb-1">
                    <span>Tax Laws</span>
                    <span className="text-red-400">42%</span>
                  </div>
                  <div className="h-1 bg-lp-bg-card rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-red-400"
                      initial={{ width: 0 }}
                      animate={{ width: "42%" }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>
  ```

- [ ] **Step 3: Verification**
  Run local dev server. Scroll through each feature card on the left. Verify that the right-side visual elements slide/grow smoothly and that the height feels comfortable.

- [ ] **Step 4: Commit**
  ```bash
  git add components/landing/Features.tsx
  git commit -m "feat: upgrade sticky scroll Features showcase to progressive reveal morphing"
  ```

---

### Task 4: Layout & Typography Styling of Other Sections

**Files:**
- Modify: `components/landing/HowItWorks.tsx`
- Modify: `components/landing/Pricing.tsx`
- Modify: `components/landing/FAQ.tsx`
- Modify: `components/landing/CallToAction.tsx`

- [ ] **Step 1: Skin and style typography**
  Ensure the editorial header styling is present in [HowItWorks.tsx](file:///c:/Users/LENOVO/CS%20PREP/components/landing/HowItWorks.tsx#L63), [Pricing.tsx](file:///c:/Users/LENOVO/CS%20PREP/components/landing/Pricing.tsx#L90), [FAQ.tsx](file:///c:/Users/LENOVO/CS%20PREP/components/landing/FAQ.tsx#L47), and [CallToAction.tsx](file:///c:/Users/LENOVO/CS%20PREP/components/landing/CallToAction.tsx#L34):
  `From syllabus to exam-ready in <span className="font-playfair-italic text-lp-accent font-normal">four steps.</span>`
  And that primary CTA buttons in `Pricing.tsx` and `CallToAction.tsx` use the updated solid lime scheme with dark green text.

- [ ] **Step 2: Verification**
  Check the complete landing page. Verify color theme cohesion and text contrast across all blocks.

- [ ] **Step 3: Commit**
  ```bash
  git add components/landing/HowItWorks.tsx components/landing/Pricing.tsx components/landing/FAQ.tsx components/landing/CallToAction.tsx
  git commit -m "style: apply theme colors and editorial typography to all landing sections"
  ```

---

### Task 5: Grid Footer Setup

**Files:**
- Modify: `components/landing/Footer.tsx`

- [ ] **Step 1: Check Footer pattern grid and layout**
  Ensure [Footer.tsx](file:///c:/Users/LENOVO/CS%20PREP/components/landing/Footer.tsx) correctly implements the fine SVG background grid, grid columns, and signature signature blocks:
  ```html
  <svg width="100%" height="100%">
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E8F29E" strokeWidth="1" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
  ```

- [ ] **Step 2: Verification**
  Run: `npx tsc --noEmit`
  Expected: Success.
  Run: `npm run build`
  Expected: Complete production build succeeds with no warnings or errors.

- [ ] **Step 3: Commit**
  ```bash
  git add components/landing/Footer.tsx
  git commit -m "style: apply grid pattern footer layout"
  ```
