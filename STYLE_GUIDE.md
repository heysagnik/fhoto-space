# FotoSpace — UI Style Guide

A single source of truth for every visual and structural decision in this app.
All contributors (human and AI) must follow this guide before writing any component.

> **Source of truth for HeroUI APIs:** `llms-full.txt` at the project root.
> Always verify component APIs against it before coding.

---

## 1. Design Principles

| Principle | What it means in practice |
|-----------|--------------------------|
| **Calm** | No loud gradients, no heavy shadows. Light surfaces, subtle depth. |
| **Consistent** | Same spacing, radius, and color tokens everywhere — no one-off values. |
| **HeroUI-first** | Use HeroUI compound components as documented in `llms-full.txt`. Never reinvent what HeroUI provides. |
| **Token-driven** | Colors and radii come from CSS variables only. Never hardcode `#hex` or `gray-*`. |
| **Minimal Tailwind** | Tailwind for layout and spacing only. Never for color overrides that bypass the token layer. |

---

## 2. Color Tokens

All colors come from HeroUI's semantic CSS variables. Use these Tailwind class names (mapped by HeroUI):

| Token class | Use for |
|-------------|---------|
| `text-foreground` | Primary body text, headings |
| `text-muted` | Secondary / helper text, placeholders |
| `text-primary` | Brand accent — links, active states, "open" hints |
| `text-danger` | Errors, destructive labels |
| `bg-surface` | Card and modal backgrounds (white in light mode) |
| `bg-default` | Subtle fills — icon wells, empty state areas, tab bar |
| `border-border` | All dividers and card borders |
| `text-primary-foreground` | Text on primary-colored backgrounds |

**Never use:** `text-gray-*`, `bg-gray-*`, `text-white`, `#hex` values, or raw `oklch(...)` in components.
Those belong only in `globals.css` token definitions.

---

## 3. Spacing Scale

Use Tailwind's 4 px base scale. Deviating requires a comment explaining why.

| Context | Value |
|---------|-------|
| Page horizontal padding | `px-6` (24 px) |
| Page vertical padding | `py-8` (32 px) |
| Gap between major page sections | `gap-8` (32 px) |
| Card internal padding | `p-5` (20 px) |
| Card content item gap | `gap-4` (16 px) |
| Inline / icon gap | `gap-2` or `gap-3` |
| Form field gap | `gap-4` |
| Header bar height | `h-[3.25rem]` (52 px) |

---

## 4. Typography Scale

| Role | Classes |
|------|---------|
| Page title | `text-2xl font-bold text-foreground` |
| Section heading | `text-lg font-semibold text-foreground` |
| Card title | `text-sm font-semibold text-foreground` |
| Body / label text | `text-sm text-foreground` |
| Helper / secondary text | `text-sm text-muted` |
| Micro / metadata | `text-xs text-muted` |
| Error message | `text-xs text-danger` |
| Nav label / eyebrow | `text-xs font-semibold text-muted uppercase tracking-wider` |
| Tabular numbers (dates, counts) | add `tabular-nums` |

All `h1–h6` elements get `letter-spacing: -0.02em` and `text-wrap: balance` via `globals.css` — do not re-declare these inline.

---

## 5. Border Radius

Controlled by a single CSS variable: `--radius: 0.375rem` (set in `globals.css`).
HeroUI components automatically scale from this variable. Use consistent multipliers:

| Context | Class |
|---------|-------|
| HeroUI components (auto) | Framework-controlled via `var(--radius)` |
| Auth card / large panels | `rounded-[calc(var(--radius)*2.5)]` |
| SpaceCard / content cards | `rounded-[calc(var(--radius)*2)]` |
| Icon wells, small fills | `rounded-[calc(var(--radius)*1.5)]` |
| FAB / pill buttons | `rounded-full` |
| Empty state border | `rounded-[calc(var(--radius)*2)]` |

**Never use:** `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-lg` as fixed overrides in components.

---

## 6. Elevation & Shadow

Two shadow levels — defined as CSS variables in `globals.css`:

| Variable | Used on |
|----------|---------|
| `var(--card-shadow)` | Card default / rest state |
| `var(--card-shadow-hover)` | Card on hover |

Apply via the `.card-interactive` utility class (defined in `globals.css`):
```html
<Card className="card-interactive" ...>
```

This also adds `translateY(-1px)` on hover and collapses back on active — no extra JS needed.

**Never use** `shadow-md`, `shadow-lg`, or inline `box-shadow` values in component files.  
Exception: the FAB button may use `shadow-lg` as it is not a content card.

---

## 7. Layout Patterns

### Authenticated page shell
```
<div className="page-shell">          ← full-height flex col, var(--page-bg)
  <header className="app-header">    ← sticky 52 px, bg-surface, border-b
  <div className="page-content">     ← centred, max-w-[72rem], px-6 py-8
```

All three classes are defined in `globals.css`. Never duplicate this structure inline.

### Page header block (inside `.page-content`)
```tsx
<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
  <div>
    <h1 className="text-2xl font-bold text-foreground">Title</h1>
    <p className="text-sm text-muted mt-1">Subtitle</p>
  </div>
  <Button size="sm">Primary action</Button>
</div>
```

### Content grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
```

### Space sub-page layout (nav + content)
```tsx
<div className="flex gap-8">
  <SpaceNav ... />          // w-44 sidebar
  <main className="flex-1 flex flex-col gap-6"> ... </main>
</div>
```

---

## 8. HeroUI Component Conventions

Reference `llms-full.txt` for full API. Key rules:

### Button
```tsx
// Variants available: (default/"primary"), "secondary", "tertiary", "outline", "ghost", "danger", "danger-soft"
<Button>Primary CTA</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="danger">Delete</Button>
// FAB
<Button isIconOnly variant="primary" size="lg" className="rounded-full shadow-lg" ...>
```
- Size: `size="sm"` in headers and inline contexts; default size in forms and modals.
- Use `isDisabled` (not CSS `opacity`) for disabled state.

### Card
```tsx
<Card>                          // default variant = bg-surface
  <Card.Header>
    <Card.Title />
    <Card.Description />
  </Card.Header>
  <Card.Content />
  <Card.Footer />
</Card>
```
- Variants: `"default"` (bg-surface), `"secondary"`, `"tertiary"`, `"transparent"`.
- Danger zone: `className="border-danger/40 bg-danger/5"` — no `variant="danger"` (doesn't exist).
- Interactive cards: add `className="card-interactive"`.

### TextField / Input
```tsx
<TextField value={v} onChange={setV} isInvalid={!!error} fullWidth>
  <Label>Field name</Label>
  <Input placeholder="..." />
  {error && <FieldError>{error}</FieldError>}
</TextField>
```
- Always wrap `<Input>` in `<TextField>`.
- Always include `<Label>` as direct child of `<TextField>`.

### Chip
```tsx
<Chip color="success" size="sm" variant="soft">Active</Chip>
```
Status color map: `active→success`, `draft→warning`, `closed→default`, `deleted→danger`.

### Modal (with external `useOverlayState`)
```tsx
const state = useOverlayState()
// ...
<Modal state={state}>
  <Modal.Backdrop isDismissable>
    <Modal.Container placement="center" size="sm">
      <Modal.Dialog>
        <Modal.CloseTrigger />
        <Modal.Header>
          <Modal.Heading>Title</Modal.Heading>
        </Modal.Header>
        <Modal.Body> ... </Modal.Body>
        <Modal.Footer> ... </Modal.Footer>
      </Modal.Dialog>
    </Modal.Container>
  </Modal.Backdrop>
</Modal>
```
Padding: `px-6 pt-6 pb-2` header, `px-6 py-4` body, `px-6 pb-6 pt-2` footer.

### Tabs (sign-in / sign-up, navigation)
```tsx
<Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as Tab)}>
  <Tabs.ListContainer>
    <Tabs.List aria-label="...">
      <Tabs.Tab id="tab1">Label<Tabs.Indicator /></Tabs.Tab>
      <Tabs.Tab id="tab2">Label<Tabs.Indicator /></Tabs.Tab>
    </Tabs.List>
  </Tabs.ListContainer>
  <Tabs.Panel id="tab1"> ... </Tabs.Panel>
  <Tabs.Panel id="tab2"> ... </Tabs.Panel>
</Tabs>
```
> **SSR note:** Pages using `<Tabs>` must export `export const dynamic = "force-dynamic"` to avoid the `SharedElementTransition` crash during prerender.

### Dropdown + Avatar (user menu)
```tsx
<Dropdown>
  <Dropdown.Trigger>
    <Avatar size="sm" className="cursor-pointer bg-primary text-primary-foreground">
      <Avatar.Fallback>AB</Avatar.Fallback>
    </Avatar>
  </Dropdown.Trigger>
  <Dropdown.Popover>
    <Dropdown.Menu aria-label="User menu">
      <Dropdown.Item id="profile" textValue="Name">
        <div className="flex flex-col gap-0.5 py-0.5">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted">{email}</p>
        </div>
      </Dropdown.Item>
      <Dropdown.Item id="signout" onAction={handleSignOut} className="text-danger">
        Log out
      </Dropdown.Item>
    </Dropdown.Menu>
  </Dropdown.Popover>
</Dropdown>
```

### ListBox (sidebar nav)
```tsx
<ListBox aria-label="Navigation" selectedKeys={new Set([active])} selectionMode="single" onAction={...}>
  <ListBox.Item id="general">General</ListBox.Item>
  <ListBox.Item id="images">Images</ListBox.Item>
</ListBox>
```

---

## 9. Interactive States

Every clickable non-button element must have:
- **Hover**: visual change via `.card-interactive` or `transition-colors`
- **Active/pressed**: scale or shadow collapse — provided by `.card-interactive`
- **Focus-visible**: do **not** suppress HeroUI/React Aria focus rings
- **Disabled**: `isDisabled` prop on all HeroUI components

Transition timing: HeroUI defaults (~150 ms). Custom transitions use `duration-[160ms]`.
No animation on high-frequency interactions (typing, search input changes).

---

## 10. What to Avoid

| ❌ Don't | ✅ Do instead |
|----------|--------------|
| `style={{ color: "#6b7280" }}` | `className="text-muted"` |
| `className="bg-gray-50"` | `className="bg-default"` |
| `className="text-gray-900"` | `className="text-foreground"` |
| `className="rounded-xl"` | `className="rounded-[calc(var(--radius)*2)]"` |
| `className="shadow-md"` on cards | `className="card-interactive"` |
| Inline `style={{ display: "flex", ... }}` | Tailwind flex utilities |
| `<Tabs>` on a pre-rendered server page | Add `export const dynamic = "force-dynamic"` |
| Raw `<button>` for primary actions | HeroUI `<Button>` with correct `variant` |
| `variant="danger"` on `<Card>` | `className="border-danger/40 bg-danger/5"` |
| One-off Tailwind color classes (`text-blue-600`) | HeroUI semantic token classes |
