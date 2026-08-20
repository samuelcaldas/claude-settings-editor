---
name: Claude Settings Editor
description: Visual web editor for Claude Code settings.json
colors:
  bg: "#141619"
  bg-surface: "#1e2227"
  bg-elevated: "#282c34"
  border: "#353b45"
  border-focus: "#e06c75"
  text: "#abb2bf"
  text-muted: "#8b95a8"
  text-bright: "#eceff4"
  accent: "#d19a66"
  accent-hover: "#e5c07b"
  green: "#98c379"
  red: "#e06c75"
  yellow: "#e5c07b"
  blue: "#61afef"
  purple: "#c678dd"
typography:
  display:
    fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', monospace"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.5px"
  body:
    fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', monospace"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.3px"
rounded:
  sm: "2px"
  md: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.text-bright}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-danger:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.red}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  nav-tab:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.accent}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  input-text:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.text-bright}"
    rounded: "{rounded.md}"
    padding: "7px 9px"
  card-rule:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-bright}"
    rounded: "{rounded.md}"
    padding: "10px"
---

# Design System: Claude Settings Editor

## Overview

**Creative North Star: "The Console Workbench"**

The Claude Settings Editor embodies the tactile, disciplined precision of a professional developer terminal console. Built for engineers and team leads tuning their Claude Code environments, the interface rejects decorative excess in favor of uncompromising monospace legibility, high-contrast syntax highlighting (inspired by the classic One Dark palette), and purposeful tactile controls.

Every surface is engineered for dense technical scanning. Form elements, scope badges, navigation tabs, and dynamic rule lists operate with mechanical responsiveness. Borders, tonal transitions, and amber/copper accents provide clear visual affordances without distraction.

**Key Characteristics:**
- Monospace-first typographic hierarchy with sans-serif prose accents for descriptions.
- Rich 3-tier dark surface system (`#141619` base canvas, `#1e2227` panels, `#282c34` interactive elements).
- Tactile, mechanical feedback on interactive states and buttons.
- Functional syntax color-coding for status indicators, validation diagnostics, and scope badges.

## Colors

The color palette is derived from classic terminal syntax highlighting palettes, using warm amber as the primary active accent against deep graphite neutral grounds.

### Primary
- **Warm Amber Accent** (`#d19a66`): Used for primary action buttons, active tab indicators, brand marks, and focused radio/checkbox highlights.
- **Amber Hover Glow** (`#e5c07b`): Hover state for primary interactive elements.

### Neutral
- **Base Canvas Ground** (`#141619`): Deepest background layer for the entire application viewport.
- **Panel Surface** (`#1e2227`): Intermediate container layer for navigation bars, headers, and rule boxes.
- **Elevated Control Surface** (`#282c34`): Background for inputs, select menus, secondary buttons, and dynamic card items.
- **Structural Border** (`#353b45`): 1px boundary dividing panels, inputs, and section groups.
- **Focus Border** (`#e06c75`): Validation error boundary and focus highlight token.
- **Muted Text** (`#636d83`): Secondary hints, setting keys, placeholders, and inactive status indicators.
- **Standard Text** (`#abb2bf`): Default body text, tab labels, and input labels.
- **Bright Text** (`#eceff4`): High-emphasis headers, active values, and selected text.

### Functional Roles
- **Terminal Green** (`#98c379`): Success status indicators, clean validation states, and allow rules.
- **Terminal Red** (`#e06c75`): Validation errors, delete actions, danger buttons, and deny rules.
- **Terminal Yellow** (`#e5c07b`): Warnings, scope mismatch notices, and ask rules.
- **Terminal Blue** (`#61afef`): Inline code identifiers, setting path references, and info badges.
- **Terminal Purple** (`#c678dd`): Enterprise managed scope badges and policy indicators.

### Named Rules
**The Single Accent Rule.** Warm amber (`#d19a66`) is reserved for primary focus and active navigation. Functional state colors (`#98c379`, `#e06c75`, `#e5c07b`, `#61afef`, `#c678dd`) are applied strictly for semantic classification.

## Typography

**Display Font:** `SF Mono`, `Cascadia Code`, `Fira Code`, monospace (fallback: `monospace`)
**Body Font:** `SF Mono`, `Cascadia Code`, `Fira Code`, monospace (fallback: `monospace`)
**Prose/Hint Font:** `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`

**Character:** Strict monospace precision for all setting identifiers, values, inputs, and tab controls, paired with neutral system sans-serif for descriptive explanations and field hints.

### Hierarchy
- **Display** (600 weight, 14px, line-height 1.4, letter-spacing 0.5px): Header branding and primary section titles.
- **Headline / Section Title** (600 weight, 14px, line-height 1.4): Panel headings with bottom border dividers.
- **Body / Monospace** (400 weight, 13px, line-height 1.5): Standard UI text and code values.
- **Label** (600 weight, 11px, letter-spacing 0.3px): Input field headers, scope selectors, and toolbar controls.
- **Hint / Prose** (400 weight, 11px-12px, line-height 1.5, sans-serif): Contextual explanations underneath setting controls.

### Named Rules
**The Code-Is-Identity Rule.** Setting paths, JSON keys, and values must always be rendered in monospace `<code>` typography and styled with distinct semantic color highlights.

## Layout

The layout uses a responsive fixed-viewport app shell with independent vertical scrolling for navigation and content areas.

- **App Shell**: Full viewport height (`100vh`) with fixed flex header, two-pane master-detail desktop layout, and scrollable `main` area.
- **Desktop Navigation**: Fixed 200px sidebar (`--nav-w: 200px`) with categorized section groupings and left-accent active tab indicators.
- **Mobile Navigation**: Sticky bottom navigation bar (52px height) with horizontal touch scrolling and top-accent active indicators.
- **Form Grid**: Single-column vertical stacking with 2-column grid (`.grid-2`) on desktop for paired setting fields.
- **Spacing Rhythm**: Based on a compact 4px / 8px / 12px / 16px / 20px scale tailored for high-density configuration tools.

## Elevation & Depth

Depth is established primarily through 3-tier tonal surface layering supplemented by subtle accent outlines and border shifts on interactive states.

- **Layer 0 (Canvas)**: `#141619` — the base ground.
- **Layer 1 (Surface)**: `#1e2227` — header, sidebar, rule container cards.
- **Layer 2 (Elevated)**: `#282c34` — input fields, select boxes, buttons, dynamic list items.

### Focus Vocabulary
- **Keyboard Focus Ring**: `outline: 2px solid var(--accent); outline-offset: 2px;`: Used for accessible `:focus-visible` button and tab interactions.
- **Input Border Shift**: `border-color: var(--accent)` with smooth 150ms transition on inputs and active select menus.

### Named Rules
**The Tonal Layering Rule.** Depth is communicated through contrast between surface tiers rather than heavy drop shadows, preserving crisp terminal boundaries.

## Shapes

- **Radius Scale**:
  - `sm` (2px): Badges, inline pills, and small status tags.
  - `md` (4px): Buttons, inputs, rule cards, and elevated container boxes.
- **Borders**: 1px solid structural lines (`#353b45`) enclosing all interactive controls and card boundaries.
- **Pill Indicators**: 3px rounded radius for scope labels and language switcher containers.

## Components

### Buttons
- **Shape**: 4px radius (`var(--radius)`), 30px min-height (desktop), 26px min-height for small buttons.
- **Primary**: Background `#d19a66`, text `#141619`, font weight 600.
- **Secondary / Ghost**: Background `#282c34`, border 1px solid `#353b45`, text `#eceff4`.
- **Danger**: Border `#e06c75`, text `#e06c75`; hover background `#e06c75`, hover text `#141619`.
- **Hover / Focus**: 150ms border-color and background transition; 2px outline offset on `:focus-visible`.

### Navigation Tabs
- **Desktop**: Full-width button with 2px transparent left border, turning `#d19a66` when active with elevated background `#282c34`.
- **Mobile**: Bottom tab bar items with 2px top border active indicator.

### Input Fields & Selects
- **Style**: Background `#282c34`, 1px border `#353b45`, text `#eceff4`, 4px radius. Custom SVG chevron for select menus.
- **Focus**: Border color shifts to `#d19a66` without layout shifting.

### Rule & Card Boxes
- **Structure**: Background `#1e2227`, 1px border `#353b45`, 4px radius.
- **Semantic Accent Borders**: 3px left border colored by policy type (Red for Deny, Yellow for Ask, Green for Allow).

### Diagnostic Banner
- **Style**: Background `#1e2227`, 1px solid `#e5c07b` (warning border), 4px radius.
- **Badge Indicators**: High-contrast badges (`ERROR` in red, `WARNING` in yellow, `INFO` in blue).

## Do's and Don'ts

### Do:
- **Do** use monospace typography (`var(--font-mono)`) for all configuration keys, paths, and values.
- **Do** maintain the 3-tier surface hierarchy (`#141619` -> `#1e2227` -> `#282c34`) when adding new containers.
- **Do** keep form controls compact (30px standard button/input height) for efficient technical workflow density.
- **Do** provide instant feedback on hover and focus states using the 150ms transition curve.
- **Do** use semantic colors (`#98c379`, `#e06c75`, `#e5c07b`, `#61afef`, `#c678dd`) consistently according to their defined role.

### Don't:
- **Don't** use decorative drop shadows, gradients, or rounded corners larger than 4px.
- **Don't** override the monospace font on code identifiers or JSON syntax elements.
- **Don't** hide setting paths or obscure canonical `settings.json` keys behind vague marketing labels.
- **Don't** introduce light-mode styles that break contrast with the terminal color tokens.
