/**
 * Input transform for a route or query-string parameter.
 *
 * withComponentInputBinding binds `undefined` when a parameter is absent from the
 * URL, and that overrides the input's declared default - which is how the literal
 * string "undefined" ends up rendered in a text box. Applying the fallback as a
 * transform fixes it on the way in, so every component reads a real string.
 */
export function routeParam(fallback: string) {
  return (value: string | undefined | null): string =>
    value === undefined || value === null || value === '' ? fallback : value;
}
