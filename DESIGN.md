# Design System

## Theme
A highly premium, dark academic theme. Deep forest green backgrounds are paired with crisp white text and a singular glowing lime-yellow accent for focus.

## Color Palette
- **Background**: `#0A231C` (Deep Forest Green)
- **Cards & Containers**: `#0e352a` (Lighter Deep Green)
- **Accent**: `#E8F29E` (Glowing Lime-Yellow)
- **Text Primary**: `#FFFFFF` (White)
- **Text Muted**: `#a8bcb5` (Sage Green)
- **Text Dim**: `#7a8e87` (Dark Sage)
- **Borders & Dividers**: `rgba(232, 242, 158, 0.08)` (Lime tint)

## Typography
- **Primary Headers**: Sora (Sans-serif, bold, geometric, tracked tight)
- **Editorial Emphasis**: Playfair Display (Serif, italic, elegant)
- **Body & Controls**: Inter (Sans-serif, high legibility, 65-75ch line length max)

## Layout & Components
- **Nav**: Fixed overlay, transparent to deep forest green backdrop blur on scroll, solid lime interactive CTA.
- **Hero**: Atmospheric full-screen background (`/hero_bg.png`) with volumetric light beam, airy typography, minimal text layout.
- **Features (Sticky Scroll)**: 
  - Left column: cards with `min-h-[55vh]` height, transitioning between `opacity-100` and `opacity-30`.
  - Right column: sticky aspect-ratio box with morphing/animating contents (Evaluation Redlines, Mock Document, Proficiencies Bar Chart).
- **Footer**: SVG grid lines, bold letterpress call-to-action, grid links.
