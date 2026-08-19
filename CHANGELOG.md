# Changelog

All notable changes to **Material Design 3 Expressive (Unofficial)** will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-17

### Added
- **Complete 36 Web Component Suite:**
  - Action: `md-button`, `md-split-button`, `md-icon-button`, `md-fab`, `md-fab-menu`, `md-segmented-button`
  - Input & Selection: `md-checkbox`, `md-radio-button`, `md-switch`, `md-slider`, `md-text-field`, `md-search-bar`
  - Pickers: `md-date-picker` (3 variants: docked, modal, range), `md-time-picker` (3 variants: dial, input, 24h)
  - Navigation: `md-top-app-bar`, `md-bottom-app-bar`, `md-navigation-bar`, `md-navigation-drawer`, `md-navigation-rail`, `md-tabs`
  - Feedback & Progress: `md-progress-indicator` (linear/circular/wavy), `md-loading-indicator` (8 expressive vector shapes + morph animations), `md-snackbar`, `md-tooltip`, `md-badge`, `md-dialog`
  - Containment & Layout: `md-card`, `md-carousel`, `md-bottom-sheet`, `md-side-sheet`, `md-list`, `md-menu`, `md-divider`, `md-toolbar`, `md-theme`
- **Dynamic HCT (Hue-Chroma-Tone) Color Engine:**
  - Pure JavaScript CAM16/CIELAB color space converter (`hct-color-engine.js`).
  - Runtime dynamic palette generator for Primary, Secondary, Tertiary, Neutral, and Error tones.
  - Full Light and Dark theme calculations with live root variable updating.
- **Damped Harmonic Oscillator Spring Motion Engine:**
  - Analytical and numerical physics solver for expressive spring trajectories (`spring-physics.js`).
  - `interactions.js` unified pointer capture and press-release pipeline.
- **Design Tokens:**
  - Full CSS Custom Properties for Colors, Elevation, Typography (Roboto Flex), Asymmetric Shapes, and Motion Easing.
- **Interactive Showcase Vitrine (`demo/` / `index.html`):**
  - Live component playground, theme switcher, HCT seed color picker, and responsive dual-level navigation.
- **140+ Automated Unit Tests:**
  - Token integrity, component exports, security/sanitization, and color math verification.
