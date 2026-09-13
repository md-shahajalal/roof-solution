import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { WORK_PHASES } from '../../../core/content';

/**
 * Job photos, one stage of work at a time, with a viewer for a closer look.
 *
 * Tabs instead of every photo stacked: thirteen near-identical shots of grey
 * shingles made the page long without telling a visitor anything more. The
 * viewer matters because these are phone photos of detail work — a flashed vent
 * or a re-sheeted deck only reads at full size.
 */
@Component({
  selector: 'rm-work',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-work" id="work">
      <div class="rm-container">

        <div class="rm-section-head">
          <p class="rm-eyebrow">Our work</p>
          <h2 class="rm-h2">Real roofs, photographed on the job</h2>
          <p class="rm-section-sub">
            Including the decking and prep work that is hidden once the shingles go on.
          </p>
        </div>

        <div class="rm-tabs" role="tablist" aria-label="Stage of work">
          @for (phase of phases; track phase.title; let i = $index) {
            <button type="button" role="tab" class="rm-tabs__tab"
                    [id]="'rm-work-tab-' + i"
                    [attr.aria-selected]="i === tab()"
                    aria-controls="rm-work-panel"
                    [attr.tabindex]="i === tab() ? 0 : -1"
                    (click)="tab.set(i)"
                    (keydown)="onTabKey($event, i)">
              {{ phase.title }}
              <span class="rm-tabs__count">{{ phase.photos.length }}</span>
            </button>
          }
        </div>

        <div class="rm-work__grid" role="tabpanel" id="rm-work-panel"
             [style.--rm-cols]="current().columns"
             [attr.aria-labelledby]="'rm-work-tab-' + tab()">
          @for (photo of current().photos; track photo.image; let i = $index) {
            <button type="button" class="rm-work__item" (click)="openPhoto(i, $event)"
                    [attr.aria-label]="'View larger: ' + photo.caption">
              <img [src]="photo.image" [alt]="photo.alt" width="640" height="853"
                   loading="lazy" decoding="async">
              <span class="rm-work__caption">{{ photo.caption }}</span>
              <span class="rm-work__zoom" aria-hidden="true"><rm-icon name="search" /></span>
            </button>
          }
        </div>

      </div>

      @if (viewing(); as photo) {
        <div class="rm-lightbox" role="dialog" aria-modal="true"
             [attr.aria-label]="photo.caption" (click)="closePhoto()">
          <figure class="rm-lightbox__figure" (click)="$event.stopPropagation()">
            <img [src]="photo.image" [alt]="photo.alt" width="640" height="853">
            <figcaption>
              <span>{{ photo.caption }}</span>
              <span class="rm-lightbox__count">{{ (index() ?? 0) + 1 }} / {{ current().photos.length }}</span>
            </figcaption>
          </figure>

          <button #closeButton type="button" class="rm-lightbox__close"
                  (click)="closePhoto()" aria-label="Close">&times;</button>
          <button type="button" class="rm-lightbox__nav rm-lightbox__nav--prev"
                  (click)="step(-1); $event.stopPropagation()" aria-label="Previous photo">
            <rm-icon name="chevron" />
          </button>
          <button type="button" class="rm-lightbox__nav rm-lightbox__nav--next"
                  (click)="step(1); $event.stopPropagation()" aria-label="Next photo">
            <rm-icon name="chevron" />
          </button>
        </div>
      }
    </section>
  `,
})
export class WorkComponent {
  protected readonly phases = WORK_PHASES;

  protected readonly tab = signal(0);
  protected readonly current = computed(() => this.phases[this.tab()]);

  /** Index of the photo open in the viewer, or null while it is closed. */
  protected readonly index = signal<number | null>(null);
  protected readonly viewing = computed(() => {
    const i = this.index();
    return i === null ? null : this.current().photos[i];
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private returnFocus: HTMLElement | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => document.body.classList.remove('rm-lightbox-open'));
  }

  /** Arrow keys, Home and End move between tabs, as the ARIA tabs pattern expects. */
  protected onTabKey(event: KeyboardEvent, i: number): void {
    const count = this.phases.length;
    const next =
      event.key === 'ArrowRight' ? (i + 1) % count
      : event.key === 'ArrowLeft' ? (i - 1 + count) % count
      : event.key === 'Home' ? 0
      : event.key === 'End' ? count - 1
      : null;
    if (next === null) return;

    event.preventDefault();
    this.tab.set(next);
    afterNextRender(
      () => this.host.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus(),
      { injector: this.injector },
    );
  }

  protected openPhoto(i: number, event: Event): void {
    this.returnFocus = event.currentTarget as HTMLElement;
    this.index.set(i);
    document.body.classList.add('rm-lightbox-open');
    afterNextRender(() => this.closeButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected closePhoto(): void {
    if (this.index() === null) return;
    this.index.set(null);
    document.body.classList.remove('rm-lightbox-open');
    this.returnFocus?.focus();
    this.returnFocus = null;
  }

  protected step(delta: number): void {
    const i = this.index();
    if (i === null) return;
    const count = this.current().photos.length;
    this.index.set((i + delta + count) % count);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: Event): void {
    if (this.index() === null || !(event instanceof KeyboardEvent)) return;

    if (event.key === 'Escape') this.closePhoto();
    else if (event.key === 'ArrowRight') this.step(1);
    else if (event.key === 'ArrowLeft') this.step(-1);
    else if (event.key === 'Tab') this.trapFocus(event);
  }

  /** Keeps Tab cycling through the viewer's three buttons while it is open. */
  private trapFocus(event: KeyboardEvent): void {
    const buttons = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>('.rm-lightbox button'),
    );
    if (!buttons.length) return;
    const at = buttons.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey
      ? (at <= 0 ? buttons.length - 1 : at - 1)
      : (at === -1 || at === buttons.length - 1 ? 0 : at + 1);
    event.preventDefault();
    buttons[next].focus();
  }
}
