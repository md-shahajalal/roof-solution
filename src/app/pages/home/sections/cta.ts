import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { SITE, telHref } from '../../../core/site.config';
import { EstimateService } from '../../../core/estimate.service';

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

        <button type="button" class="rm-btn rm-btn--primary rm-btn--lg"
                (click)="openEstimate($event)">
          <span class="rm-btn__icon"><rm-icon name="calendar" /></span>
          Get a free estimate
          <span class="rm-btn__chevron"><rm-icon name="chevron" /></span>
        </button>

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
  private readonly estimate = inject(EstimateService);

  /**
   * Opens the estimate dialog. The button is passed along so focus can return
   * to exactly where the visitor left it when the dialog closes.
   */
  protected openEstimate(event: Event): void {
    this.estimate.open(event.currentTarget as HTMLElement);
  }
}
