import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { SITE, telHref } from '../../../core/site.config';
import { EstimateService } from '../../../core/estimate.service';

@Component({
  selector: 'rm-cta',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-cta" aria-labelledby="rm-cta-title">
      <div class="rm-cta__media">
        <img src="/images/cta-shingles.jpg" alt="" width="1920" height="400"
             loading="lazy" decoding="async">
      </div>

      <div class="rm-container rm-cta__inner">
        <div class="rm-cta__copy">
          <h2 class="rm-cta__title" id="rm-cta-title">Ready to protect your home?</h2>
          <p class="rm-cta__text">
            Get a free, no-pressure estimate, or call now and talk to our team.
          </p>
          <ul class="rm-cta__points">
            <li><rm-icon name="check" /> Free estimate</li>
            <li><rm-icon name="check" /> No obligation</li>
            <li><rm-icon name="check" /> {{ site.license.display }}</li>
          </ul>
        </div>

        <div class="rm-cta__actions">
          <button type="button" class="rm-btn rm-btn--primary rm-btn--lg"
                  (click)="openEstimate($event)">
            Get a free estimate
            <span class="rm-btn__chevron"><rm-icon name="chevron" /></span>
          </button>
          <a class="rm-btn rm-btn--outline-light rm-btn--lg" [href]="telHref">
            <span class="rm-btn__icon"><rm-icon name="phone" /></span>
            {{ site.phone }}
          </a>
        </div>
      </div>
    </section>
  `,
})
export class CtaComponent {
  protected readonly site = SITE;
  protected readonly telHref = telHref();
  private readonly estimate = inject(EstimateService);

  /**
   * Opens the estimate dialog. The button is passed along so focus can return
   * to exactly where the visitor left it when the dialog closes.
   */
  protected openEstimate(event: Event): void {
    this.estimate.open(event.currentTarget as HTMLElement);
  }
}
