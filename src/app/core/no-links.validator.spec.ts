import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { noLinks } from './no-links.validator';

const blocked = (value: string) => noLinks(new FormControl(value)) !== null;

describe('noLinks', () => {
  it('blocks ordinary links', () => {
    for (const value of [
      'http://example.com',
      'https://example.com/roof',
      'HTTPS://EXAMPLE.COM',
      'see www.example.com for details',
      'ftp://files.example.com',
      'mailto:someone@example.net',
      'go to example.com now',
      'cheap deals at bit.ly/abcd',
      'visit my-roofing-site.co.uk',
    ]) {
      expect(blocked(value), `should have blocked: ${value}`).toBe(true);
    }
  });

  it('blocks the usual ways of writing a link past a filter', () => {
    for (const value of [
      'hxxp://example.com',
      'h**p://example.com',
      'example (dot) com',
      'example[dot]com',
      'example . com',
      '//example.com',
      '[click here](http://example.com)',
      '[url=http://example.com]click[/url]',
      '<a href="http://example.com">click</a>',
      // Percent-encoded scheme, which hides the colon-slash-slash.
      'http%3A%2F%2Fexample.com',
    ]) {
      expect(blocked(value), `should have blocked: ${value}`).toBe(true);
    }
  });

  /**
   * The half that matters more. A homeowner who cannot submit a real
   * description, and is not told why, simply leaves — so ordinary prose has to
   * survive, including the sloppy punctuation people actually type.
   */
  it('leaves ordinary answers alone', () => {
    for (const value of [
      '',
      '   ',
      'Jane Doe',
      "O'Brien-Smith",
      'José Álvarez',
      '1424 Main Street, Apt. 3',
      'St. Helena',
      'Vallejo',
      // Missing space after a full stop, which a generic domain rule would flag.
      'The shingles are cracked.The gutter leaks too.',
      'Roof is approx. 12 yrs old, i.e. past warranty.',
      'Cost was $4,500.00 last time',
      'Storm damage on 3.5 squares of the north slope',
      'Call me at 707-555-0123 after 5pm',
      'Leaking over the back bedroom after last week storm',
      'Need repair vs. replacement advice',
      'Section A.1 of the inspection report',
    ]) {
      expect(blocked(value), `should have allowed: ${value}`).toBe(false);
    }
  });

  it('ignores values that are not strings', () => {
    expect(noLinks(new FormControl(null))).toBeNull();
    expect(noLinks(new FormControl(42))).toBeNull();
  });

  it('reports the error under the key the form reads', () => {
    expect(noLinks(new FormControl('http://example.com'))).toEqual({ link: true });
  });
});
