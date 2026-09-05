import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/**
 * Tracks which in-page section is currently in view and exposes it as a signal.
 *
 * Why an IntersectionObserver rather than a scroll handler: the callback only
 * fires when a boundary is actually crossed, so there is no work on every scroll
 * frame and no throttling to tune.
 *
 * The observer uses a thin horizontal band across the middle of the viewport
 * (`rootMargin` collapses the top 45% and bottom 50%). A section counts as
 * current once it crosses that band, which matches what a reader perceives as
 * "the part I am looking at" far better than "the topmost visible pixel".
 */
@Injectable({ providedIn: 'root' })
export class ScrollSpyService {
  private readonly destroyRef = inject(DestroyRef);

  private readonly activeId = signal<string>('');
  /** Id of the section currently in view, or '' before the first match. */
  readonly active = this.activeId.asReadonly();

  private observer?: IntersectionObserver;
  private frame = 0;
  private readonly visible = new Set<string>();
  private order: readonly string[] = [];

  /**
   * True while the page is scrolled to the very bottom.
   *
   * The last section is the footer. Once the page bottoms out it sits *below*
   * the detection band and can never cross it, so without this the highlight
   * stays stuck on the second-to-last section no matter how far you scroll.
   * While pinned, the observer is not allowed to override the choice.
   */
  private pinnedToBottom = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.stop());
  }

  /**
   * Begin tracking the given element ids, in document order.
   *
   * The home page is lazy-loaded, so its sections may not exist yet when the
   * header initialises. Rather than guess a delay, retry on animation frames
   * until they appear, then give up quietly.
   */
  watch(ids: readonly string[]): void {
    if (typeof IntersectionObserver === 'undefined') return; // SSR / very old browser

    this.order = ids;
    this.attach(ids, 0);
  }

  /** Set the active section directly — used so a nav click responds instantly. */
  select(id: string): void {
    this.activeId.set(id);
  }

  private attach(ids: readonly string[], attempt: number): void {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    // Roughly one second of frames, then settle for whatever exists.
    if (elements.length < ids.length && attempt < 60) {
      this.frame = requestAnimationFrame(() => this.attach(ids, attempt + 1));
      return;
    }
    if (!elements.length) return;

    this.stop();
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) this.visible.add(entry.target.id);
          else this.visible.delete(entry.target.id);
        }

        // Two sections can straddle the band at once. Resolving in document
        // order keeps the highlight from flickering between them.
        if (this.pinnedToBottom) return;
        const current = this.order.find((id) => this.visible.has(id));
        if (current) this.activeId.set(current);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );

    elements.forEach((el) => this.observer!.observe(el));
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.onScroll();

    // Nothing has crossed the band yet on first paint, so seed the top section.
    if (!this.activeId()) this.activeId.set(ids[0]);
  }

  /**
   * Handles only the bottom-of-page case; everything else is the observer's job.
   * A couple of arithmetic operations per scroll event, so it stays passive and
   * does not need throttling.
   */
  private readonly onScroll = (): void => {
    const doc = document.documentElement;
    const atBottom = window.innerHeight + Math.ceil(window.scrollY) >= doc.scrollHeight - 2;

    if (atBottom) {
      this.pinnedToBottom = true;
      const last = this.order.at(-1);
      if (last) this.activeId.set(last);
      return;
    }

    if (this.pinnedToBottom) {
      this.pinnedToBottom = false;
      // Hand control back to whatever is crossing the band right now.
      const current = this.order.find((id) => this.visible.has(id));
      if (current) this.activeId.set(current);
    }
  };

  private stop(): void {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.observer = undefined;
    window.removeEventListener('scroll', this.onScroll);
    this.visible.clear();
    this.pinnedToBottom = false;
  }
}
