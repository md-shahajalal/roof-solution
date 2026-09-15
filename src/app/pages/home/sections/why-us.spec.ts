import { describe, expect, it } from 'vitest';
import { parseWhyUsPhoto } from './why-us';
import { SITE } from '../../../core/site.config';

/** why-us.json is edited by hand in cPanel, so a typo must never blank the photo. */
describe('parseWhyUsPhoto', () => {
  it('reads the photo in the shape why-us.json uses, ignoring _previous', () => {
    const parsed = parseWhyUsPhoto({
      _howToEdit: 'ignored',
      photo: { image: ' /images/a.jpg ', alt: 'A roof' },
      _previous: { image: '/images/legacy/b.jpg', alt: 'Old' },
    });
    expect(parsed).toEqual({ image: '/images/a.jpg', alt: 'A roof' });
  });

  it('accepts image and alt at the top level too', () => {
    expect(parseWhyUsPhoto({ image: '/images/a.jpg', alt: 'A roof' })).toEqual({ image: '/images/a.jpg', alt: 'A roof' });
  });

  it('fills in alt text when it is missing', () => {
    expect(parseWhyUsPhoto({ photo: { image: '/images/a.jpg' } })?.alt).toContain(SITE.name);
  });

  it('returns null with no image path, or JSON of the wrong shape', () => {
    expect(parseWhyUsPhoto({ photo: { alt: 'no image' } })).toBeNull();
    expect(parseWhyUsPhoto({ photo: { image: '  ' } })).toBeNull();
    expect(parseWhyUsPhoto(null)).toBeNull();
    expect(parseWhyUsPhoto('not json')).toBeNull();
  });
});
