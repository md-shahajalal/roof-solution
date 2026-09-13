import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../../shared/icon/icon';
import { SITE, telHref } from '../../core/site.config';
import { EstimateService } from '../../core/estimate.service';

/**
 * Call and Free estimate, pinned to the bottom of the screen on phones.
 *
 * On a phone the estimate button is behind the menu and the page is long. For a
 * local trade, the two actions that bring in work should never be more than one
 * tap away. Hidden above 720px by CSS, where the header already carries both.
 *
 * tawk.to's chat icon is lifted clear of this bar; see `customStyle` in
 * TawkService.
 */
@Component({
  selector: 'rm-action-dock',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rm-dock">
      <a class="rm-btn rm-btn--ghost" [href]="telHref" [attr.aria-label]="'Call ' + site.phone">
        <span class="rm-btn__icon"><rm-icon name="phone" /></span>
        Call now
      </a>
      <button type="button" class="rm-btn rm-btn--primary" (click)="openEstimate($event)">
        Free estimate
        <span class="rm-btn__chevron"><rm-icon name="chevron" /></span>
      </button>
    </div>
  `,
})
export class ActionDockComponent {
  protected readonly site = SITE;
  protected readonly telHref = telHref();
  private readonly estimate = inject(EstimateService);

  protected openEstimate(event: Event): void {
    this.estimate.open(event.currentTarget as HTMLElement);
  }
}
