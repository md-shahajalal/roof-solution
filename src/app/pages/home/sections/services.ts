import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { SERVICES } from '../../../core/content';
import { EstimateService } from '../../../core/estimate.service';

@Component({
  selector: 'rm-services',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-services" id="services">
      <div class="rm-container">

        <div class="rm-section-head">
          <p class="rm-eyebrow">Our services</p>
          <h2 class="rm-h2">Roofing services for every stage of your roof</h2>
          <p class="rm-section-sub">
            From a single leak to a full re-roof, one licensed team handles the whole job.
          </p>
        </div>

        <div class="rm-services__grid">
          @for (service of services; track service.slug) {
            <article class="rm-service">
              <div class="rm-service__media">
                <img [src]="service.image" [alt]="service.alt"
                     width="900" height="620" loading="lazy" decoding="async">
                <span class="rm-service__badge"><rm-icon [name]="service.icon" /></span>
              </div>
              <div class="rm-service__body">
                <h3 class="rm-h3 rm-service__title">{{ service.title }}</h3>
                <p class="rm-service__text">{{ service.text }}</p>
                <button type="button" class="rm-textlink" (click)="quote($event, service.quote)">
                  Get a free quote <rm-icon name="arrow" />
                </button>
              </div>
            </article>
          }

          <!-- Fills the sixth slot, and catches the visitor who does not know which
               of the five they need — usually the one with a leak and no diagnosis. -->
          <article class="rm-service rm-service--cta">
            <span class="rm-service__cta-icon"><rm-icon name="chat" /></span>
            <h3 class="rm-h3 rm-service__title">Not sure what you need?</h3>
            <p class="rm-service__text">
              Tell us what is going on. We will come out, take a look, and give you a free
              estimate, including whether a repair would do the job.
            </p>
            <button type="button" class="rm-btn rm-btn--primary" (click)="quote($event, 'Other')">
              Request a free estimate
            </button>
          </article>
        </div>

      </div>
    </section>
  `,
})
export class ServicesComponent {
  protected readonly services = SERVICES;
  private readonly estimate = inject(EstimateService);

  /** Opens the estimate form with this service already chosen. */
  protected quote(event: Event, service: string): void {
    this.estimate.open(event.currentTarget as HTMLElement, { service });
  }
}
