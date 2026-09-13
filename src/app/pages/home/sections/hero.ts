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
            Protecting what matters <span class="rm-accent">most</span>
          </h1>

          <p class="rm-hero__lede">High-quality roofing solutions you can trust.</p>

          <!-- The brand's own promise, set apart as a quotation under the promise. -->
          <p class="rm-hero__motto">&ldquo;{{ site.motto }}&rdquo;</p>

          <ul class="rm-hero__proof">
            <li><rm-icon name="check" /> Free, no-pressure estimates</li>
            <li><rm-icon name="check" /> Honest repair-or-replace advice</li>
            <li><rm-icon name="check" /> Workmanship guaranteed</li>
          </ul>

          <!-- Call only. The card beside this is already step one of the estimate,
               so an estimate button here would be the same action twice. -->
          <div class="rm-hero__actions">
            <a class="rm-btn rm-btn--primary rm-btn--lg" [href]="telHref">
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

  /** Step one done: open the form on step two with the service already chosen. */
  protected start(event: Event, quote: string): void {
    this.estimate.open(event.currentTarget as HTMLElement, { service: quote });
  }
}
