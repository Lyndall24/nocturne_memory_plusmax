# Maintenance Dashboard Design

**Date:** 2026-04-11

**Scope:** Redesign the human-facing dashboard for Nocturne Memory so it behaves like a maintenance-oriented memory browser rather than a generic operations console. The page should support fast browsing, structural judgment, anomaly discovery, and low-friction intervention.

## Goal

Make the default dashboard useful for memory maintenance work.

The operator should be able to:
- browse the memory system as a structured archive
- quickly judge whether memory organization is clean or drifting
- spot which areas need human intervention
- inspect file-level details without unnecessary page switching
- trigger low-risk maintenance actions with minimal friction

## Product Context

The dashboard is not the center of the full Nocturne product model. It is specifically the primary UI surface for the `memory maintenance` capability:

- `memory persistence` remains the storage substrate
- `memory loading` remains a separate runtime concern
- `memory maintenance` is the dashboard’s primary concern
- `memory expectation` may influence rules, but is not the dashboard’s central frame

This means the dashboard should not lead with generic health cards, abstract system metrics, or action-first forms. It should lead with memory structure browsing and maintenance interpretation.

## Design Position

The target feel is closer to `Claude / Notion` than a conventional dark admin panel:

- warm, quiet, editorial surfaces
- strong readability
- low visual pressure during long sessions
- information clarity over dashboard theatrics

However, the page is still a working tool. It must preserve scan speed, density where useful, and direct access to detailed maintenance work.

## Recommended Approach

Use a `dual-mode file manager` layout:

- main experience: file-manager-style memory browsing
- maintenance layer: always-visible but secondary signals, summaries, filters, and lightweight actions

This is preferable to:
- an action-heavy dashboard homepage, which over-prioritizes forms and quick commands
- a map-first anomaly dashboard, which is too abstract for detailed maintenance browsing
- a card-wall admin console, which hides structural logic and slows human judgment

## Information Architecture

The first screen should use a three-column browser with a bottom maintenance strip.

### Left Column: Structure Tree

Purpose: show the operator where they are in the memory system.

Contents:
- domain roots
- cluster/grouping levels
- expandable path hierarchy
- lightweight anomaly badges on tree nodes

Behavior:
- tree view should support collapsing non-problem areas
- anomaly-heavy branches should be visible before full drill-down
- selected branch should drive the middle list and right preview

### Middle Column: Content List

Purpose: act as the primary browsing workspace.

Contents per row:
- memory name or path segment
- short explanatory subtitle or anomaly hint
- recent change signal
- anomaly flags
- maintenance priority/status

Behavior:
- list should support sorting by structure, anomaly severity, and recency
- multi-select should be available for grouped maintenance review
- rows should remain list-like and readable, not convert into decorative cards

### Right Column: Detail Preview

Purpose: let the operator understand a selected item without a full context switch.

Contents:
- full URI
- short reason for flagging
- likely related or target location if relevant
- content preview
- recent changes / relationship cues
- low-friction next actions

Behavior:
- preview should answer “what is this and why might it matter?”
- preview is for understanding first, action second
- full deep-work pages remain available when detailed workflows are required

### Bottom Maintenance Strip

Purpose: keep maintenance judgment continuously available without taking over the page.

Contents:
- maintenance summary for the current region or selection
- anomaly filters
- lightweight actions

Behavior:
- strip should remain visually subordinate to browsing
- filters should immediately reshape tree/list emphasis
- actions here should stay low-risk and low-friction

## Maintenance Signals

The dashboard should surface maintenance state directly inside the browser, not in a separate dashboard layer.

Recommended signals:
- duplicate candidates
- structure mismatch
- orphan / weak attachment
- growth anomaly
- review pressure

Signal design rules:
- badges must stay compact and legible
- severity should use warm restrained tones, not harsh alert colors
- maintenance signals should appear both in the tree and the list
- the same anomaly taxonomy should be used across the page

## Visual Direction

### Atmosphere

- warm ivory or soft parchment base
- low-contrast panels with clear hierarchy
- rounded surfaces, but not overly playful
- editorial spacing with deliberate calm

### Typography

- readable, calm display heading for page title
- practical UI font for lists, filters, and metadata
- list content should optimize for fast scanning over visual flair

### Contrast and Density

- use contrast to clarify focus, not to create drama
- middle list should be denser than the surrounding surfaces
- right preview can breathe more than the list
- bottom strip should feel attached and supportive, not like a second page

### Non-Goals

Avoid:
- dark cyber-control-room styling
- KPI-card-first admin layouts
- abstract graph/network visuals as the primary screen
- oversized quick action forms dominating the viewport

## Data and Interaction Model

The dashboard should center on maintenance-relevant browsing state:

- selected tree node
- current list sort
- active anomaly filters
- selected file or memory item
- optional multi-selection set

Derived information should include:
- maintenance summary for the current region
- explanation of why an item entered the human-judgment path
- likely neighboring or target locations when structure mismatch is suspected

## Human Queue

“Human queue” is not a generic todo list. It should contain items that are:
- high-value to resolve
- ambiguous enough that automatic handling would be unsafe
- already prioritized by maintenance rules or heuristics

Each human-queue item should include:
- human-readable problem summary
- anomaly type
- affected region
- why the system did not auto-resolve it
- suggested next view or action
- priority level such as `Now`, `Soon`, or `Watch`

The queue should remain a secondary surface. It supports browsing, but does not replace the main file-manager view.

## Error Handling

- if maintenance signals fail to load, the browser should still render the underlying structure and file list
- if preview data fails, selection state should remain stable and fall back to a minimal view
- if anomaly filters fail, the operator should still be able to browse normally
- empty states should explain whether the system is clean, unscanned, or temporarily unavailable

## Testing Strategy

Frontend coverage for this redesign should focus on:
- rendering the three-column browser layout
- tree selection updating the list and preview
- anomaly filters affecting visible results
- maintenance strip staying available without replacing primary browsing
- degraded rendering when maintenance data is partially unavailable

If backend additions are needed, they should focus on:
- tree/list/preview data needed by the maintenance browser
- anomaly summary and human-queue explanations
- avoiding broad unrelated API churn

## Success Criteria

The redesign is successful if:
- the dashboard feels like a memory browser first, not a generic admin console
- the operator can judge structural cleanliness quickly
- maintenance signals are visible without overwhelming the browsing workflow
- file-level details are easy to inspect without repeated full-page transitions
- low-risk maintenance actions feel attached to the current context rather than detached in separate forms
