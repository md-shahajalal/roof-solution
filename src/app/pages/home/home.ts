import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeroComponent } from './sections/hero';
import { TrustComponent } from './sections/trust';
import { ServicesComponent } from './sections/services';
import { ProcessComponent } from './sections/process';
import { WhyUsComponent } from './sections/why-us';
import { WorkComponent } from './sections/work';
import { ReviewsComponent } from './sections/reviews';
import { FaqComponent } from './sections/faq';
import { CtaComponent } from './sections/cta';

/**
 * The home page is just an ordered list of bands. Reordering or dropping a
 * section is a one-line change here; nothing else needs to know.
 *
 * The header's scroll spy watches section ids in its own declaration order, so
 * if a section with a nav link moves, move its entry in header.ts to match.
 */
@Component({
  selector: 'rm-home',
  imports: [
    HeroComponent,
    TrustComponent,
    ServicesComponent,
    ProcessComponent,
    WhyUsComponent,
    WorkComponent,
    ReviewsComponent,
    FaqComponent,
    CtaComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rm-hero />
    <rm-trust />
    <rm-services />
    <rm-process />
    <rm-why-us />
    <rm-work />
    <rm-reviews />
    <rm-faq />
    <rm-cta />
  `,
})
export class HomeComponent {}
