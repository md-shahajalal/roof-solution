import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { WORK_PHOTOS } from '../../../core/content';
import { TawkService } from '../../../core/tawk.service';
import type { WorkPhoto } from '../../../core/models';

/**
 * Where the job photos live. Like reviews.json, the file sits in public/, so the
 * build copies it next to index.html untouched. On the live site the client
 * uploads a photo to public_html/images/work/, adds it to
 * public_html/data/work.json in cPanel, and the next page load shows it, with no
 * rebuild. If the file is missing, broken or holds no usable photo, the built-in
 * photos in content.ts are shown instead.
 *
 * TODO(client): confirm the captions, and add the city — "Re-roof in <city>"
 * ranks and converts far better than "Finished roof" for a local services
 * business.
 */
const WORK_URL = 'data/work.json';

/**
 * Tiles in the gallery. The first photo leads at twice the size and takes four
 * cells, so 13 photos fill exactly four rows of four on desktop and, with the
 * lead photo full width, six rows of two on a phone. Anything past that is one
 * tap away in the viewer, behind a "+N more" on the last tile, so the section
 * never grows into most of the page however long work.json gets.
 */
export const WORK_TILES = 13;

/** Below this many photos a lead tile leaves more gaps than it fills. */
export const WORK_FEATURE_MIN = 5;

/**
 * Job photos as one showcase gallery, with a viewer for a closer look.
 *
 * Every photo is on the page at once: a visitor judging a contractor scrolls,
 * they do not click through tabs to find the work. The viewer matters because
 * these are phone photos of detail work — a flashed vent or a re-sheeted deck
 * only reads at full size.
 */
@Component({
  selector: 'rm-work',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-work" id="work">
      <div class="rm-container">

        <div class="rm-section-head">
          <p class="rm-eyebrow">Our work</p>
          <h2 class="rm-h2">Real roofs, photographed on the job</h2>
          <p class="rm-section-sub">
            From new decking to the finished ridge, including the prep work that is hidden once the shingles go on.
          </p>
        </div>

        @if (photos().length) {
          <div class="rm-work__grid" [class.has-feature]="featured()">
            @for (photo of tiles(); track $index; let i = $index) {
              <button type="button" class="rm-work__item" (click)="openPhoto(i, $event)"
                      [attr.aria-label]="'View larger: ' + (photo.caption || photo.alt)">
                <img [src]="photo.image" [alt]="photo.alt" width="640" height="853"
                     loading="lazy" decoding="async">
                @if (photo.caption) {
                  <span class="rm-work__caption">{{ photo.caption }}</span>
                }
                <span class="rm-work__zoom" aria-hidden="true"><rm-icon name="search" /></span>

                <!-- The last tile says how much more the viewer holds. A tablet's
                     three columns fit one tile fewer, so it counts from the 12th. -->
                @if (i === tileCount - 1 && photos().length > tileCount) {
                  <span class="rm-work__rest" aria-hidden="true">
                    +{{ photos().length - tileCount }}<small>more photos</small>
                  </span>
                }
                @if (featured() && i === tileCount - 2 && photos().length > tileCount - 1) {
                  <span class="rm-work__rest rm-work__rest--tablet" aria-hidden="true">
                    +{{ photos().length - tileCount + 1 }}<small>more photos</small>
                  </span>
                }
              </button>
            }
          </div>
        }

      </div>

      @if (viewing(); as photo) {
        <div class="rm-lightbox" role="dialog" aria-modal="true"
             [attr.aria-label]="photo.caption || photo.alt" (click)="closePhoto()"
             (touchstart)="onTouchStart($event)" (touchend)="onTouchEnd($event)">
          <figure class="rm-lightbox__figure" (click)="$event.stopPropagation()">
            <img [src]="photo.image" [alt]="photo.alt" width="640" height="853">
            <figcaption>
              <span>{{ photo.caption }}</span>
              <span class="rm-lightbox__count">{{ (index() ?? 0) + 1 }} / {{ photos().length }}</span>
            </figcaption>
          </figure>

          <button #closeButton type="button" class="rm-lightbox__close"
                  (click)="closePhoto()" aria-label="Close">&times;</button>
          @if (photos().length > 1) {
            <button type="button" class="rm-lightbox__nav rm-lightbox__nav--prev"
                    (click)="step(-1); $event.stopPropagation()" aria-label="Previous photo">
              <rm-icon name="chevron" />
            </button>
            <button type="button" class="rm-lightbox__nav rm-lightbox__nav--next"
                    (click)="step(1); $event.stopPropagation()" aria-label="Next photo">
              <rm-icon name="chevron" />
            </button>
          }
        </div>
      }
    </section>
  `,
})
export class WorkComponent {
  protected readonly tileCount = WORK_TILES;
  protected readonly photos = signal<readonly WorkPhoto[]>([]);
  protected readonly tiles = computed(() => this.photos().slice(0, WORK_TILES));
  protected readonly featured = computed(() => this.photos().length >= WORK_FEATURE_MIN);

  /**
   * Index of the photo open in the viewer, or null while it is closed. It
   * indexes every photo, not just the tiles, so the viewer steps on past the
   * grid into the rest.
   */
  protected readonly index = signal<number | null>(null);
  protected readonly viewing = computed(() => {
    const i = this.index();
    return i === null ? null : (this.photos()[i] ?? null);
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly tawk = inject(TawkService);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private returnFocus: HTMLElement | null = null;
  private touchStartX: number | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      document.body.classList.remove('rm-lightbox-open');
      this.tawk.setCovered('lightbox', false);
    });
    void this.load();
  }

  protected openPhoto(i: number, event: Event): void {
    this.returnFocus = event.currentTarget as HTMLElement;
    this.index.set(i);
    document.body.classList.add('rm-lightbox-open');
    // tawk.to's icon floats above the viewer and sits on the photo's corner, or
    // on the next-photo arrow on a phone. Back once the viewer closes.
    this.tawk.setCovered('lightbox', true);
    afterNextRender(() => this.closeButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected closePhoto(): void {
    if (this.index() === null) return;
    this.index.set(null);
    document.body.classList.remove('rm-lightbox-open');
    this.tawk.setCovered('lightbox', false);
    this.returnFocus?.focus();
    this.returnFocus = null;
  }

  protected step(delta: number): void {
    const i = this.index();
    const count = this.photos().length;
    if (i === null || !count) return;
    this.index.set((i + delta + count) % count);
  }

  /** On a phone, a sideways swipe moves between photos, as every photo app does. */
  protected onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0]?.clientX ?? null;
  }

  protected onTouchEnd(event: TouchEvent): void {
    const start = this.touchStartX;
    this.touchStartX = null;
    const end = event.changedTouches[0]?.clientX;
    if (start === null || end === undefined || Math.abs(end - start) < 50) return;
    this.step(end < start ? 1 : -1);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: Event): void {
    if (this.index() === null || !(event instanceof KeyboardEvent)) return;

    if (event.key === 'Escape') this.closePhoto();
    else if (event.key === 'ArrowRight') this.step(1);
    else if (event.key === 'ArrowLeft') this.step(-1);
    else if (event.key === 'Tab') this.trapFocus(event);
  }

  private async load(): Promise<void> {
    try {
      // no-cache: revalidate with the server on each visit, so an edit made in
      // cPanel shows up straight away rather than when the browser cache expires.
      const response = await fetch(new URL(WORK_URL, document.baseURI), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = parseWorkPhotos(await response.json());
      if (!parsed.length) throw new Error('no usable photos in the file');
      this.photos.set(parsed);
    } catch (error) {
      console.error(`Could not load work photos from ${WORK_URL}. Is the JSON valid? Showing the built-in photos.`, error);
      this.photos.set(WORK_PHOTOS);
    }
  }

  /** Keeps Tab cycling through the viewer's buttons while it is open. */
  private trapFocus(event: KeyboardEvent): void {
    const buttons = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>('.rm-lightbox button'),
    );
    if (!buttons.length) return;
    const at = buttons.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey
      ? (at <= 0 ? buttons.length - 1 : at - 1)
      : (at === -1 || at === buttons.length - 1 ? 0 : at + 1);
    event.preventDefault();
    buttons[next].focus();
  }
}

/**
 * The JSON is edited by hand, so accept either `{ "photos": [...] }` or a bare
 * array. A photo without an image path is skipped rather than shown broken, so
 * one bad block never takes the whole gallery down.
 *
 * The file used to group photos into tabs (`{ "phases": [{ "photos": [...] }] }`).
 * A copy saved in that shape still loads, its groups run together in order, so
 * the live site keeps its gallery whichever version of the file it has.
 */
export function parseWorkPhotos(data: unknown): WorkPhoto[] {
  const root = data as { photos?: unknown; phases?: unknown } | null;
  const list = Array.isArray(data) ? data : (root?.photos ?? root?.phases);
  if (!Array.isArray(list)) return [];

  return list.flatMap((item): WorkPhoto[] =>
    Array.isArray(item?.photos) ? item.photos.flatMap(parsePhoto) : parsePhoto(item),
  );
}

function parsePhoto(item: unknown): WorkPhoto[] {
  const photo = item as Partial<Record<keyof WorkPhoto, unknown>> | null;
  const image = typeof photo?.image === 'string' ? photo.image.trim() : '';
  if (!image) return [];
  const caption = typeof photo?.caption === 'string' ? photo.caption.trim() : '';
  const alt = typeof photo?.alt === 'string' && photo.alt.trim() ? photo.alt.trim() : caption;
  return [{ image, caption, alt }];
}
