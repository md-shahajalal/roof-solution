import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { CREDENTIALS } from '../../../core/content';

/**
 * The credentials panel pulled up over the bottom edge of the hero.
 *
 * It borrows the shape of a statistics band, a big value over a short label,
 * because that is what a homeowner's eye scans for first. Deliberately no
 * statistics, though. Reference sites lead with "25+ years" and review counts
 * because theirs are real; numbers invented to look the part are the one thing
 * here that could cost the business a customer's trust. Every value below is a
 * fact the site already publishes.
 */
@Component({
  selector: 'rm-trust',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-creds" aria-label="Credentials">
      <div class="rm-container">
        <ul class="rm-creds__panel">
          @for (item of items; track item.value) {
            <li class="rm-creds__item">
              <span class="rm-creds__icon"><rm-icon [name]="item.icon" /></span>
              <span>
                <span class="rm-creds__value">{{ item.value }}</span>
                <span class="rm-creds__label">{{ item.label }}</span>
              </span>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class TrustComponent {
  protected readonly items = CREDENTIALS;
}
