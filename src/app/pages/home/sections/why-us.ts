import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { WHY_POINTS } from '../../../core/content';
import { SITE } from '../../../core/site.config';

@Component({
  selector: 'rm-why-us',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-why" id="about">

      <div class="rm-why__photo">
        <img src="/images/why-choose-us.jpg" alt="Newly installed shingles meeting a gable end with vented soffit"
             width="1000" height="1200" loading="lazy" decoding="async">
      </div>

      <div class="rm-why__panel">
        <div class="rm-why__panel-inner">
          <p class="rm-why__eyebrow">Why choose R&amp;M?</p>
          <h2 class="rm-h2 rm-why__title">Built on faith. Focused on you.</h2>

          <ul class="rm-why__list">
            @for (point of points; track point) {
              <li>
                <span class="rm-why__check"><rm-icon name="check" /></span>
                <span>{{ point }}</span>
              </li>
            }
          </ul>
        </div>
      </div>

      <div class="rm-why__mark">
        <img src="/images/logo.png" width="500" height="392"
             [alt]="site.name" loading="lazy">
        <p class="rm-why__license">{{ site.license.display }}</p>
      </div>

    </section>
  `,
})
export class WhyUsComponent {
  protected readonly points = WHY_POINTS;
  protected readonly site = SITE;
}
