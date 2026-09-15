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
import { REVIEWS, stars } from '../../../core/content';
import type { Testimonial } from '../../../core/models';

/**
 * Where the reviews live. The file sits in public/, so the build copies it next
 * to index.html untouched (no hash in the name). On the live site the client
 * edits public_html/data/reviews.json in cPanel and the next page load shows
 * the change, with no rebuild. If the file is missing, broken or holds no usable
 * review, the built-in reviews in content.ts are shown instead.
 *
 * TODO(client): replace the sample reviews with real ones, ideally copied from
 * Google with the customer's permission. Reviews that turn out to be
 * placeholders do more damage to trust than having no reviews at all.
 */
const REVIEWS_URL = 'data/reviews.json';

/**
 * How long each review stays put before the strip moves on by one card.
 *
 * A review is a paragraph, not a headline, so this is set for reading one
 * rather than glancing at it. Any interaction starts the wait over again.
 */
export const AUTOPLAY_MS = 6000;

/** How often the autoplay clock checks whether it is time to move. */
const TICK_MS = 250;

/** Quiet time after the last scroll event before the strip counts as settled. */
const SETTLE_MS = 120;

/**
 * Customer reviews in an endless, gently self-advancing strip.
 *
 * ── Why the list is rendered three times ─────────────────────────────────────
 *
 * With only as many reviews as there are cards in view — three on desktop, which
 * is exactly what reviews.json holds today — a plain strip has nowhere to scroll,
 * so autoplay silently did nothing. Laying the list out three times over and
 * working in the middle copy means there is always a next card, and wrapping
 * round is a one-card slide rather than a rewind across the whole strip. When
 * the view drifts into an outer copy, the scroll position jumps back by one
 * copy's width; the copies are identical, so the jump cannot be seen.
 *
 * The outer copies are `inert` and hidden from assistive technology, so a screen
 * reader hears each review once and keyboard focus never lands on a duplicate.
 *
 * ── When it moves ────────────────────────────────────────────────────────────
 *
 * Only while nobody could be reading it: it holds still under a mouse pointer,
 * while a finger is on it, while keyboard focus is inside it, while it is
 * scrolled out of view and while the tab is in the background. It also holds for
 * a full interval after any swipe, dot or arrow key, so it never snatches a card
 * away straight after the visitor picked it. A visitor whose system asks for
 * reduced motion gets no autoplay at all; swiping and the dots still move it.
 *
 * There are deliberately no arrow or pause buttons on screen — the client wanted
 * the strip clean. Holding still under the pointer, finger or keyboard focus is
 * what stands in for a pause control.
 */
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
               (pointerenter)="onPointer($event, true)" (pointerleave)="onPointer($event, false)"
               (focusin)="onFocusIn($event)" (focusout)="onFocusOut($event)">

            <!-- aria-live follows the APG carousel pattern: silent while it moves
                 on its own, polite when it only moves at the visitor's hand. -->
            <div #track class="rm-slider__track" tabindex="0"
                 role="region" aria-roledescription="carousel" aria-label="Customer reviews"
                 [attr.aria-live]="autoplay ? 'off' : 'polite'"
                 (scroll)="onScroll()" (scrollend)="settle()" (keydown)="onKey($event)"
                 (touchstart)="onTouch(true)" (touchend)="onTouch(false)" (touchcancel)="onTouch(false)">
              @for (review of slides(); track $index; let i = $index) {
                <figure class="rm-review rm-slider__slide" role="group" aria-roledescription="slide"
                        [attr.aria-label]="(i % reviews().length + 1) + ' of ' + reviews().length"
                        [attr.aria-hidden]="isCopy(i) || null"
                        [attr.inert]="isCopy(i) ? '' : null">
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

            @if (looping()) {
              <div class="rm-slider__controls">
                <div class="rm-slider__dots">
                  @for (dot of dots(); track dot) {
                    <button type="button" class="rm-slider__dot"
                            [class.is-active]="dot === active()"
                            [attr.aria-current]="dot === active() ? 'true' : null"
                            [attr.aria-label]="'Show review ' + (dot + 1)"
                            (click)="goTo(dot)"></button>
                  }
                </div>
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

  /** One review on its own has nothing to loop to, so it is shown plain. */
  protected readonly looping = computed(() => this.reviews().length > 1);

  /** What is actually laid out: three copies while looping. See the class comment. */
  protected readonly slides = computed(() => {
    const list = this.reviews();
    return this.looping() ? [...list, ...list, ...list] : list;
  });

  /** One dot per review, whatever the number of cards in view. */
  protected readonly dots = computed(() => this.reviews().map((_, i) => i));
  /** The review at the left edge of the strip, 0-based within the list. */
  protected readonly active = signal(0);

  private readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Off for a visitor whose system asks for reduced motion. */
  protected readonly autoplay = !this.reducedMotion;

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Slide index at the left edge, or heading there, counted across every copy. */
  private index = 0;

  // Reasons to hold still. Plain fields: only the autoplay clock reads them.
  private hovered = false;
  private focused = false;
  private touching = false;
  private inView = true;

  /** When autoplay next moves. Pushed back for as long as anything holds it. */
  private nextAt = Date.now() + AUTOPLAY_MS;
  private settleTimer: ReturnType<typeof setTimeout> | undefined;
  /** Until when a slide started by `moveTo` may still be on its way. */
  private slidingUntil = 0;
  /** How many times in a row `settle` has found the strip between two cards. */
  private settleTries = 0;

  constructor() {
    const clock = setInterval(() => this.tick(), TICK_MS);
    const onResize = () => this.align();
    window.addEventListener('resize', onResize, { passive: true });

    // No point moving a strip nobody can see, and arriving at the section should
    // show the first review for a full interval rather than mid-slide.
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(
        ([entry]) => (this.inView = entry.isIntersecting),
        { rootMargin: '-15% 0px' },
      );
      observer.observe(this.host.nativeElement);
    }

    inject(DestroyRef).onDestroy(() => {
      clearInterval(clock);
      clearTimeout(this.settleTimer);
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
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

  /** Whether slide `i` belongs to one of the two outer, decorative copies. */
  protected isCopy(i: number): boolean {
    const count = this.reviews().length;
    return this.looping() && (i < count || i >= count * 2);
  }

  /** Next or previous, wrapping round endlessly. */
  protected step(delta: number): void {
    this.holdOff();
    this.moveTo(this.index + delta);
  }

  protected goTo(dot: number): void {
    this.holdOff();
    this.moveTo(this.looping() ? this.reviews().length + dot : dot);
  }

  /** Keeps the dots in step while the strip moves, however it was moved. */
  protected onScroll(): void {
    const track = this.track()?.nativeElement;
    const stride = this.stride(track);
    if (!track || !stride) return;

    const count = this.reviews().length;
    const at = Math.round(track.scrollLeft / stride);
    this.active.set(this.looping() ? mod(at, count) : 0);

    // `scrollend` is not everywhere yet, so a short quiet spell stands in for it.
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.settle(), SETTLE_MS);
  }

  /**
   * Once the strip comes to rest, moves it back into the middle copy if it has
   * drifted out, so there is always a full copy's worth of cards either side.
   */
  protected settle(): void {
    clearTimeout(this.settleTimer);
    const track = this.track()?.nativeElement;
    const stride = this.stride(track);
    // Never under a finger: moving the strip mid-gesture fights the swipe.
    if (!track || !stride || this.touching) return;
    // Nor mid-slide. Some engines report a pause, or a `scrollend` for the
    // invisible jump, before a smooth slide has arrived; recentring then would
    // cut the slide short. The deadline stops a swipe that took over from a
    // slide from being ignored for good.
    const arrived = Math.abs(track.scrollLeft - this.index * stride) < 2;
    if (!arrived && Date.now() < this.slidingUntil) return;

    // A released swipe can still be snapping onto a card. Jumping by a copy's
    // width now would strand the strip between two cards — seen in Chrome — so
    // wait for the snap to land, and finish it here if the browser never does.
    const nearest = Math.round(track.scrollLeft / stride);
    if (Math.abs(track.scrollLeft - nearest * stride) > 2) {
      if (++this.settleTries < 8) {
        this.settleTimer = setTimeout(() => this.settle(), SETTLE_MS);
      } else {
        this.settleTries = 0;
        this.moveTo(nearest);
      }
      return;
    }
    this.settleTries = 0;

    this.index = nearest;
    if (this.looping()) this.recentre(track, stride);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    this.step(event.key === 'ArrowRight' ? 1 : -1);
  }

  /**
   * A mouse over the strip means someone is reading. Touch and pen are left to
   * `onTouch`: a tap also fires `pointerenter`, but its `pointerleave` does not
   * come until the finger taps somewhere else — which used to leave autoplay
   * switched off for good after the first touch on a phone.
   */
  protected onPointer(event: PointerEvent, over: boolean): void {
    if (event.pointerType === 'mouse') this.hovered = over;
  }

  protected onTouch(down: boolean): void {
    this.touching = down;
    if (down) return;
    this.holdOff();
    this.settleTimer = setTimeout(() => this.settle(), SETTLE_MS);
  }

  /**
   * Keyboard focus inside holds it still. A mouse click on an arrow also leaves
   * focus on the arrow, but that visitor already paused it by hovering, and it
   * should pick up again once they move away — so only visible focus counts.
   */
  protected onFocusIn(event: FocusEvent): void {
    const target = event.target as Element | null;
    try {
      this.focused = !!target?.matches(':focus-visible');
    } catch {
      this.focused = true;
    }
  }

  /** Only resume once focus has left the slider entirely. */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !(event.currentTarget as HTMLElement).contains(next)) this.focused = false;
  }

  private async load(): Promise<void> {
    try {
      // no-cache: revalidate with the server on each visit, so an edit made in
      // cPanel shows up straight away rather than when the browser cache expires.
      const response = await fetch(new URL(REVIEWS_URL, document.baseURI), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = parseReviews(await response.json());
      if (!parsed.length) throw new Error('no usable reviews in the file');
      this.reviews.set(parsed);
    } catch (error) {
      console.error(`Could not load reviews from ${REVIEWS_URL}. Is the JSON valid? Showing the built-in reviews.`, error);
      this.reviews.set(REVIEWS);
    }
    this.index = this.looping() ? this.reviews().length : 0;
    afterNextRender(() => this.align(), { injector: this.injector });
  }

  private tick(): void {
    const now = Date.now();
    const held =
      !this.autoplay || !this.looping() ||
      this.hovered || this.focused || this.touching || !this.inView ||
      document.hidden;

    if (held) {
      this.nextAt = now + AUTOPLAY_MS;
    } else if (now >= this.nextAt) {
      this.nextAt = now + AUTOPLAY_MS;
      this.moveTo(this.index + 1);
    }
  }

  /** Gives the visitor a full interval with whatever they just chose. */
  private holdOff(): void {
    this.nextAt = Date.now() + AUTOPLAY_MS;
  }

  private moveTo(target: number): void {
    const track = this.track()?.nativeElement;
    const stride = this.stride(track);
    if (!track || !stride) return;

    const count = this.reviews().length;
    if (this.looping()) {
      // About to run off the middle copy: jump back by one copy first, invisibly,
      // then slide on from there. Taken from where the strip is right now, so a
      // second press while the first slide is still moving stays smooth too.
      if (target < count || target >= count * 2) {
        const shift = target < count ? count : -count;
        track.scrollLeft += shift * stride;
        target += shift;
      }
    } else {
      target = Math.max(0, Math.min(target, this.slides().length - 1));
    }

    this.index = target;
    this.active.set(mod(target, count));
    this.slidingUntil = Date.now() + 1000;
    track.scrollTo({ left: target * stride, behavior: this.reducedMotion ? 'auto' : 'smooth' });
  }

  /** Puts the strip exactly on the current card, after loading or a resize. */
  private align(): void {
    const track = this.track()?.nativeElement;
    const stride = this.stride(track);
    if (!track || !stride) return;
    track.scrollLeft = this.index * stride;
    this.active.set(mod(this.index, this.reviews().length));
  }

  private recentre(track: HTMLElement, stride: number): void {
    const count = this.reviews().length;
    if (this.index >= count && this.index < count * 2) return;
    const shift = this.index < count ? count : -count;
    this.index += shift;
    track.scrollLeft += shift * stride;
  }

  /** Distance from one card's left edge to the next: card width plus the gap. */
  private stride(track: HTMLElement | undefined): number {
    const slides = track?.children;
    if (!slides?.length) return 0;
    if (slides.length === 1) return (slides[0] as HTMLElement).offsetWidth;
    return (slides[1] as HTMLElement).offsetLeft - (slides[0] as HTMLElement).offsetLeft;
  }
}

/** Remainder that stays positive, so review -1 is the last one, not an error. */
function mod(value: number, count: number): number {
  return count ? ((value % count) + count) % count : 0;
}

/**
 * The JSON is edited by hand, so accept either `{ "reviews": [...] }` or a bare
 * array, and skip any entry missing its text or name rather than showing a
 * broken card.
 */
export function parseReviews(data: unknown): Testimonial[] {
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
