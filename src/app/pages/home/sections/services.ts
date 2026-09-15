import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { ServiceCatalog } from '../../../core/service-catalog';

/**
 * The first two services, replacement and repair, are the jobs most visitors
 * arrive for, so they get the wider cards. Each card lists what the service
 * covers: a named promise reads as a real business, a one-line blurb as a
 * template.
 *
 * No estimate button on the cards. Five identical "Get a free quote" links in a
 * row read as pushy; the hero card already starts the estimate by service, and
 * the header keeps a button in reach the whole way down.
 */
@Component({
  selector: 'rm-services',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-services" id="services">
      <div class="rm-container">

        <div class="rm-head-split">
          <div class="rm-head-split__copy">
            <p class="rm-eyebrow">Our services</p>
            <h2 class="rm-h2">Roofing services for every stage of your roof</h2>
            <p class="rm-lead">
              From a single leak to a full re-roof, one licensed team handles the whole job.
            </p>
          </div>
        </div>

        <div class="rm-services__grid">
          @for (service of services(); track service.slug; let i = $index) {
            <article class="rm-service" [class.rm-service--featured]="i < 2">
              <div class="rm-service__media">
                <img [src]="service.image" [alt]="service.alt"
                     width="900" height="620" loading="lazy" decoding="async">
              </div>
              <div class="rm-service__body">
                <span class="rm-service__badge"><rm-icon [name]="service.icon" /></span>
                <h3 class="rm-h3 rm-service__title">{{ service.title }}</h3>
                <p class="rm-service__text">{{ service.text }}</p>
                <ul class="rm-service__points">
                  @for (point of service.points; track point) {
                    <li><rm-icon name="check" /> {{ point }}</li>
                  }
                </ul>
              </div>
            </article>
          }
        </div>

      </div>
    </section>
  `,
})
export class ServicesComponent {
  /** Loaded from public/data/services.json. See ServiceCatalog. */
  protected readonly services = inject(ServiceCatalog).services;
}
