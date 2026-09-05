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
  /** Presentational: how many tiles per row on desktop, so rows come out even. */
  columns: 4 | 5;
  photos: readonly WorkPhoto[];
}

export interface Testimonial {
  text: string;
  author: string;
  rating: number;
}
