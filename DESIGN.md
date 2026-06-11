---
name: Cycler - High Performance Dashboard
colors:
  bg-color: '#060814'
  panel-bg: 'rgba(25, 28, 35, 0.6)'
  panel-border: 'rgba(255, 255, 255, 0.08)'
  text-primary: '#e1e1f3'
  text-secondary: '#ccc3d8'
  accent-primary: '#7c3aed'
  accent-secondary: '#d2bbff'
  accent-success: '#4edea3'
  accent-warning: '#ffb784'
  accent-danger: '#ffb4ab'
typography:
  body:
    fontFamily: 'Geist, Inter, sans-serif'
    fontWeight: '400'
    lineHeight: '1.6'
  heading:
    fontFamily: 'Geist, Inter, sans-serif'
    fontWeight: '600'
    letterSpacing: '-0.02em'
rounded:
  border-radius: '12px'
  card-radius: '16px'
  button-radius: '8px'
---

## Brand & Style
Cycler is a high-performance web-based cycling companion that uses AI pose estimation for real-time bike fit analysis and Bluetooth integration for smart trainers. The design language is built on "The Digital Void" aesthetic—a deep, obsidian space where high-contrast, glowing elements bring data into sharp focus.

The aesthetic is ultra-premium, blending **Glassmorphism** with **Minimalism**. Think CNC-milled aluminum meets glowing fiber optics. We prioritize data clarity while maintaining an ethereal, futuristic atmosphere.

### Core Principles
- **Deep Obsidian Base:** The background should be a rich, dark `#060814` to make glowing elements pop.
- **Luminous Accents:** Use Electric Violet (`#7c3aed`) for focal points, primary actions, and active states. Use Emerald Green (`#4edea3`) for success and validation.
- **Glass Surfaces:** Containers should use semi-transparent layers with deep background blurs (`backdrop-filter: blur(20px)`) rather than solid fills.
- **Technical Precision:** Typography should utilize a monospace-inspired font like Geist or Inter with tight letter spacing for headlines to create a "locked-in" technical feel.

### Layout Strategy
- Re-arrange components to maximize screen real estate for the most critical data: the real-time camera view and live telemetry.
- Navbars should be sleek, unobtrusive, and clearly indicate active states using the primary accent color.
- Group related controls logically to streamline the user flow during a workout or fit analysis session.
