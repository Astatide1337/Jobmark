# Jobmark UI Governance Rules

To maintain the premium "Late Night Café" aesthetic and ensure architectural stability, follow these rules for all future UI work.

## 1. Unified Layout Patterns
- **App Shell:** Always wrap authenticated pages in `DashboardShell`.
- **Content Width:** Use the standardized padding provided by the shell. Avoid adding page-level margin/padding unless it's for spacing internal sections.
- **Scroll Ownership:** The main content area of `DashboardShell` is the ONLY scrollable region for app pages. Never use `h-screen overflow-hidden` on children.

## 2. Shared Primitive Usage
- **NO Inline Styling:** Avoid arbitrary Tailwind values (e.g., `rounded-[24px]`, `bg-[#hex]`). Use theme tokens.
- **Standard Radius:**
  - `rounded-xl`: Default for buttons, inputs, small cards.
  - `rounded-2xl`: Default for large dashboard cards, modals, and landing sections.
- **Dropdowns:** Always use the `DropdownMenu` component without overriding its `DropdownMenuContent` padding or radius.

## 3. Interaction Language
- **Hover Transitions:** Use `transition-all duration-200` or `duration-300`.
- **Action Hover:** Use `hover:text-primary` for primary targets and `hover:bg-muted/40` for neutral regions.
- **Tactile Feedback:** Apply `active:scale-[0.98]` to all clickable elements.
- **Dictation:** Always use the shared `DictateButton` component.

## 4. Accessibility & Contrast
- **Keyboard Parity:** Every `hover:` state must have a corresponding `focus-visible:` state.
- **Contrast Tokens:** Use `text-destructive-text` for red text on dark backgrounds to ensure WCAG AA compliance.
- **Reduced Motion:** Respect `prefers-reduced-motion` in all animations.

## 5. Component Logic
- **DRY:** If a UI pattern (like a dictation button or a settings save bar) repeats more than twice, extract it to a shared component in `components/ui` or a feature-level folder.
- **Feature Flags:** Large UI changes must be gated behind the `uiV2` flag in `UIProvider`.
