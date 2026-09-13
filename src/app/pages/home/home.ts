import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeroComponent } from './sections/hero';
import { TrustComponent } from './sections/trust';
import { ServicesComponent } from './sections/services';
import { ProcessComponent } from './sections/process';
import { WhyUsComponent } from './sections/why-us';
import { WorkComponent } from './sections/work';
import { HelpComponent } from './sections/help';
import { ReviewsComponent } from './sections/reviews';
import { FaqComponent } from './sections/faq';
import { CtaComponent } from './sections/cta';

/**
 * The home page is just an ordered list of bands. Reordering or dropping a
 * section is a one-line change here; nothing else needs to know.
 *
 * The header's scroll spy watches section ids in its own declaration order, so
 * if a section with a nav link moves, move its entry in header.ts to match.
 *
 * Backgrounds alternate white and tint, with one dark band (why-us) in the
 * middle. Moving a section can put two of the same shade side by side, so look
 * at the page after reordering.
 */
@Component({
  selector: 'rm-home',
  imports: [
    HeroComponent,
    TrustComponent,
    ServicesComponent,
    WhyUsComponent,
    WorkComponent,
    ProcessComponent,
    HelpComponent,
    ReviewsComponent,
    FaqComponent,
    CtaComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rm-hero />
    <rm-trust />
    <rm-services />
    <rm-why-us />
    <rm-work />
    <rm-process />
    <rm-help />
    <rm-reviews />
    <rm-faq />
    <rm-cta />
  `,
})
export class HomeComponent {}
