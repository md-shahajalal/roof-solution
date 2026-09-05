import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { SERVICES } from '../../../core/content';

@Component({
  selector: 'rm-services',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-services" id="services">
      <div class="rm-container">

        <div class="rm-section-head">
          <p class="rm-eyebrow">Our services</p>
          <h2 class="rm-h2">Complete roofing solutions</h2>
          <p class="rm-section-sub">Everything your roof needs, in one place.</p>
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
              </div>
            </article>
          }
        </div>

      </div>
    </section>
  `,
})
export class ServicesComponent {
  protected readonly services = SERVICES;
}
