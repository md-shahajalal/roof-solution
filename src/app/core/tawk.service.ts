import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';

/** What tawk.to reports about whoever would answer the chat. */
export type TawkStatus = 'online' | 'away' | 'offline';

/**
 * How long "Contact Us" waits for tawk.to before giving up and falling back.
 *
 * The script is loaded in the background a few seconds after the page opens, so
 * this usually never comes into play. It matters when the visitor is on a slow
 * connection, or when a content blocker quietly swallows the request — which is
 * common for chat widgets — and neither `load` nor `error` ever fires.
 */
export const TAWK_OPEN_TIMEOUT = new InjectionToken<number>('TAWK_OPEN_TIMEOUT', {
  providedIn: 'root',
  factory: () => 8000,
});

/** The parts of tawk.to's documented JavaScript API this site uses. */
interface TawkApi {
  onBeforeLoad?: () => void;
  onLoad?: () => void;
  onStatusChange?: (status: TawkStatus) => void;
  hideWidget?: () => void;
  showWidget?: () => void;
  maximize?: () => void;
  getStatus?: () => TawkStatus;
  customStyle?: {
    visibility: Record<'desktop' | 'mobile', { position: 'br'; xOffset: number; yOffset: number }>;
  };
}

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

type TawkState = 'off' | 'idle' | 'loading' | 'ready' | 'failed';

/**
 * Turns the environment's `tawk` value into `propertyId/widgetId`.
 *
 * tawk.to shows the same pair in three shapes depending on where you look in the
 * dashboard — the embed script's src, the direct chat link, or the bare pair —
 * so all three are accepted rather than making someone work out which one this
 * wanted. The direct chat link arrives with `?layout=modern` or similar on the
 * end, which is display state for that page and is dropped. Anything else is
 * treated as not configured.
 */
export function tawkWidgetPath(value: string): string | null {
  const match = /^(?:https?:\/\/(?:embed\.)?tawk\.to\/(?:chat\/)?)?([A-Za-z0-9]+)\/([A-Za-z0-9]+)\/?(?:[?#].*)?$/.exec(
    value.trim(),
  );
  return match ? `${match[1]}/${match[2]}` : null;
}

/**
 * Loads tawk.to, shows or hides its chat icon, and opens its chat on request.
 *
 * tawk.to delivers messages to its own inbox and phone app, which pushes a
 * notification the moment one arrives. It does not send them to a phone number;
 * that would take a separate SMS service bolted on through Make or Zapier.
 *
 * Every way the chat can be unavailable — not configured, blocked, or too slow —
 * ends in the same place for "Contact Us": the caller's fallback runs. A button
 * that silently does nothing is the one outcome that must not happen.
 */
@Injectable({ providedIn: 'root' })
export class TawkService {
  private readonly timeout = inject(TAWK_OPEN_TIMEOUT);
  private readonly path = tawkWidgetPath(environment.tawk);

  readonly state = signal<TawkState>(this.path ? 'idle' : 'off');

  /** `null` until tawk.to has said. Drives the greeting card's "online" dot. */
  readonly status = signal<TawkStatus | null>(null);

  /**
   * Whether tawk.to's chat icon should be on screen.
   *
   * It is the site's way back into the chat, so it is on by default. The greeting
   * card switches it off while the card is showing, because both sit in the
   * bottom-right corner and would overlap.
   */
  private iconWanted = true;

  /**
   * Whether a full-screen dialog — the estimate form — is covering the page.
   *
   * Kept apart from `iconWanted` because the two are owned by different things
   * and overlap in time: the form can open while the greeting card is up, or
   * the card's Contact Us can fall back to opening the form. With one shared
   * switch, whichever closed first would bring the icon back under the other.
   * tawk.to draws above every z-index on the page, so while this is set the
   * whole widget — icon and any open chat window — is hidden, and it comes back
   * exactly as it was when the dialog closes.
   */
  private covered = false;

  /** A "Contact Us" press waiting for the script, and what to do if it never comes. */
  private pending: (() => void) | null = null;
  private deadline: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // A value that is set but unusable is a mistake, not a decision to turn the
    // chat off — a bare property ID being the usual one. Say so, rather than let
    // "Contact Us" quietly fall back to the form and leave nobody the wiser.
    if (environment.tawk.trim() && !this.path) {
      console.warn(
        `tawk.to: "${environment.tawk}" is not a usable widget link, so the chat is off. ` +
          'Use "propertyId/widgetId" or the whole link from tawk.to > Administration > ' +
          'Channels > Chat Widget.',
      );
    }
  }

  /** Starts the script download. Safe to call repeatedly; only the first counts. */
  load(): void {
    if (!this.path || this.state() !== 'idle') return;
    this.state.set('loading');

    // tawk.to's snippet expects these globals to exist before its script runs,
    // and reads the callbacks off them when it does.
    const api: TawkApi = (window.Tawk_API = window.Tawk_API ?? {});
    window.Tawk_LoadStart = new Date();

    // On phones the site pins a Call / Free estimate bar to the bottom of the
    // screen (ActionDockComponent), so the chat icon is lifted clear of it.
    // tawk.to reads this once, when its script starts.
    api.customStyle = {
      visibility: {
        desktop: { position: 'br', xOffset: 20, yOffset: 20 },
        mobile: { position: 'br', xOffset: 16, yOffset: 84 },
      },
    };

    // Hide before tawk.to draws anything. tawk.to renders its widget visible
    // first and only calls onLoad afterwards, so hiding there alone left the
    // icon on screen under the greeting card for about two seconds (measured in
    // a real browser). onBeforeLoad runs once the API exists but before render.
    api.onBeforeLoad = () => {
      if (!this.shouldShow()) api.hideWidget?.();
    };

    api.onLoad = () => {
      this.state.set('ready');
      this.status.set(api.getStatus?.() ?? null);
      if (this.pending) {
        this.settle();
        this.reveal();
      } else {
        this.applyIcon();
      }
    };
    api.onStatusChange = (status) => this.status.set(status);

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://embed.tawk.to/${this.path}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    script.onerror = () => {
      this.state.set('failed');
      this.giveUp();
    };
    document.body.append(script);
  }

  /**
   * Shows or hides tawk.to's chat icon. Before the script has arrived this just
   * records the choice, and it is applied the moment tawk.to loads.
   */
  setIconVisible(visible: boolean): void {
    this.iconWanted = visible;
    if (this.state() === 'ready') this.applyIcon();
  }

  /**
   * Hides the whole widget while a dialog covers the page, and restores it when
   * the dialog closes. Recorded before the script arrives, like the icon.
   */
  setCovered(covered: boolean): void {
    this.covered = covered;
    if (this.state() === 'ready') this.applyIcon();
  }

  /**
   * Opens the chat window, or runs `fallback` if that is not going to happen.
   *
   * Pressed before the script has arrived, this waits for it — up to
   * `TAWK_OPEN_TIMEOUT` — rather than failing straight away.
   */
  open(fallback: () => void): void {
    const state = this.state();
    if (state === 'off' || state === 'failed') {
      fallback();
      return;
    }
    if (state === 'ready') {
      this.reveal();
      return;
    }

    this.pending = fallback;
    clearTimeout(this.deadline);
    this.deadline = setTimeout(() => this.giveUp(), this.timeout);
    this.load();
  }

  private shouldShow(): boolean {
    return this.iconWanted && !this.covered;
  }

  private applyIcon(): void {
    if (this.shouldShow()) window.Tawk_API?.showWidget?.();
    else window.Tawk_API?.hideWidget?.();
  }

  private reveal(): void {
    this.iconWanted = true;
    // Contact Us pressed, then the form opened before tawk.to arrived: the chat
    // must not spring open on top of an enquiry in progress. It is there, with
    // its icon, once the form closes.
    if (this.covered) {
      window.Tawk_API?.hideWidget?.();
      return;
    }
    window.Tawk_API?.showWidget?.();
    window.Tawk_API?.maximize?.();
  }

  /** Forgets a waiting press without running its fallback. */
  private settle(): void {
    clearTimeout(this.deadline);
    this.pending = null;
  }

  private giveUp(): void {
    const fallback = this.pending;
    this.settle();
    fallback?.();
  }
}
