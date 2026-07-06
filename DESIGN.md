---
name: Steam Game Takeover Admin
description: Dark game-community operations console for managing takeovers, users, feedback, and platform settings.
---

<!-- SEED: re-run $impeccable document once there's code to capture the actual tokens and components. -->

# Design System: Steam Game Takeover Admin

## 1. Overview

**Creative North Star: "Night Operations Desk"**

This system should feel like a dark, focused operations room for a game community: dense enough for real admin work, visually sharp enough to avoid generic enterprise-admin blandness, and disciplined enough that operators can trust it during repeated moderation and management tasks.

The visual atmosphere is dark-mode first, with restrained color usage. Electric orange is the main accent for primary actions, current selection, and high-priority operational signals. Secondary status colors may appear for semantic meaning only, not decoration.

The reference direction is a dark project-board interface: strong left navigation, compact toolbars, layered work areas, and small color hits for active states. It must not inherit the mini program's pink-purple rabbit style, and it must not become a marketing-style SaaS page.

**Key Characteristics:**

- Dark, structured admin workspace.
- High-density tables, filters, detail panels, and status actions.
- Electric orange used sparingly for attention and action.
- Choreographed motion for major transitions, never decorative delay.
- Standard controls with a light game-console edge.

## 2. Colors

The palette is **Restrained**: dark neutrals carry most of the interface, while electric orange appears on no more than a small fraction of each screen.

### Primary

- **Electric Command Orange** ([to be resolved during implementation]): Use for primary buttons, selected navigation, focused controls, and high-priority calls to action.

### Secondary

- **Signal Violet / Blue** ([to be resolved during implementation]): Optional support color for links, focus traces, or secondary active states when orange would overstate priority.

### Tertiary

- **Status Set** ([to be resolved during implementation]): Use distinct semantic colors for success, warning, danger, info, blocked, whitelisted, pending, adopted, and ignored states.

### Neutral

- **Console Black** ([to be resolved during implementation]): App background.
- **Panel Charcoal** ([to be resolved during implementation]): Sidebar, table shells, filter bars, and detail panels.
- **Raised Graphite** ([to be resolved during implementation]): Hovered rows, selected panels, and secondary surfaces.
- **Operational Ink** ([to be resolved during implementation]): Primary text on dark surfaces.
- **Muted Steel** ([to be resolved during implementation]): Secondary text, metadata, timestamps, and helper copy.

### Named Rules

**The Orange Budget Rule.** Electric orange is for action and priority only. If more than 10% of a screen is orange, the interface is shouting.

**The No Pink-Purple Rule.** Do not use the mini program's pink-purple rabbit palette as the admin identity.

## 3. Typography

**Display Font:** [technical sans to be chosen at implementation]  
**Body Font:** [technical sans to be chosen at implementation]  
**Label/Mono Font:** [monospace font to be chosen at implementation]

**Character:** Use a single technical sans for the interface so tables, filters, forms, and navigation feel consistent. Use mono only for Steam IDs, openids, tokens, request IDs, timestamps, and other machine-readable values.

### Hierarchy

- **Display** (600, [size to be resolved], tight line-height): Rare. Use only for login or empty dashboard setup screens.
- **Headline** (600, [size to be resolved], compact line-height): Page titles and major detail headers.
- **Title** (600, [size to be resolved], compact line-height): Panel titles, table section headers, and modal titles.
- **Body** (400, [size to be resolved], readable line-height): Form labels, table cells, descriptions, and admin copy.
- **Label** (500, [size to be resolved], normal letter-spacing): Buttons, filters, tabs, status labels, and field labels.
- **Mono** (400 or 500, [size to be resolved], tabular when possible): IDs, codes, numeric counters, and API-facing values.

### Named Rules

**The Mono Only For Machines Rule.** Mono is for IDs and structured values, not normal labels or body copy.

## 4. Elevation

This system uses a layered dark workspace rather than heavy shadows. Depth should come from tonal separation, borders with low contrast, and subtle active/hover states. Choreographed motion may reveal hierarchy during page changes, drawer opening, and table-detail transitions, but surfaces must remain readable without animation.

### Shadow Vocabulary

- **Ambient Lift** ([to be resolved during implementation]): Use only for popovers, dropdowns, modals, and floating action areas.
- **Focus Glow** ([to be resolved during implementation]): Use only on keyboard focus or active command states.

### Named Rules

**The Layered Console Rule.** Panels are separated by tone first, shadow second. If every card casts a shadow, the hierarchy has failed.

**The Motion Has A Job Rule.** Choreographed motion is allowed for route transitions, panel reveal, and state changes. It is forbidden for decorative entrance effects that slow down admin work.

## 5. Components

No implemented components exist yet. Start with standard admin primitives: app shell, sidebar navigation, top toolbar, data table, filter bar, detail drawer, modal, form fields, status chips, primary/secondary/danger buttons, upload control, and empty/error states.

Each component must define default, hover, focus-visible, active, disabled, loading, and error states before it is considered reusable.

## 6. Do's and Don'ts

### Do:

- **Do** build a dark-mode first admin workspace with strong sidebar navigation and compact content density.
- **Do** use electric orange for primary action, selection, and urgent attention only.
- **Do** keep Steam ID, openid, KOOK channel ID, and token-like values in mono.
- **Do** make state explicit with both color and text labels.
- **Do** use choreographed motion only where it clarifies navigation, panel hierarchy, or state change.
- **Do** preserve WCAG AA contrast and keyboard accessibility across forms, menus, dialogs, and table actions.

### Don't:

- **Don't** inherit the mini program's pink-purple rabbit visual style as the main admin identity.
- **Don't** use marketing-page composition, oversized hero sections, or decorative card grids.
- **Don't** use glassmorphism, heavy gradients, or playful visuals that reduce operational clarity.
- **Don't** flood screens with orange, neon accents, or saturated inactive states.
- **Don't** replace standard admin affordances with novelty controls.
- **Don't** rely on color alone for blocked, whitelisted, pending, adopted, ignored, ended, or dangerous states.
