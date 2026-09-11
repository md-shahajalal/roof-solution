import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTACT_POPUP_DELAY, ContactPopupComponent, greetingFor } from './contact-popup';
import { EstimateService } from '../../core/estimate.service';
import { TawkService } from '../../core/tawk.service';
import { environment } from '../../../environments/environment';

describe('greetingFor', () => {
  it('follows the visitor through their day', () => {
    expect(greetingFor(5)).toBe('Good morning');
    expect(greetingFor(11)).toBe('Good morning');
    expect(greetingFor(12)).toBe('Good afternoon');
    expect(greetingFor(16)).toBe('Good afternoon');
    expect(greetingFor(17)).toBe('Good evening');
    expect(greetingFor(23)).toBe('Good evening');
  });

  it('says a plain hello in the small hours', () => {
    expect(greetingFor(0)).toBe('Hello');
    expect(greetingFor(4)).toBe('Hello');
  });
});

describe('ContactPopupComponent', () => {
  let fixture: ComponentFixture<ContactPopupComponent>;
  let estimate: EstimateService;

  // Chat forced off, so these tests do not depend on the widget in the
  // development environment file: with no widget, Contact Us must fall back
  // to the form.
  const env = environment as unknown as { tawk: string };
  const configured = env.tawk;

  const DELAY = 50;
  const popup = () => fixture.nativeElement.querySelector('.rm-chatpop') as HTMLElement | null;
  const launcher = () => fixture.nativeElement.querySelector('.rm-chatlaunch') as HTMLElement | null;
  const wait = async (ms: number) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  async function create(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ContactPopupComponent],
      providers: [provideZonelessChangeDetection(), { provide: CONTACT_POPUP_DELAY, useValue: DELAY }],
    }).compileComponents();
    fixture = TestBed.createComponent(ContactPopupComponent);
    estimate = TestBed.inject(EstimateService);
    await fixture.whenStable();
  }

  /** Opens the page and lets the card slide in. */
  async function shown(): Promise<void> {
    await create();
    await wait(DELAY * 2);
  }

  async function close(): Promise<void> {
    (popup()!.querySelector('.rm-chatpop__close') as HTMLElement).click();
    await fixture.whenStable();
  }

  beforeEach(() => {
    env.tawk = '';
  });

  afterEach(() => {
    env.tawk = configured;
    vi.useRealTimers();
    document.body.classList.remove('rm-modal-open');
  });

  it('appears on its own after a moment, with the logo and a Contact Us button', async () => {
    await create();
    expect(popup()).toBeNull();
    // Nothing floats in the corner before the card has had its chance.
    expect(launcher()).toBeNull();

    await wait(DELAY * 2);

    expect(popup()).not.toBeNull();
    expect(popup()!.querySelector('img')?.getAttribute('src')).toBe('/images/site-icon.png');
    expect(popup()!.querySelector('.rm-chatpop__cta')?.textContent).toContain('Contact Us');
    // Card and button swap places: never both.
    expect(launcher()).toBeNull();
  });

  it('appears again every time the site is opened, not just the first', async () => {
    await shown();
    expect(popup()).not.toBeNull();

    await close();
    fixture.destroy();

    // A fresh load of the site is a fresh instance of the component. Nothing
    // from the previous load may keep it away.
    fixture = TestBed.createComponent(ContactPopupComponent);
    await fixture.whenStable();
    await wait(DELAY * 2);

    expect(popup()).not.toBeNull();
  });

  it('greets by the time of day on the visitor’s own clock', async () => {
    // Only Date is faked, so the real timers the component waits on still run.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 11, 9, 30));

    await shown();

    expect(popup()!.querySelector('.rm-chatpop__title')?.textContent).toContain('Good morning');
  });

  it('leaves a floating Text us button behind when closed', async () => {
    await shown();

    await close();

    expect(popup()).toBeNull();
    expect(launcher()).not.toBeNull();
    expect(launcher()!.textContent).toContain('Text us');
    // Focus follows to the button that replaced the card, rather than dropping
    // back to the top of the page.
    expect(document.activeElement).toBe(launcher());
  });

  it('reopens the card from the Text us button', async () => {
    await shown();
    await close();

    launcher()!.click();
    await fixture.whenStable();

    expect(popup()).not.toBeNull();
    expect(launcher()).toBeNull();
    expect(document.activeElement).toBe(popup()!.querySelector('.rm-chatpop__cta'));
  });

  it('closes on Escape too, leaving the button behind', async () => {
    await shown();

    popup()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(popup()).toBeNull();
    expect(launcher()).not.toBeNull();
  });

  it('opens the estimate form when the chat is not available', async () => {
    await shown();

    (popup()!.querySelector('.rm-chatpop__cta') as HTMLElement).click();
    await fixture.whenStable();

    // The button always does something: no chat, so the same business is
    // reached through the form instead.
    expect(popup()).toBeNull();
    expect(estimate.isOpen()).toBe(true);
    // And the way back is there once the form closes.
    expect(launcher()).not.toBeNull();
  });

  it('skips the card when the estimate form is open, but still offers the button', async () => {
    await create();
    estimate.open();
    await wait(DELAY * 2);

    expect(popup()).toBeNull();
    expect(launcher()).not.toBeNull();
  });

  it('steps aside for tawk.to’s bubble once the chat has been opened', async () => {
    await shown();

    // What TawkService records when the chat window opens.
    TestBed.inject(TawkService).handedOff.set(true);
    await close();

    expect(launcher()).toBeNull();
  });

  it('shows the online dot only when tawk.to says someone is there', async () => {
    await shown();
    const tawk = TestBed.inject(TawkService);

    expect(popup()!.querySelector('.rm-chatpop__online')).toBeNull();

    tawk.status.set('online');
    await fixture.whenStable();
    expect(popup()!.querySelector('.rm-chatpop__online')).not.toBeNull();

    tawk.status.set('offline');
    await fixture.whenStable();
    expect(popup()!.querySelector('.rm-chatpop__online')).toBeNull();
  });
});
