import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WORK_PHASES } from '../../../core/content';

@Component({
  selector: 'rm-work',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-work" id="work">
      <div class="rm-container">

        <div class="rm-section-head">
          <p class="rm-eyebrow">Our work</p>
          <p class="rm-section-sub">Quality you can see.</p>
        </div>

        @for (phase of phases; track phase.title) {
          <h3 class="rm-work__phase">{{ phase.title }}</h3>

          <div class="rm-work__grid" [attr.data-columns]="phase.columns">
            @for (photo of phase.photos; track photo.image) {
              <figure class="rm-work__item">
                <img [src]="photo.image" [alt]="photo.alt"
                     width="640" height="853" loading="lazy" decoding="async">
                <figcaption class="rm-work__caption">{{ photo.caption }}</figcaption>
              </figure>
            }
          </div>
        }

      </div>
    </section>
  `,
})
export class WorkComponent {
  protected readonly phases = WORK_PHASES;
}
