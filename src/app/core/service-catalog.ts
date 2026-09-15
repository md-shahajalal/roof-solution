import { Injectable, signal } from '@angular/core';
import { ICON_NAMES, type IconName } from '../shared/icon/icon';
import { SERVICES } from './content';
import type { Service } from './models';

/**
 * Where the services live. Like work.json, the file sits in public/, so the
 * build copies it next to index.html untouched. On the live site the client
 * edits public_html/data/services.json in cPanel, and the next page load shows
 * it, with no rebuild.
 */
const SERVICES_URL = 'data/services.json';

/** Drawn for a service whose icon name is missing or misspelt. */
const FALLBACK_ICON: IconName = 'house';

/**
 * The services, shared by the services grid, the hero's estimate picker and the
 * footer, so one edit to services.json changes all three together.
 *
 * It starts on the built-in copy in content.ts rather than empty: the hero
 * picker is above the fold, and popping in once the JSON arrives would shift the
 * page. A broken or empty file leaves that copy in place instead of blanking the
 * section.
 */
@Injectable({ providedIn: 'root' })
export class ServiceCatalog {
  private readonly list = signal<readonly Service[]>(SERVICES);
  readonly services = this.list.asReadonly();

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      // no-cache: revalidate with the server on each visit, so an edit made in
      // cPanel shows up straight away rather than when the browser cache expires.
      const response = await fetch(new URL(SERVICES_URL, document.baseURI), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = parseServices(await response.json());
      if (!parsed.length) throw new Error('no usable services in the file');
      this.list.set(parsed);
    } catch (error) {
      console.error(`Could not load services from ${SERVICES_URL}. Is the JSON valid? Showing the built-in list.`, error);
    }
  }
}

/**
 * The JSON is edited by hand, so accept either `{ "services": [...] }` or a bare
 * array. A service without a title or an image is skipped rather than shown
 * broken, so one bad block never takes the whole section down.
 */
export function parseServices(data: unknown): Service[] {
  const root = data as { services?: unknown } | null;
  const list = Array.isArray(data) ? data : root?.services;
  if (!Array.isArray(list)) return [];
  return list.flatMap(parseService);
}

function parseService(item: unknown): Service[] {
  const raw = item as Partial<Record<keyof Service, unknown>> | null;
  const title = text(raw?.title);
  const image = text(raw?.image);
  if (!title || !image) return [];

  const icon = text(raw?.icon);
  return [{
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    title,
    text: text(raw?.text),
    icon: (ICON_NAMES as readonly string[]).includes(icon) ? (icon as IconName) : FALLBACK_ICON,
    image,
    alt: text(raw?.alt) || title,
    quote: text(raw?.quote) || title,
    points: Array.isArray(raw?.points) ? raw.points.map(text).filter(Boolean) : [],
  }];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
