import type { IconName } from '../shared/icon/icon';

export interface TrustItem {
  icon: IconName;
  title: string;
  text: string;
}

export interface Service {
  slug: string;
  title: string;
  text: string;
  icon: IconName;
  image: string;
  /** Describes the photograph, not the service. Used for alt text. */
  alt: string;
  /**
   * The matching option in the estimate form's "Roofing service needed" list,
   * so a "Get a free quote" button can open the form with it already chosen.
   * Must match that list exactly, or the form opens with nothing selected.
   */
  quote: string;
  /** What the service covers, shown as a short checklist on its card. */
  points: readonly string[];
}

/** One cell of the credentials panel under the hero. */
export interface Credential {
  icon: IconName;
  /** The big word: "Licensed", "24/7". */
  value: string;
  label: string;
}

export interface ProcessStep {
  icon: IconName;
  title: string;
  text: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface WorkPhoto {
  image: string;
  /** Shown over the tile. */
  caption: string;
  /** Describes the photograph for screen readers and search. */
  alt: string;
}

export interface WorkPhase {
  title: string;
  /**
   * Presentational: how many tiles per row on desktop, so rows come out even.
   * Worked out from the photo count when work.json is read, not stored in it.
   */
  columns: number;
  photos: readonly WorkPhoto[];
}

export interface Testimonial {
  text: string;
  author: string;
  rating: number;
}
