import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  InjectionToken,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon';
import { TawkService } from '../../core/tawk.service';
import { EstimateService } from '../../core/estimate.service';
import { SITE } from '../../core/site.config';

/**
 * How long after the page opens before the pop-up slides in.
 *
 * Long enough that the visitor has seen what the site is before being asked
 * anything, and that the pop-up is not competing with the page's own first paint.
 */
export const CONTACT_POPUP_DELAY = new InjectionToken<number>('CONTACT_POPUP_DELAY', {
  providedIn: 'root',
  factory: () => 4000,
});

/**
 * The greeting for an hour of the visitor's day, 0–23.
 *
 * The small hours get a plain "Hello": "Good evening" at 2 am reads as a bot
 * that does not know what time it is, which is exactly what it would be.
 */
export function greetingFor(hour: number): string {
  if (hour < 5) return 'Hello';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * The "Good morning — Contact Us" card, and the "Text us" button that brings it
 * back.
 *
 * The card slides in by itself a few seconds into every page load. Closing it
 * leaves a floating "Text us" button in the corner, which reopens it; the two
 * swap places, so only one is ever on screen. It stays out of the way of the
 * estimate form — if that is open when the timer runs out, the card is skipped
 * on that load and the button appears straight away instead.
 *
 * Once the visitor has opened the chat, the button steps aside for tawk.to's own
 * bubble, which is where the conversation and its unread replies live. See
 * `TawkService.handedOff`.
 */
@Component({
  selector: 'rm-contact-popup',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <!-- Non-modal: it neither traps focus nor takes it when it appears on its
           own, since it arrives unprompted and must not pull a visitor out of
           what they are reading. Escape still closes it once focus is inside. -->
      <aside
        class="rm-chatpop"
        role="dialog"
        aria-modal="false"
        aria-labelledby="rm-chatpop-title"
        (keydown.escape)="dismiss()">

        <button type="button" class="rm-chatpop__close" (click)="dismiss()" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>

        <div class="rm-chatpop__avatar">
          <img src="/images/site-icon.png" alt="" width="56" height="56">
          <!-- Only when tawk.to says someone is actually there to answer. -->
          @if (tawk.status() === 'online') {
            <span class="rm-chatpop__online">
              <span class="rm-screen-reader-text">We're online now</span>
            </span>
          }
        </div>

        <p class="rm-chatpop__title" id="rm-chatpop-title">
          {{ greeting() }} <span aria-hidden="true">👋</span>
        </p>
        <p class="rm-chatpop__text">
          Welcome to {{ site.name }}! Send us a message and we'll get back to you as
          soon as we can.
        </p>

        <button #cta type="button" class="rm-btn rm-btn--primary rm-chatpop__cta" (click)="contact()">
          <span class="rm-btn__icon"><rm-icon name="chat" /></span>
          Contact Us
        </button>
      </aside>
    }

    @if (launcherVisible()) {
      <button #launcher type="button" class="rm-chatlaunch" aria-haspopup="dialog" (click)="reopen()">
        <rm-icon name="chat" />
        <span>Text us</span>
      </button>
    }
  `,
})
export class ContactPopupComponent {
  protected readonly site = SITE;
  protected readonly tawk = inject(TawkService);
  private readonly estimate = inject(EstimateService);
  private readonly delay = inject(CONTACT_POPUP_DELAY);
  private readonly injector = inject(Injector);

  private readonly cta = viewChild<ElementRef<HTMLButtonElement>>('cta');
  private readonly launcher = viewChild<ElementRef<HTMLButtonElement>>('launcher');

  protected readonly visible = signal(false);
  protected readonly greeting = signal(greetingFor(new Date().getHours()));

  /** Set when the timer runs out, whether or not the card was shown then. */
  private readonly started = signal(false);

  /**
   * The corner button, whenever the card is not showing — except before the
   * card's first chance to appear, and after the chat has taken over.
   */
  protected readonly launcherVisible = computed(
    () => this.started() && !this.visible() && !this.tawk.handedOff(),
  );

  constructor() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    afterNextRender(() => {
      timer = setTimeout(() => this.appear(), this.delay);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  /**
   * Also the moment tawk.to starts loading, whether or not the card shows. That
   * keeps a ~200 KB third-party script off the critical path of the first paint,
   * while still having the chat ready by the time anyone could press the button.
   */
  private appear(): void {
    this.tawk.load();
    this.started.set(true);
    if (this.estimate.isOpen()) return;
    this.show();
  }

  protected dismiss(): void {
    this.visible.set(false);
    this.focusAfterRender(() => this.launcher());
  }

  protected reopen(): void {
    this.show();
    this.focusAfterRender(() => this.cta());
  }

  /**
   * Opens the chat. When it cannot open — not configured yet, blocked, or too
   * slow — the estimate form opens instead, which reaches the same business.
   */
  protected contact(): void {
    this.visible.set(false);
    this.tawk.open(() => this.estimate.open());
  }

  private show(): void {
    // Read at the moment of showing, from the visitor's own clock, so the
    // greeting matches their morning rather than the server's or the page's.
    this.greeting.set(greetingFor(new Date().getHours()));
    this.visible.set(true);
  }

  /**
   * The card and the button each leave the page when the other arrives, so a
   * keyboard user's focus would otherwise drop back to the top of the document.
   * Moving it to whichever took its place keeps them where they were.
   */
  private focusAfterRender(target: () => ElementRef<HTMLElement> | undefined): void {
    afterNextRender(() => target()?.nativeElement.focus(), { injector: this.injector });
  }
}
