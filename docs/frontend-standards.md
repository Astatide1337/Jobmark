# Frontend standards

This is the canonical frontend standard for Jobmark. It replaces the older split
guidance in `UI_GOVERNANCE.md`, `docs/standards.md`, and the render-phase advice that
was previously in `CLAUDE.md`.

## Rendering and state

- Render server-fetched content on the first paint. Do not add artificial hydration
  gates, delayed chart mounts, or loading placeholders after data is already available.
- Keep public landing content server-rendered where possible. Client components are
  appropriate when they own a real interaction, animation, or browser API.
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

Motion is part of Jobmark's product and brand language. Do not remove animation merely
to make a component simpler. Fix the source of jank or flicker while preserving the
intended interaction whenever possible.

- Above-the-fold content must be visible immediately. Motion can add depth, continuity,
  hierarchy, and feedback after first paint, but it must never require hydration before
  important copy or controls become visible.
- Framer Motion is an approved dependency for purposeful transforms, opacity changes,
  scroll-linked depth, tab/panel transitions, shared-layout effects, and premium
  micro-interactions. CSS transitions remain appropriate for simple hover/focus states.
- Preserve intentional landing-page choreography: hero depth, ambient movement,
  interactive product previews, section reveals, navigation motion, and focused CTA
  feedback are design features, not disposable decoration.
- Magnetic interactions are allowed on a small number of high-value controls. Use
  Motion values/springs rather than React state on every pointer move, and disable the
  effect for reduced-motion users.
- Respect `prefers-reduced-motion`. Reduced-motion users get the same information and
  controls without waiting for animation.
- Animate targeted properties, usually opacity, transform, color, or shadow. Never use
  `transition-all` as a default and never add active scale to every control.
- Do not use a smooth-scroll runtime to replace native page scrolling. Scroll-linked
  Motion values are fine; scroll hijacking is not.
- Avoid giant artificial scroll tracks that keep many hidden scenes mounted. Product
  storytelling may be scroll-aware or animated, but expensive scenes should be active
  only when they are needed.
- Landing demos should be purpose-built, interactive representations rather than a
  second copy of the authenticated application. Do not import production dashboards,
  charts, queries, or full application state merely to make a marketing mock feel real.
- Per-letter blur or filter-heavy text animation is discouraged above the fold because
  it can create blank/intermediate frames. Prefer complete-word or line transitions
  with reserved geometry.

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
- Animation must not make keyboard focus disappear or move an actively focused control
  off-screen. Navigation visibility logic must keep the navigation visible while focus
  is inside it.

## Quality gates

Before merging frontend work, run:

```text
npm run verify
npm test
npm run build
```

`npm run verify` includes ESLint, TypeScript, formatting, and the frontend invariant
check. A route-level change also needs a desktop/mobile browser pass with no page
errors, no horizontal overflow, no visible first-paint flash, and no accidental loss
of intentional motion at ordinary settings.

Historical audit and security documents may remain under `docs/` as evidence, but they
are not current implementation guidance unless explicitly marked otherwise.
