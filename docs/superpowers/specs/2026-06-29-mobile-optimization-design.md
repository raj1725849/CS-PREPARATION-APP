# Brainstorming Design: Mobile & Tablet Optimization

## Project Context
The CS Prep app currently has a beautiful, highly-styled desktop interface (Cinematic Drama & Focus, dark forest tones). However, it is largely broken on mobile and tablet devices due to hardcoded layout dimensions, non-responsive sidebars, and desktop-only scroll interactions.

**Key Issues Identified:**
1. **Application Layout (`app/(main)/layout.tsx` & `components/Sidebar.tsx`)**:
   - The main content area has a hardcoded `ml-[240px]` margin.
   - The Sidebar has a fixed width of `w-[240px]` and is always visible, pushing the main content off-screen on small devices.
2. **Landing Page Sections (`Features.tsx`, etc.)**:
   - Scroll-based sticky layouts (e.g., the Features section with two columns and a 300vh scroll container) break when stacked vertically in `grid-cols-1` on mobile. The text and visual assets overlap.
3. **Internal App Pages**:
   - Lack of top navigation for mobile to toggle the sidebar.

## Proposed Approaches

### Approach 1: Quick Fix (CSS Only)
- Hide the sidebar on mobile and force users to use desktop for the main application.
- Disable the sticky scroll on the landing page for mobile, stacking the elements statically.
- **Trade-offs**: Extremely poor user experience for mobile students (who are a significant demographic). Doesn't actually solve the goal of "making it better end to end".

### Approach 2: Full Responsive Overhaul (Recommended)
- **Sidebar & App Navigation**: Introduce a mobile-friendly `TopBar` for the app that includes a Hamburger menu. The Sidebar becomes a slide-out off-canvas drawer on screens `< 768px` (managed by Tailwind's `md:` breakpoint and a state toggle). The main layout's margin `ml-[240px]` will be restricted to `md:ml-[240px]`.
- **Landing Page Interactivity**: Modify `Features.tsx` to conditionally render the sticky-scroll behavior only on `md:` breakpoints, falling back to a standard vertical stacked list (Text -> Image -> Text -> Image) on mobile. 
- **Component Fluidity**: Use `w-full` instead of fixed pixel widths for internal components like `ImageUploader`. Add padding to container elements to prevent edge-hugging.

## Design Decisions
We will proceed with **Approach 2**.

### 1. App Shell Architecture
- **Sidebar**: Add a `isMobileOpen` prop and state. When on mobile, use a semi-transparent backdrop and a slide-in animation.
- **Main Layout**: Update to `md:ml-[240px] w-full`.
- **TopBar**: Add a new `MobileAppNav` component (or integrate into `TopBar.tsx`) that shows the CS Prep logo and a hamburger menu.

### 2. Landing Page Adjustments
- **Features.tsx**: Instead of the 300vh scroll section triggering on mobile, we will use CSS media queries or React conditional rendering to display a standard stacked flexbox layout on mobile.
- **Hero & Nav**: Adjust font-size clamping and ensure the hamburger menu in `Nav.tsx` works smoothly without horizontal scrollbar.

## Spec Self-Review
- *Placeholder scan*: No placeholders.
- *Internal consistency*: The proposal to add a hamburger toggle aligns with the need to remove the fixed `ml-[240px]`.
- *Scope*: This is a medium-sized optimization spanning layout and one major landing page component. Very feasible.

*This design is ready for implementation.*
