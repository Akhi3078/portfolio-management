# Button

One primary button per view; the rest are outline or ghost.

- The primary variant carries the one action the view exists for. Secondary actions are outline; dismissals and low-stakes actions are ghost.
- Danger is reserved for destructive actions and always sits apart from the primary.
- Buttons keep their words: an icon-only button needs an aria-label.
- Disabled lowers opacity; it never changes colour, so the role stays recognisable.

## Classes

- `adp-standard-btn`
- `adp-standard-btn-primary`
- `adp-standard-btn-secondary`
- `adp-standard-btn-outline`
- `adp-standard-btn-ghost`
- `adp-standard-btn-danger`

The classes are plain CSS from `components/bundle.css`; behaviour (focus management, keyboard handling) comes from the consuming framework's accessible primitives.
