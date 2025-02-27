// https://github.com/yahoo/serialize-javascript
const UNSAFE_CHARS_REGEXP = /[<>\u2028\u2029]/g;
const ESCAPED_CHARS = {
  '<': '\\u003C',
  '>': '\\u003E',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

const escapeUnsafeChars = (unsafeChar: string) =>
  ESCAPED_CHARS[unsafeChar as keyof typeof ESCAPED_CHARS];

export const serializeState = (state: unknown): string => {
  try {
    // -- Example:
    // Input object: { hello: 'w\'or"ld  -  <script>' }
    // Output string: '{"hello":"w\'or\\"ld  -  \u003Cscript\u003E"}'

    const stateStr = JSON.stringify(state || {})
      // 1. Duplicate the escape char (\) for already escaped characters (e.g. \n or \").
      .replace(/\\/g, String.raw`\\`)
      // 2. Escape existing single quotes to allow wrapping the whole thing in '...'.
      // Because we are doing the JSON.stringify ourselves (i.e., we're not taking a JSON string as a parameter, in
      // which case we wouldn't know if there is redundant escaping), it's safe to use a regular expression for this.
      .replace(/'/g, String.raw`\'`)
      // 3. Escape unsafe chars.
      .replace(UNSAFE_CHARS_REGEXP, escapeUnsafeChars);

    // Wrap the serialized JSON in quotes so that it's parsed
    // by the browser as a string for better performance.
    return `'${stateStr}'`;
  } catch (error) {
    console.error('[SSR] On state serialization -', error, state);
    return '{}';
  }
};
