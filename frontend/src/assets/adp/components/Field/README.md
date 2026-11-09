# Field

A label, a control and an optional hint, stacked at space-1.

- Every control has a visible label; placeholders are examples, not labels.
- The hint explains the format before the person types; an error replaces the hint and the border turns dangerForeground.
- Focus is the primary border and the focus shadow together, so it reads in both themes.

## Classes

- `adp-standard-field`
- `adp-standard-label`
- `adp-standard-input`
- `adp-standard-select`
- `adp-standard-textarea`
- `adp-standard-hint`

The classes are plain CSS from `components/bundle.css`; behaviour (focus management, keyboard handling) comes from the consuming framework's accessible primitives.
