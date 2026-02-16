# Code Standards

## File Organization

### Colocation Rule
- Components used in **ONE page** → colocate in the page's folder (using `_components` naming for non-route)
- Components used in **MULTIPLE pages** → move to `/components/features/`
- Shared UI components → `/components/ui/`

### Naming Conventions
- Components: PascalCase (e.g., `DashboardPage.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useChat.ts`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Types/Interfaces: PascalCase (e.g., `UserProfile.ts`)

### API Routes
- Group related endpoints in the same folder
- Use POST with `action` type for related operations (e.g., `/api/chat` handles stream, cancel, history)

---

## File Size Limits

- **Warn** at 1000 lines (ESLint rule: `max-lines`)
- **Warn** at 150 lines per function (ESLint rule: `max-lines-per-function`)
- Split components that exceed these limits

---

## TypeScript

- Strict null checks: **enabled**
- No implicit any: **enabled**
- Explicit return types on exported functions recommended
- Use `type` for object shapes, `interface` for extensible contracts

---

## Tailwind CSS

### Best Practices
1. Use `cn()` utility for conditional classes
   ```typescript
   className={cn(
     "flex items-center gap-2",
     isActive && "bg-blue-500"
   )}
   ```

2. Sort classes with Prettier plugin (auto-formats on save)

3. Extract repeated patterns to components, not globals.css

4. Avoid arbitrary values (warned by ESLint)

### Design Tokens (lib/theme.ts)
All theme values (colors, animations, layout) should be defined in `lib/theme.ts` and imported, not hardcoded.

---

## Server Actions

### Pattern
Use unified result pattern for consistent error handling:

```typescript
type ActionResponse<T> = { data: T | null; error: string | null };

async function myAction(input: Input): Promise<ActionResponse<Output>> {
  try {
    const result = await db.operation(input);
    return { data: result, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
```

### Organization
Group related actions by domain:
- Journal: activities, projects, goals, manifest
- Network: contacts, interactions
- System: settings, reports, insights

---

## Console Logging

- `console.log` → Use sparingly, only for development debugging
- `console.error` → Keep for legitimate error logging
- `console.warn` → Keep for warnings
- ESLint will warn on `console.log` statements

---

## Testing

- Test critical paths: authentication, data persistence, AI features
- Use Vitest + React Testing Library
- Place tests next to components (`ComponentName.test.tsx`)

---

## Linting & Formatting

- Run `npm run lint` before committing
- Run `npm run format` to auto-format code
- ESLint rules configured in `eslint.config.mjs`
- Prettier config in `.prettierrc`

---

## Imports

### Order (enforced by ESLint)
1. Built-in (Node.js: fs, path)
2. External (npm: react, next)
3. Internal (@/* aliases)
4. Parent (../)
5. Sibling (./)
6. Index (./index)

### Use Aliases
Prefer `@/components/ui/button` over `../../../components/ui/button`
