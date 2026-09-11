import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TAWK_OPEN_TIMEOUT, TawkService, tawkWidgetPath } from './tawk.service';
import { environment } from '../../environments/environment';

describe('tawkWidgetPath', () => {
  it('accepts every shape the tawk.to dashboard shows the widget in', () => {
    expect(tawkWidgetPath('64f0a1b2c3d4e5f6a7b8c9d0/1h9abcdef')).toBe('64f0a1b2c3d4e5f6a7b8c9d0/1h9abcdef');
    expect(tawkWidgetPath('https://embed.tawk.to/64f0a1b2c3d4e5f6a7b8c9d0/1h9abcdef')).toBe(
      '64f0a1b2c3d4e5f6a7b8c9d0/1h9abcdef',
    );
    expect(tawkWidgetPath('https://tawk.to/chat/64f0a1b2c3d4e5f6a7b8c9d0/1h9abcdef')).toBe(
      '64f0a1b2c3d4e5f6a7b8c9d0/1h9abcdef',
    );
    expect(tawkWidgetPath('  64f0a1b2c3d4e5f6a7b8c9d0/default/  ')).toBe('64f0a1b2c3d4e5f6a7b8c9d0/default');
    // Exactly as the dashboard's direct chat link is copied, query string and all.
    expect(tawkWidgetPath('https://tawk.to/chat/6aa3a97b279bff344394a8e7/1k27ks3i3?layout=modern')).toBe(
      '6aa3a97b279bff344394a8e7/1k27ks3i3',
    );
  });

  it('treats anything else as not configured', () => {
    expect(tawkWidgetPath('')).toBeNull();
    // A property ID alone: the easy mistake, since it is the longer half.
    expect(tawkWidgetPath('6aa3a97b279bff344394a8e7')).toBeNull();
    expect(tawkWidgetPath('https://example.com/64f0/1h9')).toBeNull();
    expect(tawkWidgetPath('64f0/1h9"><script>')).toBeNull();
  });
});

describe('TawkService', () => {
  // The environment object is typed readonly, but that is a compile-time lock
  // only, so a test can stand in whichever widget it needs.
  const env = environment as unknown as { tawk: string };
  const configured = env.tawk;
  const PATH = '64f0a1b2c3d4e5f6a7b8c9d0/1h9abcdef';

  const script = () => document.querySelector<HTMLScriptElement>('script[src^="https://embed.tawk.to/"]');
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  /** The service reads the environment when it is built, so set it first. */
  function service(tawk: string, timeout = 50): TawkService {
    env.tawk = tawk;
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: TAWK_OPEN_TIMEOUT, useValue: timeout }],
    });
    return TestBed.inject(TawkService);
  }

  /** What tawk.to's script puts on the global once it has run. */
  function arrive(status: 'online' | 'offline' = 'online') {
    const api = window.Tawk_API!;
    api.showWidget = vi.fn();
    api.hideWidget = vi.fn();
    api.maximize = vi.fn();
    api.getStatus = () => status;
    api.onLoad!();
    return api;
  }

  beforeEach(() => {
    delete window.Tawk_API;
  });

  afterEach(() => {
    env.tawk = configured;
    vi.restoreAllMocks();
    delete window.Tawk_API;
    document.querySelectorAll('script[src^="https://embed.tawk.to/"]').forEach((el) => el.remove());
  });

  it('stays off, and falls straight back, when no widget is configured', () => {
    const tawk = service('');
    const fallback = vi.fn();

    tawk.open(fallback);

    expect(tawk.state()).toBe('off');
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(script()).toBeNull();
  });

  it('says so in the console when the widget is set but unusable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const tawk = service('6aa3a97b279bff344394a8e7');

    expect(tawk.state()).toBe('off');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('6aa3a97b279bff344394a8e7');
  });

  it('stays quiet when the chat is simply switched off', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    service('');

    expect(warn).not.toHaveBeenCalled();
  });

  it('loads the documented embed script, and only once', () => {
    const tawk = service(PATH);

    tawk.load();
    tawk.load();

    expect(document.querySelectorAll('script[src^="https://embed.tawk.to/"]')).toHaveLength(1);
    expect(script()?.src).toBe(`https://embed.tawk.to/${PATH}`);
    expect(tawk.state()).toBe('loading');
  });

  it('keeps its own bubble hidden until the chat has been opened', () => {
    const tawk = service(PATH);

    tawk.load();
    const api = arrive();

    // One floating button at a time: until there is a conversation, the site's
    // "Text us" button is the way in, not tawk.to's bubble.
    expect(api.hideWidget).toHaveBeenCalled();
    expect(api.showWidget).not.toHaveBeenCalled();
    expect(tawk.handedOff()).toBe(false);
  });

  it('opens the chat the moment it arrives when Contact Us was pressed first', () => {
    const tawk = service(PATH);
    const fallback = vi.fn();

    tawk.open(fallback);
    const api = arrive('online');

    expect(api.showWidget).toHaveBeenCalled();
    expect(api.maximize).toHaveBeenCalled();
    expect(api.hideWidget).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();
    expect(tawk.state()).toBe('ready');
    expect(tawk.status()).toBe('online');
    // From here on tawk.to's bubble, with its unread badge, is the way back in.
    expect(tawk.handedOff()).toBe(true);
  });

  it('counts a chat that tawk.to opened by itself as a hand-off', () => {
    const tawk = service(PATH);

    tawk.load();
    const api = arrive();
    api.onChatMaximized!();

    expect(tawk.handedOff()).toBe(true);
  });

  it('falls back when tawk.to is blocked, then and on every later press', () => {
    const tawk = service(PATH);
    const first = vi.fn();

    tawk.open(first);
    script()!.dispatchEvent(new Event('error'));

    expect(first).toHaveBeenCalledTimes(1);
    expect(tawk.state()).toBe('failed');
    expect(tawk.handedOff()).toBe(false);

    const second = vi.fn();
    tawk.open(second);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('falls back when tawk.to never answers, and does not open late on top', async () => {
    const tawk = service(PATH, 20);
    const fallback = vi.fn();

    tawk.open(fallback);
    await sleep(40);
    expect(fallback).toHaveBeenCalledTimes(1);

    // The script turning up after the visitor has moved on must not spring the
    // chat open over whatever they are doing now.
    const api = arrive();
    expect(api.maximize).not.toHaveBeenCalled();
    expect(api.hideWidget).toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledTimes(1);
  });
});
