import type { Service, Testimonial, TrustItem, WorkPhase } from './models';

/**
 * Page content, kept out of the templates so it can later be swapped for an
 * HTTP call to a CMS without touching a single component's markup.
 */

export const TRUST_ITEMS: readonly TrustItem[] = [
  { icon: 'shield', title: 'Fully insured',    text: 'Licensed, bonded, and covered on every job.' },
  { icon: 'medal',  title: 'Quality work',     text: 'Built to last with premium materials.' },
  { icon: 'team',   title: 'Experienced team', text: 'Skilled professionals you can trust.' },
  { icon: 'clock',  title: '24/7 support',     text: 'We answer when the storm does not wait.' },
];

export const SERVICES: readonly Service[] = [
  {
    slug: 'roof-replacement',
    title: 'Roof replacement',
    text: 'Durable, long-lasting roofs installed with precision.',
    icon: 'house',
    image: '/images/service-roof-replacement.jpg',
    alt: 'A newly installed architectural shingle roof seen along the ridge line',
  },
  {
    slug: 'roof-repair',
    title: 'Roof repair',
    text: 'Fast, reliable repairs that stop the leak the same week.',
    icon: 'hammer',
    image: '/images/service-roof-repair.jpg',
    alt: 'A roofer fastening replacement shingles with a coil nailer',
  },
  {
    slug: 'roof-inspection',
    title: 'Roof inspection',
    text: 'Thorough inspections that catch problems early.',
    icon: 'search',
    image: '/images/service-roof-inspection.jpg',
    alt: 'A brick home with a steep shingle roof and covered porch',
  },
  {
    slug: 'storm-damage',
    title: 'Storm damage',
    text: 'Emergency tarping, documentation, and full restoration.',
    icon: 'storm',
    image: '/images/service-storm-damage.jpg',
    alt: 'Lightning striking behind a residential street during a storm',
  },
  {
    slug: 'maintenance',
    title: 'Maintenance',
    text: 'Seasonal checkups that keep your roof in top condition.',
    icon: 'wrench',
    image: '/images/service-maintenance.jpg',
    alt: 'Close-up of shingles, soffit vents and fascia at a gable end',
  },
];

export const WHY_POINTS: readonly string[] = [
  'Professional and reliable service',
  'Top quality materials',
  'Honest estimates',
  'Customer satisfaction',
  'Workmanship guaranteed',
];

/**
 * Real job photography, grouped by the stage of work each shot documents.
 *
 * The grouping is the point: the decking photos show work a homeowner never
 * sees once the shingles go on, which is exactly where a cheap contractor cuts
 * corners. Ungrouped, eight photos of grey shingles blur into one another.
 *
 * TODO(client): confirm the captions, and add the city — "Re-roof in
 * <city>" ranks and converts far better than "Finished roof" for a local
 * services business.
 */
export const WORK_PHASES: readonly WorkPhase[] = [
  {
    title: 'Tear-off and new decking',
    columns: 5,
    photos: [
      {
        image: '/images/work/01.jpg',
        caption: 'New plywood decking, bundles staged',
        alt: 'New plywood roof decking with shingle bundles staged along the ridge',
      },
      {
        image: '/images/work/02.jpg',
        caption: 'Decking replaced to the eave edge',
        alt: 'Replaced roof decking running to the eave above a metal awning',
      },
      {
        image: '/images/work/03.jpg',
        caption: 'Low-slope transition, cap sheet laid',
        alt: 'Cap sheet laid at the transition between steep and low-slope sections',
      },
      {
        image: '/images/work/04.jpg',
        caption: 'Full deck re-sheeted before underlayment',
        alt: 'A fully re-sheeted roof deck marked up before underlayment goes down',
      },
      {
        image: '/images/work/05.jpg',
        caption: 'Deck complete, material staged on the ridge',
        alt: 'Completed roof deck with shingle bundles stacked along the ridge',
      },
    ],
  },
  {
    title: 'Finished roof',
    columns: 4,
    photos: [
      {
        image: '/images/work/2.jpg',
        caption: 'Finished ridge with continuous vent',
        alt: 'Completed shingle roof with a continuous ridge vent running its length',
      },
      {
        image: '/images/work/3.jpg',
        caption: 'Hip and ridge caps installed',
        alt: 'Hip and ridge caps installed along the peak of a new shingle roof',
      },
      {
        image: '/images/work/4.jpg',
        caption: 'New vents flashed into the field',
        alt: 'Roof vents flashed into the shingle field on a completed slope',
      },
      {
        image: '/images/work/5.jpg',
        caption: 'Completed slope, ridge cap detail',
        alt: 'A finished shingle slope meeting the ridge cap line',
      },
      {
        image: '/images/work/6.jpg',
        caption: 'Ridge vents run the length of the roof',
        alt: 'Ridge vents running the full length of a completed roof',
      },
      {
        image: '/images/work/7.jpg',
        caption: 'Finished field around existing skylights',
        alt: 'New shingles finished around existing skylights',
      },
      {
        image: '/images/work/8.jpg',
        caption: 'Skylight curbs re-flashed and sealed',
        alt: 'Re-flashed and sealed skylight curbs on a new shingle roof',
      },
      {
        image: '/images/work/9.jpg',
        caption: 'Completed re-roof, full elevation',
        alt: 'A completed re-roof seen across the full elevation of the building',
      },
    ],
  },
];

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    text: 'Excellent work. Professional, honest, and very reliable — I would recommend them to anyone.',
    author: 'Maria G.',
    rating: 5,
  },
  {
    text: 'They did an amazing job on our roof. Fast, clean, and great quality work.',
    author: 'Carlos R.',
    rating: 5,
  },
  {
    text: 'Best roofing company we have worked with. Very professional and trustworthy.',
    author: 'Jessica L.',
    rating: 5,
  },
];

/** Star arrays for the review cards: `[1,2,3,4,5]` capped at the rating. */
export function stars(rating: number): number[] {
  return Array.from({ length: Math.max(1, Math.min(5, rating)) }, (_, i) => i);
}
