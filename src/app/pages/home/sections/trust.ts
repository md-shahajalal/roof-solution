import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { TRUST_ITEMS } from '../../../core/content';

@Component({
  selector: 'rm-trust',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-trust" aria-label="Why homeowners hire us">
      <div class="rm-container">
        <div class="rm-trust__inner">
          @for (item of items; track item.title) {
            <div class="rm-trust__item">
              <span class="rm-trust__icon"><rm-icon [name]="item.icon" /></span>
              <span>
                <span class="rm-trust__title">{{ item.title }}</span>
                <p class="rm-trust__text">{{ item.text }}</p>
              </span>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class TrustComponent {
  protected readonly items = TRUST_ITEMS;
}
