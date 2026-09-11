import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * Inline SVG icons.
 *
 * The markup is written literally in the template rather than injected as a
 * string. Angular compiles it ahead of time, so there is no `innerHTML`, no
 * `DomSanitizer.bypassSecurityTrust*`, and no runtime SVG parsing — the class of
 * problem behind CVE-2025-66412 simply has no surface here.
 *
 * Icons inherit `fill: currentColor`, so colour is set by the parent.
 */
@Component({
  selector: 'rm-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (name()) {
      @case ('phone') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>
      }
      @case ('check') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>
      }
      @case ('star') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M12 17.3 18.2 21l-1.7-7 5.5-4.8-7.2-.6L12 2 9.2 8.6 2 9.2l5.5 4.8-1.7 7z"/></svg>
      }
      @case ('play') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"/></svg>
      }
      @case ('chevron') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M10 6 8.6 7.4 13.2 12l-4.6 4.6L10 18l6-6z"/></svg>
      }
      @case ('calendar') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
      }
      @case ('house') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
      }
      @case ('search') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 13.7 14.4l.3.3v.8l5 5L20.5 19l-5-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>
      }
      @case ('shield') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M12 1 3 5v6c0 5.6 3.8 10.7 9 12 5.2-1.3 9-6.4 9-12V5l-9-4zm-2 16-4-4 1.4-1.4L10 14.2l6.6-6.6L18 9l-8 8z"/></svg>
      }
      @case ('team') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M12 12.8c1.6 0 3 .4 4.2.9a3 3 0 0 1 1.8 2.7V18H6v-1.6a3 3 0 0 1 1.8-2.7c1.2-.5 2.6-.9 4.2-.9zM4 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm1.1 1.1A6.9 6.9 0 0 0 4 14a7 7 0 0 0-2.8.6A2 2 0 0 0 0 16.4V18h4.5v-1.6c0-.8.2-1.6.6-2.3zM20 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm4 3.4c0-.8-.5-1.5-1.2-1.8A7 7 0 0 0 20 14c-.4 0-.8 0-1.1.1.4.7.6 1.5.6 2.3V18H24v-1.6zM12 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>
      }
      @case ('clock') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7z"/></svg>
      }
      @case ('wrench') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M22.7 19l-9.1-9.1a5.6 5.6 0 0 0-1.5-6.9 5.7 5.7 0 0 0-7.4-1.3L9 6 6 9 1.6 4.7a5.7 5.7 0 0 0 1.3 7.4 5.6 5.6 0 0 0 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>
      }
      @case ('hammer') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M4.4 17.3 2.9 18.8a2 2 0 0 0 0 2.8l.5.5a2 2 0 0 0 2.8 0l1.5-1.5-3.3-3.3zM6 15.7l3.3 3.3 6.5-6.5-3.3-3.3-6.5 6.5zM21.4 5.6l-3-3a1 1 0 0 0-1.1-.2l-4.6 2a1 1 0 0 0-.3 1.6l1 1-1.1 1.1 3.3 3.3 1.1-1.1 1 1a1 1 0 0 0 1.6-.3l2-4.6a1 1 0 0 0-.2-1.1z"/></svg>
      }
      @case ('medal') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M12 2a6 6 0 1 0 0 12A6 6 0 0 0 12 2zm0 2.6 1.2 2.5 2.7.4-2 1.9.5 2.7L12 10.8 9.6 12l.5-2.7-2-1.9 2.7-.4L12 4.6zM7.6 15.1 5 22l4.2-1.6L11 22v-5.7a7.9 7.9 0 0 1-3.4-1.2zm8.8 0a7.9 7.9 0 0 1-3.4 1.2V22l1.8-1.6L19 22l-2.6-6.9z"/></svg>
      }
      @case ('storm') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M19.4 8A7.5 7.5 0 0 0 6.1 6.6 6 6 0 0 0 6 18.5h1.9l1.4-3.5H6.8l5.4-6.5-1.5 4.5h3l-2.2 5.5h4.3L19 15h-1.6l1.6-2.5h.7a2.5 2.5 0 0 0 .3-4.5z"/></svg>
      }
      @case ('quote') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M7.2 6C4.9 7.5 3.6 9.9 3.6 12.7c0 2.9 1.7 5 4.2 5 2 0 3.5-1.5 3.5-3.4 0-1.9-1.3-3.3-3.1-3.3-.4 0-.8 0-1.1.2.4-1.6 1.6-3 3.3-4L7.2 6zm9.2 0c-2.3 1.5-3.6 3.9-3.6 6.7 0 2.9 1.7 5 4.2 5 2 0 3.5-1.5 3.5-3.4 0-1.9-1.3-3.3-3.1-3.3-.4 0-.8 0-1.1.2.4-1.6 1.6-3 3.3-4L16.4 6z"/></svg>
      }
      @case ('arrow') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M12 4l-1.4 1.4L16.2 11H4v2h12.2l-5.6 5.6L12 20l8-8z"/></svg>
      }
      @case ('mail') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
      }
      @case ('pin') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>
      }
      @case ('chat') {
        <svg class="rm-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>
      }
    }
  `,
  styles: `
    /* Size and colour come from the parent: set width/height and the color
       property on the rm-icon element in styles.css, and the glyph follows.
       (No backticks in here - this block is a template literal.) */
    :host {
      display: inline-flex;
      line-height: 0;
      width: 1.25em;
      height: 1.25em;
      color: inherit;
    }
    .rm-icon { width: 100%; height: 100%; fill: currentColor; display: block; }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
}

export type IconName =
  | 'phone'
  | 'check'
  | 'star'
  | 'play'
  | 'chevron'
  | 'calendar'
  | 'house'
  | 'search'
  | 'shield'
  | 'team'
  | 'clock'
  | 'wrench'
  | 'hammer'
  | 'medal'
  | 'storm'
  | 'quote'
  | 'arrow'
  | 'mail'
  | 'pin'
  | 'chat';
