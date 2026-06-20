# Scroll-Pinned Features Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement fullscreen scroll-pinning and synchronous animations for the features showcase in `Features.tsx` using Framer Motion's `useScroll` and CSS `sticky` layout.

**Architecture:** Wrap the features showcase in a `300vh` scroll track container. Pin the grid viewport at the top of the screen (`sticky top-0 h-screen`). Map the `scrollYProgress` using `useTransform` to translate the left-column text cards vertically, and update the active mockup screen index dynamically as the user scrolls.

**Tech Stack:** React 19, Next.js 16 (App Router), Framer Motion 12, Tailwind CSS 4

---

### Task 1: Viewport Pinning Layout in `Features.tsx`

**Files:**
- Modify: `components/landing/Features.tsx`

- [ ] **Step 1: Set up the outer scroll-track and sticky viewport containers**
  Modify the `Features` component JSX structure to wrap the grid in a `300vh` track and a `sticky` full-screen viewport. Update `components/landing/Features.tsx` with:
  ```tsx
  export default function Features() {
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null); // This will bind useScroll

    return (
      <section 
        id="features" 
        ref={containerRef} 
        className="relative h-[300vh] w-full"
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-center items-center py-20 z-10">
          {/* Editorial Header */}
          <div className="flex flex-col items-center text-center mb-10 shrink-0 px-6">
            <Chip className="mb-4">AI Tutor Capabilities</Chip>
            <h2 className="text-[clamp(1.8rem,4vw,2.5rem)] leading-tight font-bold font-sora text-lp-text tracking-tight max-w-[800px] mb-4">
              Supercharge <span className="font-playfair-italic text-lp-accent font-normal">your prep</span> with Active Intelligence.
            </h2>
            <p className="text-[13px] md:text-[14px] text-lp-muted max-w-[580px] leading-relaxed">
              Specifically tuned for the ICSI syllabus. No generic explanations, just rigorous preparation tailored for CS candidates.
            </p>
          </div>

          {/* Two-Column Grid container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full max-w-[1000px] mx-auto px-6 h-[500px]">
            {/* Left and Right Columns will go here */}
          </div>
        </div>
      </section>
    );
  }
  ```

- [ ] **Step 2: Run verification checks to ensure JSX compiles**
  Run: `npx tsc --noEmit`
  Expected: Success with no errors.

- [ ] **Step 3: Commit**
  ```bash
  git add components/landing/Features.tsx
  git commit -m "feat: set up scroll-track and sticky pinning wrappers in Features"
  ```

---

### Task 2: Implement Left-Column Card Translation Animation

**Files:**
- Modify: `components/landing/Features.tsx`

- [ ] **Step 1: Map scroll progress to text card translations**
  Import `useScroll`, `useTransform`, and `motion` from `framer-motion`. Set up the scroll progress hook and translate the left-column list:
  ```tsx
  import { useScroll, useTransform, useMotionValueEvent, motion, AnimatePresence } from "framer-motion";
  ```
  Inside `Features()`:
  ```tsx
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Map scroll progress (0 to 1) to vertical transform of the card wrapper
  // With 3 cards of height 450px, we translate the wrapper up by 0px to -900px
  const y = useTransform(scrollYProgress, [0, 1], ["0px", "-900px"]);
  ```

- [ ] **Step 2: Update left column layout to use fixed window and motion.div**
  Modify the left column wrapper in `Features.tsx` to define a fixed-height window (`h-[450px] overflow-hidden relative`) and make the inner card wrapper a `motion.div` styled with the vertical `y` transform:
  ```tsx
  {/* Left Column: Sliding cards */}
  <div className="h-[450px] overflow-hidden relative w-full pr-4">
    <motion.div style={{ y }} className="flex flex-col gap-0">
      {features.map((feature, i) => {
        // Since we are translating, focus is determined by activeIndex updated in Task 3
        const isActive = activeIndex === i;
        return (
          <div
            key={i}
            className="h-[450px] flex flex-col justify-center transition-all duration-500 py-6"
          >
            <div 
              className={`transition-all duration-500 origin-left ${
                isActive 
                  ? "opacity-100 scale-100 translate-x-2" 
                  : "opacity-20 scale-95 translate-x-0"
              }`}
            >
              <span className="text-xs uppercase tracking-[0.15em] font-bold text-lp-accent bg-lp-accent/10 px-3 py-1.5 rounded-lg border border-lp-accent/20 mb-4 inline-block">
                {feature.chip}
              </span>
              <h3 className="text-xl md:text-2xl font-bold font-sora text-lp-text mt-2 mb-3">
                {feature.title}
              </h3>
              <p className="text-[13px] md:text-[14px] text-lp-muted leading-[1.6] mb-5">
                {feature.description}
              </p>
              <ul className="space-y-2.5">
                {feature.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[11px] md:text-xs text-lp-muted">
                    <CheckCircle2 size={14} className="text-lp-accent mt-0.5 shrink-0" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </motion.div>
  </div>
  ```

- [ ] **Step 3: Run typescript verification**
  Run: `npx tsc --noEmit`
  Expected: Success.

- [ ] **Step 4: Commit**
  ```bash
  git add components/landing/Features.tsx
  git commit -m "feat: animate left-column text cards translation using useScroll and useTransform"
  ```

---

### Task 3: Mockup Transition State Updates

**Files:**
- Modify: `components/landing/Features.tsx`

- [ ] **Step 1: Set activeIndex based on scroll progress intervals**
  Remove the old `useEffect` which initialized `IntersectionObserver`. Instead, register a `useMotionValueEvent` listener on `scrollYProgress` inside the component:
  ```tsx
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.33) {
      setActiveIndex(0);
    } else if (latest < 0.66) {
      setActiveIndex(1);
    } else {
      setActiveIndex(2);
    }
  });
  ```

- [ ] **Step 2: Clean up unused code and verify imports**
  Remove any unused React `useEffect` hooks and the `CheckCircle2`, `FileText`, `BarChart3`, `AlertCircle`, `ArrowUpRight` imports if any are no longer needed (keep those used in the mockup layouts).

- [ ] **Step 3: Run verification tests**
  Run: `npx tsc --noEmit`
  Expected: Clean compilation.

- [ ] **Step 4: Commit**
  ```bash
  git add components/landing/Features.tsx
  git commit -m "feat: transition mockups dynamically based on scroll track progress zones"
  ```

---

### Task 4: Production Build Check

- [ ] **Step 1: Run compilation verification**
  Run: `npx tsc --noEmit`
  Expected: Success.

- [ ] **Step 2: Run Next.js production build**
  Run: `npm run build`
  Expected: Optimized static pages compile successfully with zero errors.

- [ ] **Step 3: Commit build verification state**
  ```bash
  git add components/landing/Features.tsx
  git commit -m "chore: complete features scroll-pinning verification"
  ```
