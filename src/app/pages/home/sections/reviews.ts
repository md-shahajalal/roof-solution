import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { stars } from '../../../core/content';
import type { Testimonial } from '../../../core/models';

/**
 * Where the reviews live. The file sits in public/, so the build copies it next
 * to index.html untouched (no hash in the name). On the live site the client
 * edits public_html/data/reviews.json in cPanel and the next page load shows
 * the change, with no rebuild.
 *
 * TODO(client): replace the sample reviews with real ones, ideally copied from
 * Google with the customer's permission. Reviews that turn out to be
 * placeholders do more damage to trust than having no reviews at all.
 */
const REVIEWS_URL = 'data/reviews.json';

/** How long each slide stays before autoplay moves on. */
const AUTOPLAY_MS = 6000;

@Component({
  selector: 'rm-reviews',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-reviews" id="reviews">
      <div class="rm-container">

        <div class="rm-section-head">
          <p class="rm-eyebrow">Reviews</p>
          <h2 class="rm-h2">What customers say about R&amp;M</h2>
        </div>

        @if (reviews().length) {
          <div class="rm-slider"
               (mouseenter)="hovered.set(true)" (mouseleave)="hovered.set(false)"
               (focusin)="focused.set(true)" (focusout)="onFocusOut($event)"
               (touchstart)="hovered.set(true)">

            <div #track class="rm-slider__track" tabindex="0"
                 role="region" aria-roledescription="carousel" aria-label="Customer reviews"
                 (scroll)="onScroll()" (keydown)="onKey($event)">
              @for (review of reviews(); track $index; let i = $index) {
                <figure class="rm-review rm-slider__slide" role="group" aria-roledescription="slide"
                        [attr.aria-label]="(i + 1) + ' of ' + reviews().length">
                  <span class="rm-review__mark" aria-hidden="true"><rm-icon name="quote" /></span>
                  <div class="rm-stars" role="img" [attr.aria-label]="review.rating + ' out of 5 stars'">
                    @for (star of stars(review.rating); track star) {
                      <rm-icon name="star" />
                    }
                  </div>
                  <blockquote class="rm-review__text">{{ review.text }}</blockquote>
                  <figcaption class="rm-review__by">
                    <span class="rm-review__avatar" aria-hidden="true">{{ initials(review.author) }}</span>
                    <span class="rm-review__name">{{ review.author }}</span>
                  </figcaption>
                </figure>
              }
            </div>

            @if (positions() > 1) {
              <div class="rm-slider__controls">
                <button type="button" class="rm-slider__arrow rm-slider__arrow--prev"
                        (click)="step(-1)" aria-label="Previous review">
                  <rm-icon name="chevron" />
                </button>

                <div class="rm-slider__dots">
                  @for (dot of dots(); track dot) {
                    <button type="button" class="rm-slider__dot"
                            [class.is-active]="dot === active()"
                            [attr.aria-current]="dot === active() ? 'true' : null"
                            [attr.aria-label]="'Show review ' + (dot + 1)"
                            (click)="goTo(dot)"></button>
                  }
                </div>

                <button type="button" class="rm-slider__arrow rm-slider__arrow--next"
                        (click)="step(1)" aria-label="Next review">
                  <rm-icon name="chevron" />
                </button>
              </div>
            }
          </div>
        }

      </div>
    </section>
  `,
})
export class ReviewsComponent {
  protected readonly stars = stars;
  protected readonly reviews = signal<readonly Testimonial[]>([]);

  /** Scroll stops: one per card, less the cards already in view at the end. */
  protected readonly positions = signal(1);
  protected readonly active = signal(0);
  protected readonly dots = computed(() => Array.from({ length: this.positions() }, (_, i) => i));

  /** Autoplay pauses while the visitor is reading or has taken control. */
  protected readonly hovered = signal(false);
  protected readonly focused = signal(false);

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private readonly injector = inject(Injector);
  private readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    const timer = setInterval(() => this.autoplay(), AUTOPLAY_MS);
    const onResize = () => this.measure();
    window.addEventListener('resize', onResize, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      window.removeEventListener('resize', onResize);
    });

    void this.load();
  }

  /** "Sarah Mitchell" becomes "SM" for the avatar circle. */
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  /** Next or previous, wrapping round at either end. */
  protected step(delta: number): void {
    const count = this.positions();
    this.goTo((this.active() + delta + count) % count);
  }

  protected goTo(index: number): void {
    const track = this.track()?.nativeElement;
    const slides = track?.children;
    if (!track || !slides?.length) return;

    const target = slides[Math.min(index, slides.length - 1)] as HTMLElement;
    const first = slides[0] as HTMLElement;
    track.scrollTo({
      left: target.offsetLeft - first.offsetLeft,
      behavior: this.reducedMotion ? 'auto' : 'smooth',
    });
    this.active.set(index);
  }

  /** Keeps the dots in step when the visitor swipes instead of using the arrows. */
  protected onScroll(): void {
    const track = this.track()?.nativeElement;
    const stride = this.stride(track);
    if (!track || !stride) return;

    const last = this.positions() - 1;
    const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    this.active.set(atEnd ? last : Math.min(Math.round(track.scrollLeft / stride), last));
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    this.step(event.key === 'ArrowRight' ? 1 : -1);
  }

  /** Only resume autoplay once focus has left the slider entirely. */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !(event.currentTarget as HTMLElement).contains(next)) this.focused.set(false);
  }

  private async load(): Promise<void> {
    try {
      // no-cache: revalidate with the server on each visit, so an edit made in
      // cPanel shows up straight away rather than when the browser cache expires.
      const response = await fetch(new URL(REVIEWS_URL, document.baseURI), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.reviews.set(parseReviews(await response.json()));
    } catch (error) {
      console.error(`Could not load reviews from ${REVIEWS_URL}. Is the JSON valid?`, error);
      return;
    }
    afterNextRender(() => this.measure(), { injector: this.injector });
  }

  private autoplay(): void {
    if (this.reducedMotion || this.hovered() || this.focused() || document.hidden) return;
    if (this.positions() > 1) this.step(1);
  }

  /** Works out how many cards are in view, which the CSS decides per breakpoint. */
  private measure(): void {
    const track = this.track()?.nativeElement;
    const stride = this.stride(track);
    if (!track || !stride) return;

    const perView = Math.max(1, Math.round(track.clientWidth / stride));
    this.positions.set(Math.max(1, track.children.length - perView + 1));
    this.onScroll();
  }

  /** Distance from one card's left edge to the next: card width plus the gap. */
  private stride(track: HTMLElement | undefined): number {
    const slides = track?.children;
    if (!slides?.length) return 0;
    if (slides.length === 1) return (slides[0] as HTMLElement).offsetWidth;
    return (slides[1] as HTMLElement).offsetLeft - (slides[0] as HTMLElement).offsetLeft;
  }
}

/**
 * The JSON is edited by hand, so accept either `{ "reviews": [...] }` or a bare
 * array, and skip any entry missing its text or name rather than showing a
 * broken card.
 */
function parseReviews(data: unknown): Testimonial[] {
  const list = Array.isArray(data) ? data : (data as { reviews?: unknown } | null)?.reviews;
  if (!Array.isArray(list)) return [];

  return list.flatMap((item): Testimonial[] => {
    const text = typeof item?.text === 'string' ? item.text.trim() : '';
    const author = typeof item?.author === 'string' ? item.author.trim() : '';
    if (!text || !author) return [];
    const rating = Math.round(Number(item.rating));
    return [{ text, author, rating: rating >= 1 && rating <= 5 ? rating : 5 }];
  });
}
