# Design System

## Theme
A highly premium, dark academic theme. Deep Midnight Navy backgrounds are paired with crisp warm white text, textured Warm Stone Grey secondary elements, and high-impact Crimson Red accents.

## Color Palette
- **Background**: `#1B1E4A` (Midnight Navy Base)
- **Cards & Containers**: `#222659` (Elevated Midnight Navy)
- **Alt & Recessed Surfaces**: `#141639` (Deep Midnight / Sidebar)
- **Accent**: `#D21319` (Crimson Red)
- **Accent Hover**: `#b81015` (Crimson Red Hover)
- **Text Primary**: `#F8F8F6` (Crisp Warm White)
- **Text Secondary / Muted**: `#AFAEA2` (Warm Stone Grey)
- **Text Dim**: `#7C7B71` (Deep Stone)
- **Borders & Dividers**: `rgba(175, 174, 162, 0.14)` (Warm Stone tint)

## Typography
- **Primary Display Sans**: Syne / Plus Jakarta Sans (Black/Extrabold, architectural uppercase, tight tracking `-0.02em`)
- **Editorial Italic Display**: Instrument Serif / Playfair Display (Fluid high-contrast italic serif script for emotional emphasis & key action nouns)
- **Architectural Kickers & Micro-Annotations**: Tracked-out uppercase sans-serif (`tracking-[0.24em]` to `tracking-[0.28em]`, `text-[10px]` to `text-[13px]`, font-semibold)
- **Body & Controls**: Plus Jakarta Sans / Inter (High legibility, generous line height `1.65-1.75`)

## Layout & Components
- **Nav**: Fixed overlay, transparent to deep Midnight Navy backdrop blur on scroll, solid Crimson Red interactive CTA.
- **Hero**: Atmospheric full-screen background (`/hero_bg.png`) with volumetric Midnight Navy radial gradient, airy typography, minimal text layout.
- **Features (Sticky Scroll)**: 
  - Left column: cards with `min-h-[55vh]` height, transitioning between `opacity-100` and `opacity-30`.
  - Right column: sticky aspect-ratio box with morphing/animating contents (Evaluation Redlines, Mock Document, Proficiencies Bar Chart).
- **Footer**: SVG grid lines with subtle Warm Stone stroke, bold letterpress call-to-action, grid links.
