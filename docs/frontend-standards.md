# Frontend standards

This is the canonical frontend standard for Jobmark. It replaces the older split
guidance in `UI_GOVERNANCE.md`, `docs/standards.md`, and the render-phase advice that
was previously in `CLAUDE.md`.

## Rendering and state

- Render server-fetched content on the first paint. Do not add artificial hydration
  gates, delayed chart mounts, or loading placeholders after data is already available.
- Keep public landing content server-rendered where possible. Mount only the interactive
  control that needs client state.
- Do not update React state during render. Do not mirror props into state unless the
  component owns a real editable draft. Prefer derived values, keyed remounts, or a
  reducer with an explicit event. Effects are for external subscriptions, timers,
  browser APIs, and other post-commit synchronization; every timer/subscription must
  be cleaned up.
- Avoid full document reloads for actions that can update local or router state.
- Authenticated pages use `DashboardShell`. Focus is the intentional immersive
  exception because the breathing experience needs a distraction-free surface.
- App-only tools, including the command palette, belong inside the authenticated shell,
  not in the public root layout.

## Motion and scrolling

- Use one motion owner per interaction. The landing page uses simple CSS transitions
  and a small number of purposeful client interactions; it does not use smooth-scroll
  hijacking, magnetic pointer tracking, per-letter blur, or scroll observers for
  decorative dividers.
- Above-the-fold content is visible immediately. Motion may communicate a state change,
  but it must not hide content before hydration.
- Animate only the properties needed, usually `opacity`, `transform`, color, or shadow.
  Never use `transition-all` as a default and never add active scale to every control.
- Respect `prefers-reduced-motion`; reduced motion should not wait for an animation to
  reveal content.
- Landing demos are lightweight marketing representations. Render only the active demo;
  do not mount production dashboards, charts, or full application state inside every
  marketing scene.

## Components and tokens

- Use `DashboardShell` for authenticated layout and shared UI primitives for controls.
- A `Card` owns its surface; `CardHeader`, `CardContent`, and `CardFooter` own their
  padding. Add an explicit interactive variant when a card is clickable.
- Use `lib/themes.ts` and semantic CSS variables (`--success`, `--warning`, `--info`,
  chart variables, and foreground counterparts) for status and data colors. Do not
  encode meaning with a hard-coded Tailwind color or café hex value in a feature.
- Keep spacing, radii, and focus states consistent with the existing primitives. Avoid
  dynamic Tailwind class construction; use static class mappings or CSS variables.
- Split client components around state responsibilities: forms, dialogs, lists,
  editors, and read-only views should not become one page-sized component.

## Accessibility

- Every interactive element has a keyboard path, a visible focus state, and an
  accessible name. Hover-only actions must also appear on `focus-within`.
- Use real buttons and links for actions. Tabs must expose correct `role`, selection,
  roving focus, and arrow/Home/End behavior. Data visualizations need text labels and
  keyboard-accessible details where cells or points represent user data.
- Preserve readable contrast through semantic tokens, including destructive text on
  dark surfaces.

## Quality gates

Before merging frontend work, run:

```text
npm run verify
npm test
npm run build
```

`npm run verify` includes ESLint, TypeScript, formatting, and the frontend invariant
check. A route-level change also needs a desktop/mobile browser pass with no page
errors, no horizontal overflow, and no visible first-paint flash.

Historical audit and security documents may remain under `docs/` as evidence, but they
are not current implementation guidance unless explicitly marked otherwise.
