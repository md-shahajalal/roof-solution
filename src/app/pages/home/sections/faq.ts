import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FAQS } from '../../../core/content';
import { SITE, telHref } from '../../../core/site.config';

/**
 * Native `<details>` rather than a scripted accordion: keyboard and screen-reader
 * support come for free, and every answer is in the page for search engines even
 * while collapsed. The shared `name` makes them close one another in browsers
 * that support it, and is simply ignored in the rest.
 *
 * No estimate button: the sticky header, and the dock on phones, keep one in reach.
 */
@Component({
  selector: 'rm-faq',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-faq" id="faq">
      <div class="rm-container rm-faq__inner">

        <div class="rm-faq__intro">
          <p class="rm-eyebrow">FAQ</p>
          <h2 class="rm-h2">Questions customers ask us</h2>
          <p class="rm-lead">
            Can't find your answer? Call us on <a [href]="telHref">{{ site.phone }}</a>
            and we'll be glad to help.
          </p>
        </div>

        <div class="rm-faq__list">
          @for (item of faqs; track item.q; let first = $first) {
            <details class="rm-faq__item" name="rm-faq" [open]="first">
              <summary class="rm-faq__q">
                <span>{{ item.q }}</span>
                <span class="rm-faq__toggle" aria-hidden="true"></span>
              </summary>
              <p class="rm-faq__a">{{ item.a }}</p>
            </details>
          }
        </div>

      </div>
    </section>
  `,
})
export class FaqComponent {
  protected readonly faqs = FAQS;
  protected readonly site = SITE;
  protected readonly telHref = telHref();
}
