import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { WHY_POINTS } from '../../../core/content';
import { SITE } from '../../../core/site.config';
import { EstimateService } from '../../../core/estimate.service';

@Component({
  selector: 'rm-why-us',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-why" id="about">
      <div class="rm-container rm-why__inner">

        <div class="rm-why__visual">
          <img class="rm-why__photo" src="/images/why-choose-us.jpg"
               alt="Newly installed shingles meeting a gable end with vented soffit"
               width="1000" height="1200" loading="lazy" decoding="async">

          <!-- The motto is the brand's own promise, so it sits with the logo on the
               photograph rather than competing with the headline in the hero. -->
          <figure class="rm-why__badge">
            <img src="/images/logo.png" width="500" height="392" [alt]="site.name" loading="lazy">
            <figcaption>&ldquo;{{ site.motto }}&rdquo;</figcaption>
          </figure>
        </div>

        <div class="rm-why__copy">
          <p class="rm-eyebrow">Why choose R&amp;M</p>
          <h2 class="rm-h2">Built on faith. <span class="rm-accent">Focused on you.</span></h2>
          <p class="rm-lead">
            We treat every roof the way we would want our own home treated: honest advice,
            quality materials, and work we stand behind.
          </p>

          <ul class="rm-why__list">
            @for (point of points; track point) {
              <li>
                <span class="rm-why__check"><rm-icon name="check" /></span>
                <span>{{ point }}</span>
              </li>
            }
          </ul>

          <div class="rm-why__actions">
            <button type="button" class="rm-btn rm-btn--primary" (click)="openEstimate($event)">
              Get a free estimate
              <span class="rm-btn__chevron"><rm-icon name="chevron" /></span>
            </button>
            <span class="rm-why__license"><rm-icon name="shield" /> {{ site.license.display }}</span>
          </div>
        </div>

      </div>
    </section>
  `,
})
export class WhyUsComponent {
  protected readonly points = WHY_POINTS;
  protected readonly site = SITE;
  private readonly estimate = inject(EstimateService);

  protected openEstimate(event: Event): void {
    this.estimate.open(event.currentTarget as HTMLElement);
  }
}
