import type { Environment } from './environment.model';

/**
 * Live-site settings, used by `npm run build:prod`.
 *
 * Every build compiles this file unless angular.json swaps it: the `development`
 * configuration replaces it with environment.development.ts (see
 * `fileReplacements`). So the two files must describe the same keys — the
 * shared `Environment` type makes the build fail if they drift.
 *
 * Nothing here is secret. Every value ends up in JavaScript the visitor's browser
 * downloads, and the phone and email are printed on the page anyway. Never put a
 * password or API key in either file.
 *
 * If you change `phone` or `email`, update the schema.org block in
 * src/index.html to match: search engines read that, not this.
 */
export const environment: Environment = {
  mode: 'production',
  production: true,

  phone: '(707) 641-6198',
  email: 'roofingsolutionsrm@gmail.com',
  formToken: 'roofingsolutionsrm@gmail.com',

  // "propertyId/widgetId", or the whole link from tawk.to > Administration >
  // Channels > Chat Widget, from the BUSINESS tawk.to account.
  tawk: '',
};
