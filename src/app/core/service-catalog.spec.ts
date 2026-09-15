import { describe, expect, it } from 'vitest';
import { parseServices } from './service-catalog';

const service = (title: string) => ({
  title,
  text: `About ${title}`,
  points: ['One', 'Two'],
  icon: 'wrench',
  quote: 'Maintenance',
  image: `/images/${title}.jpg`,
  alt: `Photo of ${title}`,
});

/**
 * services.json is edited by hand in cPanel, so the parser is what stands
 * between a stray typo and a services section that silently breaks.
 */
describe('parseServices', () => {
  it('reads services in the shape services.json uses', () => {
    const [parsed] = parseServices({ _howToEdit: 'ignored', services: [{ ...service('Gutters'), _previous: {} }] });

    expect(parsed).toEqual({
      slug: 'gutters',
      title: 'Gutters',
      text: 'About Gutters',
      points: ['One', 'Two'],
      icon: 'wrench',
      quote: 'Maintenance',
      image: '/images/Gutters.jpg',
      alt: 'Photo of Gutters',
    });
  });

  it('accepts a bare array as well as { "services": [...] }', () => {
    expect(parseServices([service('A')])).toEqual(parseServices({ services: [service('A')] }));
  });

  it('skips a service with no title or no image', () => {
    const parsed = parseServices([service('Kept'), { ...service('x'), title: ' ' }, { ...service('No image'), image: '' }]);
    expect(parsed.map((s) => s.title)).toEqual(['Kept']);
  });

  it('draws a house for an unknown icon, and fills alt and quote from the title', () => {
    const [parsed] = parseServices([{ title: 'Skylights', image: '/s.jpg', icon: 'rocket' }]);
    expect(parsed).toMatchObject({ icon: 'house', alt: 'Skylights', quote: 'Skylights', text: '', points: [] });
  });

  it('returns nothing for JSON of the wrong shape instead of throwing', () => {
    expect(parseServices(null)).toEqual([]);
    expect(parseServices({ photos: [] })).toEqual([]);
    expect(parseServices('not json')).toEqual([]);
  });
});
