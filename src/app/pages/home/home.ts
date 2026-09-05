import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeroComponent } from './sections/hero';
import { TrustComponent } from './sections/trust';
import { ServicesComponent } from './sections/services';
import { WhyUsComponent } from './sections/why-us';
import { WorkComponent } from './sections/work';
import { ReviewsComponent } from './sections/reviews';
import { CtaComponent } from './sections/cta';

/**
 * The home page is just an ordered list of bands. Reordering or dropping a
 * section is a one-line change here; nothing else needs to know.
 */
@Component({
  selector: 'rm-home',
  imports: [
    HeroComponent,
    TrustComponent,
    ServicesComponent,
    WhyUsComponent,
    WorkComponent,
    ReviewsComponent,
    CtaComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rm-hero />
    <rm-trust />
    <rm-services />
    <rm-why-us />
    <rm-work />
    <rm-reviews />
    <rm-cta />
  `,
})
export class HomeComponent {}
