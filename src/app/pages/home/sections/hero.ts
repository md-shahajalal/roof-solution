import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent, IconName } from '../../../shared/icon/icon';
import { SITE, telHref } from '../../../core/site.config';
import { EstimateService } from '../../../core/estimate.service';
import { SERVICES } from '../../../core/content';

interface QuickOption {
  label: string;
  icon: IconName;
  /** The estimate form's service option this starts on. */
  quote: string;
}

/**
 * First screen: the promise, the proof, and a way to start straight away.
 *
 * The card on the right is step one of the estimate. Picking a service opens the
 * estimate form with that service already chosen, so the visitor has committed
 * to something before being asked for a single personal detail — the same reason
 * multi-step lead forms convert better than one long one. It reuses the tested
 * estimate form rather than duplicating it inline.
 */
@Component({
  selector: 'rm-hero',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-hero" id="home">
      <div class="rm-hero__media">
        <img src="/images/hero-home.jpg" alt="" width="1600" height="916"
             fetchpriority="high" decoding="async">
      </div>

      <div class="rm-container rm-hero__inner">
        <div class="rm-hero__content">
          <p class="rm-hero__eyebrow">
            <span class="rm-hero__dot" aria-hidden="true"></span>
            Licensed roofing contractor &middot; {{ site.serviceArea }}
          </p>

          <h1 class="rm-h1 rm-hero__title">
            Roofing you can trust, <span class="rm-accent">built to last.</span>
          </h1>

          <p class="rm-hero__lede">
            Repairs, replacements and inspections from a licensed, fully insured crew,
            with a free, no-pressure estimate before any work begins.
          </p>

          <ul class="rm-hero__proof">
            <li><rm-icon name="shield" /> Licensed &amp; insured</li>
            <li><rm-icon name="medal" /> {{ site.license.display }}</li>
            <li><rm-icon name="clock" /> {{ site.hours }}</li>
          </ul>

          <div class="rm-hero__actions">
            <button type="button" class="rm-btn rm-btn--primary rm-btn--lg"
                    (click)="openEstimate($event)">
              Get a free estimate
              <span class="rm-btn__chevron"><rm-icon name="chevron" /></span>
            </button>
            <a class="rm-btn rm-btn--outline-light rm-btn--lg" [href]="telHref">
              <span class="rm-btn__icon"><rm-icon name="phone" /></span>
              {{ site.phone }}
            </a>
          </div>
        </div>

        <aside class="rm-quickstart" aria-labelledby="rm-quickstart-title">
          <div class="rm-quickstart__head">
            <p class="rm-quickstart__step">Free estimate &middot; Step 1 of 2</p>
            <div class="rm-quickstart__bar" aria-hidden="true"><span></span></div>
          </div>

          <h2 class="rm-quickstart__title" id="rm-quickstart-title">What do you need help with?</h2>
          <p class="rm-quickstart__sub">Pick one to start. It takes about a minute.</p>

          <div class="rm-quickstart__grid">
            @for (option of options; track option.quote) {
              <button type="button" class="rm-quickstart__option" (click)="start($event, option.quote)">
                <span class="rm-quickstart__icon"><rm-icon [name]="option.icon" /></span>
                <span class="rm-quickstart__label">{{ option.label }}</span>
              </button>
            }
          </div>

          <p class="rm-quickstart__foot">
            <rm-icon name="check" /> Free &amp; no obligation
            <span aria-hidden="true">&middot;</span>
            <a [href]="telHref">Prefer to call?</a>
          </p>
        </aside>
      </div>
    </section>
  `,
})
export class HeroComponent {
  protected readonly site = SITE;
  protected readonly telHref = telHref();
  private readonly estimate = inject(EstimateService);

  protected readonly options: readonly QuickOption[] = [
    ...SERVICES.map((service) => ({ label: service.title, icon: service.icon, quote: service.quote })),
    { label: 'Not sure / other', icon: 'chat', quote: 'Other' },
  ];

  /**
   * Opens the estimate dialog. The button is passed along so focus can return
   * to exactly where the visitor left it when the dialog closes.
   */
  protected openEstimate(event: Event): void {
    this.estimate.open(event.currentTarget as HTMLElement);
  }

  /** Step one done: open the form on step two with the service already chosen. */
  protected start(event: Event, quote: string): void {
    this.estimate.open(event.currentTarget as HTMLElement, { service: quote });
  }
}
