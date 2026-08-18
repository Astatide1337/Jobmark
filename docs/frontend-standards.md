# Frontend standards

This is the canonical frontend standard for Jobmark. It replaces older split guidance in
`UI_GOVERNANCE.md`, `docs/standards.md`, and historical render-phase advice.

The goal is one visual language, one interaction language, and one component language across the
public site and authenticated product. Prefer the existing system over adding a parallel one.

## Rendering and state

- Render server-fetched content on the first paint. Do not add artificial hydration gates, delayed
  chart mounts, or loading placeholders after data is already available.
- Keep public landing content server-rendered where possible. Client components are appropriate
  when they own a real interaction, animation, or browser API.
- Do not update React state during render. Do not mirror props into state unless the component owns
  a real editable draft. Prefer derived values, keyed remounts, or a reducer with an explicit event.
- Effects are for external subscriptions, timers, browser APIs, and other post-commit
  synchronization. Every timer and subscription must be cleaned up.
- Avoid full document reloads for actions that can update local or router state.
- Authenticated pages use `DashboardShell`. Focus is the intentional immersive exception because
  the breathing experience needs a distraction-free surface.
- App-only tools, including the command palette, belong inside the authenticated shell, not in the
  public root layout.

## Design system and shared components

- Use semantic theme variables from `app/globals.css` and `lib/themes.ts`. Do not encode product
  meaning with a hard-coded Tailwind hue or café hex value inside a feature.
- Use the shared primitives in `components/ui` for buttons, cards, inputs, dialogs, menus, tabs,
  badges, tooltips, and other standard controls. Extend a primitive when the product concept is the
  same instead of rebuilding the control locally.
- `Button` owns button sizing, focus, disabled behavior, and standard interaction motion. New
  product controls should not recreate primary, outline, ghost, or destructive buttons with
  one-off class strings when the shared primitive fits the interaction.
- A `Card` owns its surface. `CardHeader`, `CardContent`, and `CardFooter` own their padding. Add an
  explicit interactive treatment when a card is clickable instead of making every card hover.
- Keep spacing, radii, icon sizing, and focus states consistent with existing primitives. Avoid
  dynamic Tailwind class construction; use static class mappings or CSS variables.
- Split client components around real state responsibilities. Forms, dialogs, lists, editors, and
  read-only views should not become one page-sized component.
- Do not introduce another UI framework or styling system to solve a local consistency problem.

## Motion and scrolling

Motion is part of Jobmark's product and brand language. Preserve purposeful choreography rather
than flattening the interface into generic transitions.

- Above-the-fold copy and controls must be visible immediately. Motion can add depth after first
  paint, but hydration must never be required to reveal important content.
- Framer Motion is approved for purposeful transforms, opacity changes, scroll-linked depth,
  tab/panel transitions, shared-layout effects, and a small number of premium interactions. CSS
  transitions remain appropriate for simple hover/focus states.
- Reuse a small motion language for equivalent interactions. Similar reveals, panel changes, and
  hover feedback should feel related even when their exact implementation differs.
- Magnetic motion is reserved for a small number of high-value CTAs.
- Respect `prefers-reduced-motion`. Reduced-motion users get the same information and controls
  without waiting for animation.
- Animate targeted properties, usually opacity, transform, color, or shadow. Never use
  `transition-all` as a default and never add active scale to every control.
- Use native page scrolling. Do not add a smooth-scroll runtime or scroll hijacking.
- Scroll-led product storytelling is acceptable when it stays understandable, keeps expensive
  scenes bounded, and does not require animation to expose the core information.

## Landing page and product proof

The landing page should market the product Jobmark actually ships while preserving the established
Jobmark visual identity and editorial character.

- Treat the existing landing page as a product surface, not as a disposable template. Large changes
  to its narrative, section order, or visual composition require a concrete improvement rather than
  change for its own sake.
- Purpose-built marketing previews may simplify the authenticated product, but they should mirror
  real capabilities and interaction patterns closely enough that the signed-in product feels like
  the same application.
- Do not import live user queries or authenticated application state merely to power a public demo.
- Representative data is acceptable for product previews. Do not present sample numbers as real
  customer, usage, or product-wide metrics; label them when the distinction could be unclear.
- Never fabricate customer counts, testimonials, logos, performance improvements, integrations, or
  product support claims.
- When marketing and implementation disagree, correct the marketing unless the product task
  explicitly includes implementing the missing capability.
- Prefer a coherent product story over adding more sections. New landing content must earn its place
  by explaining something the current page does not explain well.

## Product language

`docs/product-language.md` is the source of truth for user-facing terminology.

- Use `note`, `project`, `review draft`, `update`, `conversation`, `focus session`, and
  `AI assistant` consistently.
- Backend names, routes, database fields, and MCP tool names may keep technical terms such as
  activity and report when changing them would alter contracts.
- Buttons describe the action they perform. Prefer canonical actions such as `Add note`,
  `Save note`, `Create project`, `Build review draft`, `Connect an assistant`, and
  `Export record`.
- Keep marketing concrete. Say what the user can do before naming the technology behind it.

## Accessibility

- Every interactive element has a keyboard path, a visible focus state, and an accessible name.
  Hover-only actions must also appear on `focus-within`.
- Use real buttons and links for actions. Tabs must expose correct role, selection, focus, and
  keyboard behavior.
- Data visualizations need text labels and keyboard-accessible details where cells or points
  represent user data.
- Preserve readable contrast through semantic tokens, including destructive text on dark surfaces.
- Animation must not make keyboard focus disappear or move an actively focused control off-screen.

## Responsive behavior

- Treat mobile as a deliberate layout, not the desktop composition stacked into one column.
- Marketing previews must remain legible at mobile widths without forcing horizontal page overflow.
- Check navigation, forms, dialogs, product previews, cards, tables/lists, long copy, and overflow at
  representative mobile and desktop widths.
- Touch targets and primary actions remain easy to reach without relying on hover.

## Quality gates

Before merging frontend work, run:

```text
npm run verify
npm test
npm run build
```

`npm run verify` includes ESLint, TypeScript, formatting, and the frontend invariant check. A
route-level change also needs a desktop/mobile browser pass with no page errors, horizontal
overflow, visible first-paint flash, or broken interactions. Motion should be checked once at normal
settings and once with reduced motion where the changed surface uses animation.

Historical audit and security documents may remain under `docs/` as evidence, but they are not
current implementation guidance unless explicitly marked otherwise.
