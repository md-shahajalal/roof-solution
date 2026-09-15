import type {
  Credential,
  Faq,
  ProcessStep,
  Service,
  TrustItem,
} from './models';
import { SITE } from './site.config';

/**
 * Page content, kept out of the templates so it can later be swapped for an
 * HTTP call to a CMS without touching a single component's markup.
 */

/**
 * The credentials panel under the hero. Shaped like a statistics band, but every
 * value is a fact the business already publishes. See the note on TrustComponent.
 */
export const CREDENTIALS: readonly Credential[] = [
  { icon: 'medal',  value: 'Licensed', label: SITE.license.display },
  { icon: 'shield', value: 'Insured',  label: 'Bonded and covered on every job' },
  { icon: 'check',  value: 'Free',     label: 'No-obligation estimates' },
  { icon: 'clock',  value: '24/7',     label: 'Emergency roof line' },
];

/** The six reasons in "Why choose R&M". Each restates a claim made elsewhere on the site. */
export const FEATURES: readonly TrustItem[] = [
  { icon: 'shield', title: 'Licensed & insured',     text: `${SITE.license.display}, bonded and covered on every job.` },
  { icon: 'search', title: 'Honest estimates',       text: 'A clear price before work starts, and straight advice on repair or replace.' },
  { icon: 'medal',  title: 'Quality materials',      text: 'Built to last with premium materials.' },
  { icon: 'team',   title: 'Experienced team',       text: 'Skilled professionals you can trust on your roof.' },
  { icon: 'hammer', title: 'Workmanship guaranteed', text: 'We stand behind every job we do.' },
  { icon: 'clock',  title: '24/7 emergency line',    text: 'We answer when the storm does not wait.' },
];

/**
 * The built-in services. The live list is public/data/services.json, loaded by
 * ServiceCatalog; this copy only shows before that file arrives, or if it is
 * broken, so keep it in step with the JSON.
 *
 * TODO(client): confirm each service's `points`. They are drawn from what the
 * site already says and from the job photos (decking, ridge vents, flashing),
 * but the owner should check they match what a crew actually does.
 */
export const SERVICES: readonly Service[] = [
  {
    slug: 'roof-replacement',
    quote: 'Roof Replacement',
    title: 'Roof replacement',
    text: 'Durable, long-lasting roofs installed with precision.',
    points: ['Tear-off and new decking where needed', 'Ridge vents, caps and flashing', 'Premium, long-lasting materials'],
    icon: 'house',
    image: '/images/service-roof-replacement.jpg',
    alt: 'A newly installed architectural shingle roof seen along the ridge line',
  },
  {
    slug: 'roof-repair',
    quote: 'Roof Repair',
    title: 'Roof repair',
    text: 'Fast, reliable repairs that stop the leak the same week.',
    points: ['Leaks traced and stopped', 'Damaged or missing shingles', 'A clear price before work starts'],
    icon: 'hammer',
    image: '/images/service-roof-repair.jpg',
    alt: 'A roofer fastening replacement shingles with a coil nailer',
  },
  {
    slug: 'roof-inspection',
    quote: 'Roof Inspection',
    title: 'Roof inspection',
    text: 'Thorough inspections that catch problems early.',
    points: ['Findings explained in plain language', 'Honest repair-or-replace advice'],
    icon: 'search',
    image: '/images/service-roof-inspection.jpg',
    alt: 'A shingle roof with pipe boots, roof vents and a ridge vent ready for inspection',
  },
  {
    slug: 'storm-damage',
    quote: 'Storm Damage',
    title: 'Storm damage',
    text: 'Emergency tarping, documentation, and full restoration.',
    points: ['Emergency tarping', 'Damage documentation', 'Full restoration'],
    icon: 'storm',
    image: '/images/service-storm-damage.jpg',
    alt: 'Lightning striking behind a residential street during a storm',
  },
  {
    slug: 'maintenance',
    quote: 'Maintenance',
    title: 'Maintenance',
    text: 'Seasonal checkups that keep your roof in top condition.',
    points: ['Seasonal checkups', 'Small problems caught early'],
    icon: 'wrench',
    image: '/images/service-maintenance.jpg',
    alt: 'Close-up of a shingle hip cap, flashing and a pipe boot on a finished roof',
  },
];

/**
 * The "How it works" steps.
 *
 * Every step restates something the site already commits to elsewhere — the
 * one-business-day reply from the form's confirmation, the no-obligation
 * estimate, the experienced team and guaranteed workmanship — so the section
 * adds no promise the business has not already made.
 *
 * TODO(client): confirm this matches how a job actually runs.
 */
export const PROCESS_STEPS: readonly ProcessStep[] = [
  {
    icon: 'phone',
    title: 'Tell us about your roof',
    text: 'Call, message us, or send the free estimate form. We get back to you within one business day.',
  },
  {
    icon: 'search',
    title: 'We take a look',
    text: 'We come out, check the roof, and explain what we find in plain language.',
  },
  {
    icon: 'check',
    title: 'You get a clear estimate',
    text: 'You see the price before any work starts, with no pressure and no obligation.',
  },
  {
    icon: 'hammer',
    title: 'We do the work right',
    text: 'Our experienced team completes the job with quality materials and guaranteed workmanship.',
  },
];

/**
 * Frequently asked questions, answered only from what the site already states:
 * the licence, insurance, free estimates, the 24/7 line, storm services and the
 * service area. Nothing here should need a fact the business has not published.
 *
 * TODO(client): add the questions customers really ask on the phone.
 */
export const FAQS: readonly Faq[] = [
  {
    q: 'Is the estimate really free?',
    a: 'Yes. We come out, look at the roof and give you a price, with no cost and no obligation to go ahead.',
  },
  {
    q: 'Are you licensed and insured?',
    a: `Yes. R&M Roofing Solutions holds ${SITE.license.display}, and every job is licensed, bonded and insured.`,
  },
  {
    q: 'Should I repair my roof or replace it?',
    a: 'It depends on the age and condition of the roof. We will inspect it and tell you honestly whether a repair will do the job or a replacement makes more sense.',
  },
  {
    q: 'Can you help with storm damage or an emergency leak?',
    a: `Yes. Our emergency line is open 24/7 on ${SITE.phone}, and we handle emergency tarping, documentation and full restoration.`,
  },
  {
    q: 'What areas do you serve?',
    a: 'We serve homeowners across California. Call us or send an estimate request, and we will confirm we cover your address.',
  },
  {
    q: 'How do I get started?',
    a: `Call ${SITE.phone} or request a free estimate online. We get back to you within one business day.`,
  },
];

/** Star arrays for the review cards: `[1,2,3,4,5]` capped at the rating. */
export function stars(rating: number): number[] {
  return Array.from({ length: Math.max(1, Math.min(5, rating)) }, (_, i) => i);
}
