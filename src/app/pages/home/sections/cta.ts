import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { SITE, telHref } from '../../../core/site.config';

@Component({
  selector: 'rm-cta',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-cta">
      <div class="rm-cta__media">
        <img src="/images/cta-shingles.jpg" alt="" width="1920" height="400"
             loading="lazy" decoding="async">
      </div>

      <div class="rm-container rm-cta__inner">
        <p class="rm-cta__lead">Need a new roof or a repair?</p>
        <p class="rm-cta__support">We’re here to help.</p>

        <a class="rm-btn rm-btn--primary rm-btn--lg" [href]="site.estimateUrl">
          <span class="rm-btn__icon"><rm-icon name="calendar" /></span>
          Get a free estimate
          <span class="rm-btn__chevron"><rm-icon name="chevron" /></span>
        </a>

        <a class="rm-btn rm-btn--ghost rm-btn--lg" [href]="telHref">
          <span class="rm-btn__icon"><rm-icon name="phone" /></span>
          {{ site.phone }}
        </a>
      </div>
    </section>
  `,
})
export class CtaComponent {
  protected readonly site = SITE;
  protected readonly telHref = telHref();
}
