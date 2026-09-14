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
import type { WorkPhase, WorkPhoto } from '../../../core/models';

/**
 * Where the job photos live. Like reviews.json, the file sits in public/, so the
 * build copies it next to index.html untouched. On the live site the client
 * uploads a photo to public_html/images/work/, adds it to
 * public_html/data/work.json in cPanel, and the next page load shows it, with no
 * rebuild.
 *
 * The photos are grouped by the stage of work each shot documents. The grouping
 * is the point: the decking photos show work a homeowner never sees once the
 * shingles go on, which is exactly where a cheap contractor cuts corners.
 *
 * TODO(client): confirm the captions, and add the city — "Re-roof in <city>"
 * ranks and converts far better than "Finished roof" for a local services
 * business.
 */
const WORK_URL = 'data/work.json';

/**
 * Photos shown per tab before "Show more", and how many each press adds.
 *
 * The file can grow to hundreds of photos, and rendering them all at once would
 * turn one section into most of the page. 12 fills whole rows at every grid
 * width the stylesheet uses (4, 3 and 2 columns), so each batch ends flush.
 */
export const WORK_PAGE_SIZE = 12;

/**
 * Job photos, one stage of work at a time, with a viewer for a closer look.
 *
 * Tabs instead of every photo stacked: thirteen near-identical shots of grey
 * shingles made the page long without telling a visitor anything more. The
 * viewer matters because these are phone photos of detail work — a flashed vent
 * or a re-sheeted deck only reads at full size.
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
            Including the decking and prep work that is hidden once the shingles go on.
          </p>
        </div>

        @if (current(); as phase) {
          <!-- One stage needs no tabs; the photos speak for themselves. -->
          @if (phases().length > 1) {
            <div class="rm-tabs" role="tablist" aria-label="Stage of work">
              @for (item of phases(); track $index; let i = $index) {
                <button type="button" role="tab" class="rm-tabs__tab"
                        [id]="'rm-work-tab-' + i"
                        [attr.aria-selected]="i === tab()"
                        aria-controls="rm-work-panel"
                        [attr.tabindex]="i === tab() ? 0 : -1"
                        (click)="selectTab(i)"
                        (keydown)="onTabKey($event, i)">
                  {{ item.title }}
                  <span class="rm-tabs__count">{{ item.photos.length }}</span>
                </button>
              }
            </div>
          }

          <div class="rm-work__grid" id="rm-work-panel"
               [attr.role]="phases().length > 1 ? 'tabpanel' : null"
               [attr.aria-labelledby]="phases().length > 1 ? 'rm-work-tab-' + tab() : null"
               [style.--rm-cols]="phase.columns">
            @for (photo of visiblePhotos(); track $index; let i = $index) {
              <button type="button" class="rm-work__item" (click)="openPhoto(i, $event)"
                      [attr.aria-label]="'View larger: ' + (photo.caption || photo.alt)">
                <img [src]="photo.image" [alt]="photo.alt" width="640" height="853"
                     loading="lazy" decoding="async">
                @if (photo.caption) {
                  <span class="rm-work__caption">{{ photo.caption }}</span>
                }
                <span class="rm-work__zoom" aria-hidden="true"><rm-icon name="search" /></span>
              </button>
            }
          </div>

          <!-- One button that changes its label, rather than two that swap, so
               keyboard focus is never dropped when the last batch appears. -->
          @if (phase.photos.length > pageSize) {
            <div class="rm-work__more">
              <p class="rm-work__count" aria-live="polite">
                Showing {{ visiblePhotos().length }} of {{ phase.photos.length }} photos
              </p>
              <button type="button" class="rm-btn rm-btn--ghost"
                      [attr.aria-controls]="'rm-work-panel'"
                      (click)="remaining() ? showMore() : showFewer()">
                @if (remaining()) {
                  Show {{ nextBatch() }} more {{ nextBatch() === 1 ? 'photo' : 'photos' }}
                } @else {
                  Show fewer photos
                }
                <span class="rm-btn__chevron rm-work__more-icon" [class.is-up]="!remaining()">
                  <rm-icon name="chevron" />
                </span>
              </button>
            </div>
          }
        }

      </div>

      @if (viewing(); as photo) {
        <div class="rm-lightbox" role="dialog" aria-modal="true"
             [attr.aria-label]="photo.caption || photo.alt" (click)="closePhoto()">
          <figure class="rm-lightbox__figure" (click)="$event.stopPropagation()">
            <img [src]="photo.image" [alt]="photo.alt" width="640" height="853">
            <figcaption>
              <span>{{ photo.caption }}</span>
              <span class="rm-lightbox__count">{{ (index() ?? 0) + 1 }} / {{ current()?.photos?.length }}</span>
            </figcaption>
          </figure>

          <button #closeButton type="button" class="rm-lightbox__close"
                  (click)="closePhoto()" aria-label="Close">&times;</button>
          <button type="button" class="rm-lightbox__nav rm-lightbox__nav--prev"
                  (click)="step(-1); $event.stopPropagation()" aria-label="Previous photo">
            <rm-icon name="chevron" />
          </button>
          <button type="button" class="rm-lightbox__nav rm-lightbox__nav--next"
                  (click)="step(1); $event.stopPropagation()" aria-label="Next photo">
            <rm-icon name="chevron" />
          </button>
        </div>
      }
    </section>
  `,
})
export class WorkComponent {
  protected readonly pageSize = WORK_PAGE_SIZE;
  protected readonly phases = signal<readonly WorkPhase[]>([]);

  protected readonly tab = signal(0);
  protected readonly current = computed<WorkPhase | undefined>(() => this.phases()[this.tab()]);

  /** How many of the current tab's photos are on the page. */
  protected readonly shown = signal(WORK_PAGE_SIZE);
  protected readonly visiblePhotos = computed(() => this.current()?.photos.slice(0, this.shown()) ?? []);
  protected readonly remaining = computed(
    () => (this.current()?.photos.length ?? 0) - this.visiblePhotos().length,
  );
  protected readonly nextBatch = computed(() => Math.min(WORK_PAGE_SIZE, this.remaining()));

  /**
   * Index of the photo open in the viewer, or null while it is closed. It
   * indexes the whole tab, not just the photos on the page, so the viewer can
   * step through every photo without the visitor pressing "Show more" first.
   */
  protected readonly index = signal<number | null>(null);
  protected readonly viewing = computed(() => {
    const i = this.index();
    return i === null ? null : (this.current()?.photos[i] ?? null);
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private returnFocus: HTMLElement | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => document.body.classList.remove('rm-lightbox-open'));
    void this.load();
  }

  /** Every tab opens on its first batch, whatever was expanded on the last one. */
  protected selectTab(i: number): void {
    this.tab.set(i);
    this.shown.set(WORK_PAGE_SIZE);
  }

  /** Arrow keys, Home and End move between tabs, as the ARIA tabs pattern expects. */
  protected onTabKey(event: KeyboardEvent, i: number): void {
    const count = this.phases().length;
    const next =
      event.key === 'ArrowRight' ? (i + 1) % count
      : event.key === 'ArrowLeft' ? (i - 1 + count) % count
      : event.key === 'Home' ? 0
      : event.key === 'End' ? count - 1
      : null;
    if (next === null) return;

    event.preventDefault();
    this.selectTab(next);
    afterNextRender(
      () => this.host.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus(),
      { injector: this.injector },
    );
  }

  /**
   * Reveals the next batch and moves focus to the first new photo, so a keyboard
   * or screen-reader user lands on what just appeared instead of back at the top.
   */
  protected showMore(): void {
    const firstNew = this.visiblePhotos().length;
    this.shown.update((count) => count + WORK_PAGE_SIZE);
    afterNextRender(
      () => this.host.nativeElement.querySelectorAll<HTMLElement>('.rm-work__item')[firstNew]?.focus(),
      { injector: this.injector },
    );
  }

  /**
   * Back to the first batch. The page just got much shorter above the visitor, so
   * bring the section back into view rather than leaving them in the reviews.
   */
  protected showFewer(): void {
    this.shown.set(WORK_PAGE_SIZE);
    afterNextRender(
      () => {
        const section = this.host.nativeElement.querySelector<HTMLElement>('#work');
        if (!section || section.getBoundingClientRect().top >= 0) return;
        const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        section.scrollIntoView?.({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
      },
      { injector: this.injector },
    );
  }

  protected openPhoto(i: number, event: Event): void {
    this.returnFocus = event.currentTarget as HTMLElement;
    this.index.set(i);
    document.body.classList.add('rm-lightbox-open');
    afterNextRender(() => this.closeButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected closePhoto(): void {
    if (this.index() === null) return;
    this.index.set(null);
    document.body.classList.remove('rm-lightbox-open');
    this.returnFocus?.focus();
    this.returnFocus = null;
  }

  protected step(delta: number): void {
    const i = this.index();
    const count = this.current()?.photos.length ?? 0;
    if (i === null || !count) return;
    this.index.set((i + delta + count) % count);
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
      this.phases.set(parseWorkPhases(await response.json()));
    } catch (error) {
      console.error(`Could not load work photos from ${WORK_URL}. Is the JSON valid?`, error);
    }
  }

  /** Keeps Tab cycling through the viewer's three buttons while it is open. */
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
 * The JSON is edited by hand, so accept either `{ "phases": [...] }` or a bare
 * array. A photo without an image path is skipped rather than shown broken, and
 * a stage left with no photos is dropped, so one bad block never takes the whole
 * gallery down.
 */
export function parseWorkPhases(data: unknown): WorkPhase[] {
  const list = Array.isArray(data) ? data : (data as { phases?: unknown } | null)?.phases;
  if (!Array.isArray(list)) return [];

  return list.flatMap((item): WorkPhase[] => {
    const title = typeof item?.title === 'string' ? item.title.trim() : '';
    const photos = Array.isArray(item?.photos) ? item.photos.flatMap(parsePhoto) : [];
    if (!title || !photos.length) return [];
    return [{ title, columns: columnsFor(photos.length), photos }];
  });
}

function parsePhoto(item: unknown): WorkPhoto[] {
  const photo = item as Partial<Record<keyof WorkPhoto, unknown>> | null;
  const image = typeof photo?.image === 'string' ? photo.image.trim() : '';
  if (!image) return [];
  const caption = typeof photo?.caption === 'string' ? photo.caption.trim() : '';
  const alt = typeof photo?.alt === 'string' && photo.alt.trim() ? photo.alt.trim() : caption;
  return [{ image, caption, alt }];
}

/**
 * Tiles per desktop row, chosen so the rows come out even: 5 photos sit in one
 * row of five, 8 in two rows of four, 6 in two rows of three. Worked out here
 * so whoever edits the JSON never has to think about layout.
 *
 * A tab long enough to page always uses 4, so each batch of WORK_PAGE_SIZE
 * fills its rows exactly instead of leaving a ragged last row per batch.
 */
function columnsFor(count: number): number {
  if (count > WORK_PAGE_SIZE) return 4;
  if (count % 5 === 0) return 5;
  if (count % 4 === 0) return 4;
  if (count % 3 === 0) return 3;
  return 4;
}
