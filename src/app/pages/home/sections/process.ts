import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { PROCESS_STEPS } from '../../../core/content';

/**
 * "How it works". The biggest worry before hiring a roofer is not knowing what
 * happens next or what it will cost; four plain steps answer both.
 */
@Component({
  selector: 'rm-process',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-process" id="process">
      <div class="rm-container">

        <div class="rm-section-head">
          <p class="rm-eyebrow">How it works</p>
          <h2 class="rm-h2">A simple, no-pressure process</h2>
          <p class="rm-section-sub">
            You know what happens next, and what it costs, before any work starts.
          </p>
        </div>

        <ol class="rm-process__list">
          @for (step of steps; track step.title; let i = $index) {
            <li class="rm-process__step">
              <span class="rm-process__icon">
                <rm-icon [name]="step.icon" />
                <span class="rm-process__num">{{ i + 1 }}</span>
              </span>
              <h3 class="rm-h3 rm-process__title">{{ step.title }}</h3>
              <p class="rm-process__text">{{ step.text }}</p>
            </li>
          }
        </ol>

      </div>
    </section>
  `,
})
export class ProcessComponent {
  protected readonly steps = PROCESS_STEPS;
}
