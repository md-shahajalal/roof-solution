import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '../icon/icon';
import { EstimateService } from '../../core/estimate.service';
import { compressImage } from '../../core/image-compress';
import { noLinks } from '../../core/no-links.validator';
import { ESTIMATE_FORM, SITE, telHref } from '../../core/site.config';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * One chosen photo, kept alongside the identity of the file it came from.
 *
 * `file` is what gets attached, and compression renames it — `roof.png` comes
 * back as `roof.jpg`. Deduplicating on that name alone silently threw away real
 * photos, because two different originals in one multi-select can compress to
 * the same name. `key` is taken from the original before any of that happens, so
 * it identifies what the visitor actually picked.
 */
interface PickedPhoto {
  key: string;
  file: File;
}

/** Any control on the estimate form, for the validity helpers below. */
type FieldName = keyof EstimateModalComponent['form']['controls'];

/**
 * The "Get a free estimate" dialog.
 *
 * Mounted once, in `App`, and shown or hidden by `EstimateService`. Every
 * estimate button on the site opens this same instance.
 *
 * Dismissal is deliberately narrow: the close button, the Cancel button and the
 * Escape key. Clicking the backdrop does nothing except nudge the panel, because
 * a half-filled enquiry is easy to lose to a stray click and that lost enquiry
 * is a lost job. Escape stays wired up because a keyboard user with no visible
 * pointer needs a way out, and the ARIA dialog pattern expects it.
 */
@Component({
  selector: 'rm-estimate-modal',
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estimate-modal.html',
})
export class EstimateModalComponent {
  protected readonly estimate = inject(EstimateService);
  protected readonly site = SITE;
  protected readonly telHref = telHref();
  protected readonly limits = ESTIMATE_FORM;

  private readonly fb = inject(FormBuilder);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly propertyTypes = ['Residential', 'Commercial'] as const;

  protected readonly services = [
    'Roof Replacement',
    'Roof Repair',
    'Roof Inspection',
    'Storm Damage',
    'Maintenance',
    'Other',
  ] as const;

  /** Blocks the date picker from offering yesterday. `en-CA` formats as YYYY-MM-DD. */
  protected readonly today = new Date().toLocaleDateString('en-CA');

  /**
   * `noLinks` is on every free-text field. The client asked that no links reach
   * the inbox through this form; the phone field's own pattern already excludes
   * letters, and the selects and date only accept values this component offers.
   */
  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), noLinks]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+()\-.\s]{7,}$/)]],
    email: ['', [Validators.required, Validators.email]],
    propertyAddress: ['', noLinks],
    city: ['', noLinks],
    propertyType: [''],
    service: ['', Validators.required],
    description: ['', [Validators.maxLength(2000), noLinks]],
    preferredDate: [''],
    preferredTime: [''],
  });

  /** Already downscaled. Sizes shown in the list are the sizes that get sent. */
  protected readonly photos = signal<readonly PickedPhoto[]>([]);
  protected readonly fileError = signal('');
  /** True while re-encoding a batch, which takes a moment on a phone. */
  protected readonly compressing = signal(false);
  /** True while a file is being dragged over the picker. */
  protected readonly dragging = signal(false);

  protected readonly status = signal<Status>('idle');
  protected readonly errorMessage = signal('');
  /** Flips true on the first submit attempt, which is when errors start showing. */
  protected readonly submitted = signal(false);
  /** Drives the one-off "use the close button" nudge on a backdrop click. */
  protected readonly nudging = signal(false);

  protected readonly totalBytes = computed(() =>
    this.photos().reduce((sum, photo) => sum + photo.file.size, 0),
  );

  constructor() {
    // Every opening starts clean: a stale success panel, or the details typed
    // during the previous visit, would both be wrong on the second open.
    effect(() => {
      if (!this.estimate.isOpen()) return;

      // Untracked so that resetting the form's own signals cannot re-run this.
      untracked(() => {
        this.reset();

        // A visitor arriving back from FormSubmit lands straight on the
        // thank-you rather than on an empty form they already filled in.
        if (this.estimate.consumeReturn()) {
          this.status.set('sent');
          return;
        }

        // Wait for the panel to render before reaching for its first field.
        queueMicrotask(() => {
          this.panel()
            ?.nativeElement.querySelector<HTMLElement>('input, select, textarea')
            ?.focus();
        });
      });
    });
  }

  private reset(): void {
    this.form.reset();
    this.photos.set([]);
    this.fileError.set('');
    this.compressing.set(false);
    this.dragging.set(false);
    this.status.set('idle');
    this.errorMessage.set('');
    this.submitted.set(false);
  }

  /** True once a field should start showing red: touched, or a submit was tried. */
  protected invalid(name: FieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  /**
   * The one message to show under a field, or '' while it has nothing to say.
   *
   * Kept here rather than as a stack of `@if`s in the template because most
   * fields can now fail two different ways, and "please remove the web address"
   * has to be distinguishable from "this is required" — a visitor who is told
   * only that a field is invalid, on a field they filled in, gives up.
   */
  protected errorFor(name: FieldName): string {
    if (!this.invalid(name)) return '';
    const control = this.form.controls[name];

    if (control.hasError('link')) {
      return 'Please remove the web address — links cannot be sent through this form.';
    }
    if (control.hasError('maxlength')) {
      return 'That is a little long. Please shorten it, or tell us the rest on the phone.';
    }

    switch (name) {
      case 'fullName':
        return 'Please tell us your name.';
      case 'phone':
        return 'Please enter a phone number we can reach you on.';
      case 'email':
        return 'Please check the email address — we send the written estimate there.';
      case 'service':
        return 'Please pick the service you need.';
      default:
        return 'Please check this field.';
    }
  }

  /**
   * Accepts the picked photos, downscales each one, and keeps whatever fits.
   *
   * Compression happens here rather than at submit time so the sizes listed
   * under the picker are the real sent sizes, and so the running total that
   * decides what fits is honest.
   */
  protected async onFilesPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []);
    // Clearing lets the same file be re-picked after being removed from the list.
    input.value = '';
    await this.acceptFiles(picked);
  }

  /**
   * The drop half of "choose photos or drag them here".
   *
   * The file input itself would accept a drop, but it is one pixel of hidden
   * element, so in practice nothing lands on it — the label is what the visitor
   * aims at, and the label needs its own handler or the promise in that sentence
   * is a lie.
   */
  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging.set(false);
    if (this.compressing()) return;
    await this.acceptFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  /** Both `dragover` and `dragenter` must be cancelled or the browser navigates. */
  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.compressing()) this.dragging.set(true);
  }

  protected onDragLeave(): void {
    this.dragging.set(false);
  }

  private async acceptFiles(picked: readonly File[]): Promise<void> {
    if (!picked.length) return;

    this.compressing.set(true);
    this.fileError.set('');

    const accepted: PickedPhoto[] = [];
    const rejected: string[] = [];
    let running = this.totalBytes();

    try {
      for (const file of picked) {
        const key = photoKey(file);

        if (this.photos().length + accepted.length >= this.limits.maxFiles) {
          rejected.push(`${file.name} (past the ${this.limits.maxFiles}-photo limit)`);
          continue;
        }
        if (!file.type.startsWith('image/')) {
          rejected.push(`${file.name} (not an image)`);
          continue;
        }
        if (file.size > this.limits.maxOriginalBytes) {
          rejected.push(`${file.name} (over ${this.size(this.limits.maxOriginalBytes)})`);
          continue;
        }
        // Genuinely the same file twice, picked in one go or across two goes.
        // Matched on the original, since compression is about to rename it.
        const seen =
          this.photos().some((kept) => kept.key === key) ||
          accepted.some((kept) => kept.key === key);
        if (seen) continue;

        const compressed = await compressImage(file);
        // Identity, not size: `compressImage` hands the original straight back
        // when it could not decode the format at all.
        const resized = compressed !== file;

        if (running + compressed.size > this.limits.maxPayloadBytes) {
          rejected.push(
            resized
              ? `${file.name} (no room left in this request)`
              : `${file.name} (this browser could not resize it, and it is too big to send as-is)`,
          );
          continue;
        }

        accepted.push({ key, file: compressed });
        running += compressed.size;
      }
    } finally {
      this.compressing.set(false);
    }

    if (accepted.length) this.photos.update((kept) => [...kept, ...accepted]);
    this.fileError.set(rejected.length ? `Skipped ${rejected.join(', ')}.` : '');
  }

  protected removePhoto(photo: PickedPhoto): void {
    this.photos.update((kept) => kept.filter((item) => item.key !== photo.key));
    this.fileError.set('');
  }

  /** Bytes as `640 KB` or `2.4 MB`, whichever reads better at that magnitude. */
  protected size(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    if (this.status() === 'sending' || this.compressing()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const firstBad = this.panel()?.nativeElement.querySelector<HTMLElement>(
        '.rm-field--invalid input, .rm-field--invalid select',
      );
      firstBad?.focus();
      return;
    }

    if (this.totalBytes() > this.limits.maxPayloadBytes) {
      this.status.set('error');
      this.errorMessage.set(
        `Those photos come to ${this.size(this.totalBytes())}, over the ${this.size(this.limits.maxPayloadBytes)} limit. Please remove one and try again.`,
      );
      return;
    }

    // `send` navigates the page, so on the happy path this is the last thing
    // that runs here. The spinner covers the moment before the browser leaves.
    this.status.set('sending');
    this.errorMessage.set('');

    try {
      const answers = this.form.getRawValue();
      this.estimate.send({
        ...answers,
        // `14:30` means nothing at a glance in an inbox at 6am.
        preferredTime: formatTime(answers.preferredTime),
        photos: this.photos().map((photo) => photo.file),
      });
    } catch (error) {
      this.status.set('error');
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
    }
  }

  /** A backdrop click is swallowed on purpose. See the class comment. */
  protected onBackdropClick(): void {
    if (this.status() === 'sent') return;
    this.nudging.set(true);
    setTimeout(() => this.nudging.set(false), 420);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.estimate.isOpen()) this.estimate.close();
  }

  /**
   * Keeps Tab inside the panel. Without this, tabbing past the last field walks
   * into the page behind the overlay, where nothing is visible to focus.
   *
   * Bound to plain `keydown` rather than `keydown.tab`: Angular's key plugin
   * treats a held modifier as part of the name, so `keydown.tab` never fires for
   * Shift+Tab — which is exactly the direction that needs trapping at the top.
   */
  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Tab') return;

    const root = this.panel()?.nativeElement;
    if (!this.estimate.isOpen() || !root) return;

    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && (active === first || !root.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

/**
 * Identifies the file the visitor chose. Name, size and timestamp together are
 * as close to a stable identity as the File API offers, and are enough to tell
 * a double-click apart from two genuinely different photos.
 */
function photoKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/**
 * `14:30` becomes `2:30 PM`. An empty value stays empty, and the service turns
 * that into "No preference".
 *
 * The input hands over a 24-hour `HH:MM` string regardless of how the browser
 * chose to display it, so this is the only place the visitor's locale and the
 * owner's reading of the email are reconciled.
 */
export function formatTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;

  const hours = Number(match[1]);
  if (!Number.isInteger(hours) || hours > 23) return value;

  const suffix = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${match[2]} ${suffix}`;
}
