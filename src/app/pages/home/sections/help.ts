import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { SITE, telHref } from '../../../core/site.config';
import { EstimateService } from '../../../core/estimate.service';

/**
 * Two routes in for the two visitors a services grid serves worst: the one with
 * water coming through the ceiling right now, and the one who has no idea
 * whether they need a repair or a new roof.
 *
 * Both cards only restate what the site already commits to: the 24/7 line,
 * tarping, documentation and restoration, and the honest repair-or-replace
 * advice from the FAQ. No financing or insurance-claim card, since the business
 * offers neither on the site.
 */
@Component({
  selector: 'rm-help',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-help" aria-label="Get help with your roof">
      <div class="rm-container rm-help__grid">

        <article class="rm-help__card rm-help__card--urgent">
          <div class="rm-help__head">
            <span class="rm-help__icon"><rm-icon name="storm" /></span>
            <p class="rm-help__tag">Storm damage &amp; leaks</p>
          </div>
          <h2 class="rm-h3 rm-help__title">Water coming through the ceiling?</h2>
          <p class="rm-help__text">
            Our emergency line is open 24/7. We handle emergency tarping, damage
            documentation and full restoration.
          </p>
          <div class="rm-help__actions">
            <a class="rm-btn rm-btn--primary" [href]="telHref">
              <span class="rm-btn__icon"><rm-icon name="phone" /></span>
              Call {{ site.phone }}
            </a>
          </div>
        </article>

        <article class="rm-help__card rm-help__card--advice">
          <div class="rm-help__head">
            <span class="rm-help__icon"><rm-icon name="search" /></span>
            <p class="rm-help__tag">Repair or replace?</p>
          </div>
          <h2 class="rm-h3 rm-help__title">Not sure what your roof needs?</h2>
          <p class="rm-help__text">
            We come out, look at the roof and tell you honestly whether a repair will do
            the job or a replacement makes more sense. The estimate is free, with no
            obligation.
          </p>
          <div class="rm-help__actions">
            <button type="button" class="rm-btn rm-btn--primary" (click)="quote($event, 'Other')">
              Request a free estimate
              <span class="rm-btn__chevron"><rm-icon name="chevron" /></span>
            </button>
          </div>
        </article>

      </div>
    </section>
  `,
})
export class HelpComponent {
  protected readonly site = SITE;
  protected readonly telHref = telHref();
  private readonly estimate = inject(EstimateService);

  /** Opens the estimate form with this service already chosen. */
  protected quote(event: Event, service: string): void {
    this.estimate.open(event.currentTarget as HTMLElement, { service });
  }
}
