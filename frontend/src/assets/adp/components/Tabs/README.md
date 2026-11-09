# Tabs

A row of tabs with a hairline below; the active tab carries the primary rule.

- Tabs switch views of one thing; they never navigate away from the page.
- The active tab is marked by the primary rule and foreground text, the others by mutedForeground.
- Keep to five tabs or fewer; past that, use a select.

## Classes

- `adp-standard-tabs`
- `adp-standard-tab`

The classes are plain CSS from `components/bundle.css`; behaviour (focus management, keyboard handling) comes from the consuming framework's accessible primitives.
