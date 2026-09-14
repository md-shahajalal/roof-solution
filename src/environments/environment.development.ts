import type { Environment } from './environment.model';

/**
 * Development settings, used by `npm start`, `npm test`, `npm run watch` and
 * `npm run build:dev`. angular.json swaps this in for environment.ts.
 *
 * Test enquiries and test chats go to the developer from here, never to the
 * business.
 */
export const environment: Environment = {
  mode: 'development',
  production: false,

  phone: '(707) 641-6198',
  email: '6mehedihasan017015@gmail.com',
  formToken: '6mehedihasan017015@gmail.com',

  // "propertyId/widgetId", or the whole link from tawk.to > Administration >
  // Channels > Chat Widget, from the DEVELOPMENT tawk.to account. A property ID
  // on its own is not enough: the chat stays off and the browser console says so.
  tawk: 'https://embed.tawk.to/6aa28cd7a9c2983442421257/1k25fcbeu',
};
