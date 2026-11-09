/**
 * Generates src/styles/tokens.css from the design system's tokens.json.
 *
 * Why this exists: the ADP Standard zip ships components/bundle.css but NOT a
 * tokens.css, and bundle.css is written entirely against CSS variables
 * (--background, --space-4, --radius-md, --shadow-focus, --control-md,
 * --font-sans ...). Without those variables defined, every component renders
 * unstyled.
 *
 * It is generated rather than hand-written so that no colour, size or radius is
 * ever transcribed by hand: tokens.json stays the single source of truth, and
 * `npm run tokens` reproduces the stylesheet. The design system folder itself is
 * only ever read, never modified.
 *
 * Run: npm run tokens  (also runs automatically before start/build)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(here, '../src/assets/adp/tokens.json');
const TARGET = resolve(here, '../src/styles/tokens.css');

const tokens = JSON.parse(readFileSync(SOURCE, 'utf8'));

const indent = (lines) => lines.map((line) => `  ${line}`).join('\n');

/** Colour tokens, per theme. */
const colorsFor = (theme) =>
  tokens.color.tokens.map((t) => `--${t.name}: ${t.value[theme]};`);

/** Flat scales: spacing, radius, shadow, control. */
const scale = (group) => tokens[group].tokens.map((t) => `--${t.name}: ${t.value};`);

/** The font families declared in tokens.json, as --font-<key>. */
const fonts = Object.entries(tokens.type.families).map(
  ([key, value]) => `--font-${key}: ${value};`
);

/**
 * The type classes. bundle.css declares the --text-* font shorthands but defines
 * no classes to apply them, so they are emitted here. letter-spacing and
 * text-transform cannot ride in a `font` shorthand, so they are set alongside it
 * straight from the token definition.
 */
const typeClasses = tokens.type.groups
  .flatMap((group) => group.styles)
  .map((style) => {
    const declarations = [`font: var(--text-${style.name});`];

    if (style.letterSpacing) {
      declarations.push(`letter-spacing: ${style.letterSpacing};`);
    }

    // tokens.json documents the eyebrow as "Set in uppercase".
    if (/uppercase/i.test(style.usage ?? '')) {
      declarations.push('text-transform: uppercase;');
    }

    return `.${style.name} {\n${indent(declarations)}\n}`;
  })
  .join('\n');

const themeNames = tokens.color.themes.map((t) => t.id);
const [defaultTheme, ...otherThemes] = themeNames;

const darkBlocks = otherThemes
  .map(
    (theme) => `:root[data-theme='${theme}'] {
${indent(colorsFor(theme))}
}`
  )
  .join('\n\n');

const css = `/*
 * GENERATED FILE - do not edit by hand.
 * Source:    src/assets/adp/tokens.json (${tokens.name})
 * Generator: scripts/generate-tokens.mjs
 * Regenerate with: npm run tokens
 *
 * Load order matters: this file, then components/bundle.css, then styles.css.
 */

:root {
${indent(fonts)}

${indent(colorsFor(defaultTheme))}

${indent(scale('spacing'))}

${indent(scale('radius'))}

${indent(scale('shadow'))}

${indent(scale('control'))}
}

${darkBlocks}

/* Type styles. bundle.css declares the --text-* shorthands; these apply them. */
${typeClasses}
`;

mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, css, 'utf8');

const counts = [
  `${tokens.color.tokens.length} colours x ${themeNames.length} themes`,
  `${tokens.spacing.tokens.length} spacing`,
  `${tokens.radius.tokens.length} radius`,
  `${tokens.shadow.tokens.length} shadow`,
  `${tokens.control.tokens.length} control`,
  `${tokens.type.groups.flatMap((g) => g.styles).length} type classes`,
];

console.log(`tokens.css written from tokens.json: ${counts.join(', ')}.`);
