# System Settings Layout Design

## Purpose

Reorganize the system settings page so administrators can find and edit a
single category without scrolling through one long, visually dense form. The
existing settings API, values, validation, and actions remain unchanged.

## Scope

The settings page will be organized into four categories:

1. 接龙设置: global publishing switch and daily takeover expiration days.
2. Steam: UAPI Key and Steam Web API Key.
3. KOOK: bot credentials, webhook URL, webhook utilities, connection status,
   and integration guidance.
4. AI: enablement, endpoint, model, API key, connection status, and historical
   summary refresh action.

## Layout

### Desktop

The page uses a two-column settings workspace instead of one large card. A
left-side category navigation lists the four groups. The right-side content
area displays only the selected group. The page header retains the existing
refresh action.

Each active group is an unframed settings panel with a concise title and
description. Related credential fields use a two-column grid when there is
sufficient width. Long values such as tokens and URLs remain full width.

The KOOK integration instructions are collapsed by default. Its webhook URL,
copy action, test action, and status are grouped near each other so the normal
workflow does not require scanning the page.

Save and reset controls appear together at the bottom of the active panel.
They operate on the same page-level form values as today, so changing tabs does
not discard unsaved edits.

### Mobile

At the existing narrow-screen breakpoint, the side navigation becomes a
horizontal tab bar. The active panel remains directly below it, and all fields
use a single-column layout. Action controls wrap without overflowing.

## Interaction and Data Behavior

- One settings form remains mounted for the whole page.
- Selecting a category changes visibility only; it does not refetch settings or
  reset edited form values.
- Existing save, reset, refresh, credential test, webhook copy, AI status, and
  historical-summary refresh behavior retains its current request and feedback
  semantics.
- No settings keys, API endpoints, validation rules, authorization behavior, or
  default values change.

## Visual Rules

- Remove the single narrow card that surrounds every setting.
- Do not replace it with nested or repeated cards.
- Use the established Ant Design controls, typography, spacing, borders, and
  responsive breakpoints already used by the administration interface.
- Use visual separators and grid spacing to distinguish field groups; keep the
  workspace dense enough for operational use without sacrificing scanability.

## Error Handling

All existing loading, validation, success, and error states remain connected to
their current controls. Switching between categories must not hide an error in
a way that prevents an administrator from returning to the field that needs
attention.

## Verification

- Existing settings behaviors remain functional after the layout change.
- On desktop, each category can be selected and only its fields are visible.
- Edited values persist while navigating between categories before saving.
- On mobile, category navigation is usable, form fields stack into one column,
  and action controls do not overlap or overflow.
- The project type-checks, linting passes, and the settings page is verified in
  a real browser at desktop and mobile viewport sizes.

## Out of Scope

- Changes to backend APIs, configuration schema, permissions, or saved values.
- New settings categories or changes to the content of existing integration
  instructions.
- Changes to settings outside the system settings page.
