import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header';
import { FooterComponent } from './layout/footer/footer';
import { EstimateModalComponent } from './shared/estimate-modal/estimate-modal';
import { ContactPopupComponent } from './shared/contact-popup/contact-popup';
import { ActionDockComponent } from './layout/action-dock/action-dock';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    EstimateModalComponent,
    ContactPopupComponent,
    ActionDockComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="rm-skip-link" href="#rm-main">Skip to content</a>
    <rm-header />
    <main id="rm-main">
      <router-outlet />
    </main>
    <rm-footer />

    <!-- Phones only: Call and Free estimate pinned to the bottom of the screen. -->
    <rm-action-dock />

    <!-- Mounted once here so every "Get a free estimate" button on the page,
         header and footer included, opens the same dialog above everything. -->
    <rm-estimate-modal />

    <!-- Slides in once per visit and hands off to tawk.to's chat. -->
    <rm-contact-popup />
  `,
})
export class App {
  constructor() {
    const scroller = inject(ViewportScroller);

    // Angular's ViewportScroller jumps with window.scrollTo() and its own offset
    // rather than element.scrollIntoView(), so the CSS `scroll-margin-top` on
    // section ids is ignored entirely — anchors land at y=0, tucked behind the
    // sticky header. Measuring the header at call time keeps this correct across
    // breakpoints instead of hardcoding a number that drifts.
    scroller.setOffset(() => {
      const header = document.querySelector<HTMLElement>('.rm-header');
      return [0, (header?.getBoundingClientRect().height ?? 104) + 16];
    });
  }
}
