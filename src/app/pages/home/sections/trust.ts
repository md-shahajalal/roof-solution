import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { TRUST_ITEMS } from '../../../core/content';
import { SITE } from '../../../core/site.config';

/**
 * The credentials band under the hero: who the business is, and the four things
 * a homeowner checks before letting a contractor on the roof.
 *
 * Deliberately no statistics. Reference sites lead with "25+ years" and review
 * counts because theirs are real; numbers invented to look the part are the one
 * thing here that could cost the business a customer's trust.
 */
@Component({
  selector: 'rm-trust',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-intro" aria-labelledby="rm-intro-title">
      <div class="rm-container rm-intro__inner">
        <div class="rm-intro__copy">
          <p class="rm-eyebrow">Why homeowners call R&amp;M</p>
          <h2 class="rm-h2" id="rm-intro-title">
            Straightforward roofing from a <span class="rm-accent">licensed, insured</span> team
          </h2>
          <p class="rm-lead">
            R&amp;M Roofing Solutions repairs, replaces and inspects roofs across California.
            Every job is done under {{ site.license.display }} by a fully insured crew, and it
            starts with a free, honest estimate.
          </p>
        </div>

        <ul class="rm-intro__grid">
          @for (item of items; track item.title) {
            <li class="rm-intro__item">
              <span class="rm-intro__icon"><rm-icon [name]="item.icon" /></span>
              <span class="rm-intro__title">{{ item.title }}</span>
              <span class="rm-intro__text">{{ item.text }}</span>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class TrustComponent {
  protected readonly items = TRUST_ITEMS;
  protected readonly site = SITE;
}
