import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { SITE } from '../../../core/site.config';

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

      <div class="rm-container">
        <div class="rm-hero__content">
          <h1 class="rm-h1 rm-hero__title">
            Protecting what matters
            <span class="rm-hero__accent">most</span>
          </h1>

          <p class="rm-hero__lede">High-quality roofing solutions you can trust.</p>

          <blockquote class="rm-hero__motto">&ldquo;{{ site.motto }}&rdquo;</blockquote>

          <div class="rm-hero__actions">
            <a class="rm-btn rm-btn--primary rm-btn--lg" [href]="site.estimateUrl">
              <span class="rm-btn__icon"><rm-icon name="calendar" /></span>
              Get a free estimate
              <span class="rm-btn__chevron"><rm-icon name="chevron" /></span>
            </a>
            <a class="rm-btn rm-btn--ghost rm-btn--lg" [href]="site.videoUrl">
              <span class="rm-btn__icon"><rm-icon name="play" /></span>
              Watch video
            </a>
          </div>

          <p class="rm-hero__license">
            <rm-icon name="shield" />
            <span>{{ site.license.display }} &middot; {{ site.serviceArea }}</span>
          </p>
        </div>
      </div>
    </section>
  `,
})
export class HeroComponent {
  protected readonly site = SITE;
}
