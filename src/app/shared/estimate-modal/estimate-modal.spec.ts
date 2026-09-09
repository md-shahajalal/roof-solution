import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EstimateModalComponent, formatTime } from './estimate-modal';
import { EstimateService } from '../../core/estimate.service';
import { ESTIMATE_FORM } from '../../core/site.config';

/**
 * Covers the behaviours the client asked for by name: the dialog opens from a
 * button, it survives a backdrop click, and a completed form is handed to
 * FormSubmit with the photos still attached.
 *
 * Submission is a real form navigation, which jsdom refuses to perform, so
 * `HTMLFormElement.prototype.submit` is replaced with a recorder. That is also
 * what makes the built request inspectable, which is the interesting part.
 */
describe('EstimateModalComponent', () => {
  let fixture: ComponentFixture<EstimateModalComponent>;
  let estimate: EstimateService;
  let submitted: HTMLFormElement[];
  let installedDataTransfer = false;

  const nativeSubmit = HTMLFormElement.prototype.submit;
  const nativeCreateObjectURL = URL.createObjectURL;
  const nativeFilesDescriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'files',
  )!;

  const panel = () => fixture.nativeElement.querySelector('.rm-modal__panel');
  const field = (selector: string) =>
    fixture.nativeElement.querySelector(selector) as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement;

  function type(selector: string, value: string): void {
    const el = field(selector);
    el.value = value;
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('change'));
  }

  /** Fills only what is required, so each test can add what it cares about. */
  function fillRequired(): void {
    type('#rm-name', 'Jane Doe');
    type('#rm-phone', '(707) 555-0123');
    type('#rm-email', 'jane@example.com');
    type('#rm-service', 'Roof Repair');
  }

  const submitForm = () =>
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

  /** Drives the file picker, which jsdom will not populate on its own. */
  async function pickPhoto(...files: File[]): Promise<void> {
    const picker = field('#rm-photos') as HTMLInputElement;
    Object.defineProperty(picker, 'files', { value: files, configurable: true });
    picker.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  /**
   * Stands in for two things jsdom does not provide.
   *
   * First `DataTransfer`, which is the only way to put chosen files onto an
   * input the visitor did not pick them on. Second the `files` setter, which in
   * jsdom only accepts a genuine `FileList` — a type nothing outside the engine
   * can construct. Real browsers have both (Safari since 14.1) and hand the
   * setter a real `FileList`, so shimming them here tests the production path
   * rather than skipping it. The case where `DataTransfer` is genuinely absent
   * has its own test below.
   */
  function installDataTransfer(): void {
    class TestDataTransfer {
      private readonly chosen: File[] = [];
      readonly items = { add: (file: File) => void this.chosen.push(file) };
      get files(): FileList {
        const chosen = this.chosen;
        return Object.assign(Object.create(null), chosen, {
          length: chosen.length,
          item: (index: number) => chosen[index] ?? null,
        }) as FileList;
      }
    }
    Object.defineProperty(globalThis, 'DataTransfer', {
      value: TestDataTransfer,
      configurable: true,
      writable: true,
    });

    const held = new WeakMap<HTMLInputElement, FileList>();
    Object.defineProperty(HTMLInputElement.prototype, 'files', {
      configurable: true,
      get(this: HTMLInputElement) {
        return held.get(this) ?? null;
      },
      set(this: HTMLInputElement, value: FileList) {
        held.set(this, value);
      },
    });

    installedDataTransfer = true;
  }

  beforeEach(async () => {
    submitted = [];
    HTMLFormElement.prototype.submit = function (this: HTMLFormElement) {
      submitted.push(this);
    };

    // jsdom decodes no images at all: `createImageBitmap` is missing, and an
    // <img> given a blob URL fires neither load nor error, so the fallback would
    // sit there until its timeout. Making the object URL throw takes the decoder
    // straight to the answer a browser reaches when it cannot read the format —
    // compression is skipped and the original file is kept. That is the path
    // these tests run on, and it is a real one.
    URL.createObjectURL = () => {
      throw new Error('no decoding in jsdom');
    };

    await TestBed.configureTestingModule({
      imports: [EstimateModalComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(EstimateModalComponent);
    estimate = TestBed.inject(EstimateService);
    await fixture.whenStable();
  });

  afterEach(() => {
    HTMLFormElement.prototype.submit = nativeSubmit;
    URL.createObjectURL = nativeCreateObjectURL;
    if (installedDataTransfer) {
      Reflect.deleteProperty(globalThis, 'DataTransfer');
      Object.defineProperty(HTMLInputElement.prototype, 'files', nativeFilesDescriptor);
      installedDataTransfer = false;
    }
    document.body.classList.remove('rm-modal-open');
    document.querySelectorAll('form[hidden]').forEach((form) => form.remove());
  });

  it('stays out of the DOM until it is opened', () => {
    expect(panel()).toBeNull();
  });

  it('renders every requested field once open', async () => {
    estimate.open();
    await fixture.whenStable();

    for (const id of [
      '#rm-name',
      '#rm-phone',
      '#rm-email',
      '#rm-address',
      '#rm-city',
      '#rm-service',
      '#rm-description',
      '#rm-date',
      '#rm-time',
      '#rm-photos',
    ]) {
      expect(field(id), `missing ${id}`).toBeTruthy();
    }

    // Angular's RadioControlValueAccessor claims `[value]` for itself and never
    // writes it to the DOM, so the visible labels are what there is to assert
    // here. The value that actually gets submitted is checked further down.
    const propertyTypes = Array.from(
      fixture.nativeElement.querySelectorAll('.rm-choice__box'),
    ).map((el) => (el as HTMLElement).textContent?.trim());
    expect(propertyTypes).toEqual(['Residential', 'Commercial']);

    const services = Array.from(fixture.nativeElement.querySelectorAll('#rm-service option'))
      .map((el) => (el as HTMLOptionElement).value)
      .filter(Boolean);
    expect(services).toEqual([
      'Roof Replacement',
      'Roof Repair',
      'Roof Inspection',
      'Storm Damage',
      'Maintenance',
      'Other',
    ]);
  });

  it('does NOT close when the backdrop is clicked', async () => {
    estimate.open();
    await fixture.whenStable();

    fixture.nativeElement.querySelector('.rm-modal').click();
    await fixture.whenStable();

    expect(estimate.isOpen()).toBe(true);
    expect(panel()).not.toBeNull();
  });

  it('closes on the close button and on Escape', async () => {
    estimate.open();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.rm-modal__close').click();
    await fixture.whenStable();
    expect(estimate.isOpen()).toBe(false);

    estimate.open();
    await fixture.whenStable();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(estimate.isOpen()).toBe(false);
  });

  it('refuses to submit while required fields are empty', async () => {
    estimate.open();
    await fixture.whenStable();
    submitForm();
    await fixture.whenStable();

    expect(submitted).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('.rm-field--invalid').length).toBeGreaterThan(0);
  });

  it('builds a FormSubmit multipart POST carrying every answer', async () => {
    estimate.open();
    await fixture.whenStable();

    fillRequired();
    type('#rm-address', '19 Example St');
    type('#rm-city', 'Vallejo');
    type('#rm-description', 'Leak over the back bedroom.');
    type('#rm-time', '14:30');
    (fixture.nativeElement.querySelector('input[type="radio"]') as HTMLInputElement).click();
    await fixture.whenStable();

    submitForm();
    await fixture.whenStable();

    expect(submitted).toHaveLength(1);
    const form = submitted[0];

    expect(form.method.toUpperCase()).toBe('POST');
    expect(form.enctype).toBe('multipart/form-data');
    expect(form.action).toBe(`https://formsubmit.co/${ESTIMATE_FORM.endpointToken}`);

    const sent = new FormData(form);
    expect(sent.get('Full name')).toBe('Jane Doe');
    expect(sent.get('Phone number')).toBe('(707) 555-0123');
    // FormSubmit keys Reply-To off a field named exactly `email`.
    expect(sent.get('email')).toBe('jane@example.com');
    expect(sent.get('Roofing service needed')).toBe('Roof Repair');
    expect(sent.get('Type of property')).toBe('Residential');
    expect(sent.get('City')).toBe('Vallejo');
    expect(sent.get('Property address')).toBe('19 Example St');
    // Sent in 12-hour form: `14:30` is a puzzle to read in an inbox.
    expect(sent.get('Preferred time')).toBe('2:30 PM');
    // Nothing was picked, so the owner is told rather than left guessing.
    expect(sent.get('Preferred date for inspection')).toBe('No preference');
    expect(sent.get('Photos attached')).toBe('None');

    // Lets the owner hit Reply in Gmail and land in the customer's inbox.
    expect(sent.get('_replyto')).toBe('jane@example.com');
    expect(sent.get('_subject')).toContain('Jane Doe');
    // Honeypot must go out empty, otherwise every submission looks like a bot.
    expect(sent.get('_honey')).toBe('');
  });

  it('points _next back at the host it is being served from', async () => {
    estimate.open();
    await fixture.whenStable();
    fillRequired();
    await fixture.whenStable();

    submitForm();
    await fixture.whenStable();

    const next = new FormData(submitted[0]).get('_next') as string;
    // Derived from location rather than hardcoded, which is what lets one build
    // work unchanged on both Vercel and cPanel.
    expect(next.startsWith(window.location.origin)).toBe(true);
    expect(next).toContain(`${ESTIMATE_FORM.returnParam}=sent`);
  });

  it('attaches the photos as files under the name FormSubmit expects', async () => {
    installDataTransfer();

    estimate.open();
    await fixture.whenStable();
    fillRequired();
    await fixture.whenStable();

    // jsdom has no canvas, so compressImage falls back to the original file --
    // which is exactly the path being asserted here: an image that could not be
    // re-encoded still gets attached rather than dropped.
    await pickPhoto(new File(['fake-jpeg-bytes'], 'roof.jpg', { type: 'image/jpeg' }));

    expect(fixture.nativeElement.querySelector('.rm-upload__name')?.textContent).toContain(
      'roof.jpg',
    );

    submitForm();
    await fixture.whenStable();

    expect(submitted).toHaveLength(1);
    const form = submitted[0];
    const attachment = form.querySelector('input[type="file"]') as HTMLInputElement;
    expect(attachment).toBeTruthy();
    expect(attachment.name).toBe('attachment');
    expect(attachment.files?.length).toBe(1);
    expect(attachment.files?.[0].name).toBe('roof.jpg');

    // The filenames are repeated in the body so a missing attachment is visible
    // in the email rather than silent.
    expect(new FormData(form).get('Photos attached')).toBe('roof.jpg');
  });

  it('refuses to send rather than dropping photos a browser cannot attach', async () => {
    // No DataTransfer installed, which is the shape of a pre-14.1 Safari.
    expect(typeof DataTransfer).not.toBe('function');

    estimate.open();
    await fixture.whenStable();
    fillRequired();
    await fixture.whenStable();
    await pickPhoto(new File(['fake-jpeg-bytes'], 'roof.jpg', { type: 'image/jpeg' }));

    submitForm();
    await fixture.whenStable();

    expect(submitted).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.rm-form__alert')?.textContent).toContain(
      'too old to attach photos',
    );
  });

  it('keeps every photo from one multi-select', async () => {
    installDataTransfer();

    estimate.open();
    await fixture.whenStable();
    fillRequired();
    await fixture.whenStable();

    await pickPhoto(
      new File(['a'], 'north-slope.jpg', { type: 'image/jpeg', lastModified: 1 }),
      new File(['bb'], 'ridge.jpg', { type: 'image/jpeg', lastModified: 2 }),
      new File(['ccc'], 'gutter.jpg', { type: 'image/jpeg', lastModified: 3 }),
    );

    const listed = Array.from(
      fixture.nativeElement.querySelectorAll('.rm-upload__name'),
    ).map((el) => (el as HTMLElement).textContent);
    expect(listed).toEqual(['north-slope.jpg', 'ridge.jpg', 'gutter.jpg']);

    submitForm();
    await fixture.whenStable();

    // One input per file, each under its own name. A single `multiple` input
    // looked right here but arrived as one attachment: FormSubmit collapses
    // repeated parts that share a field name.
    const inputs = Array.from(
      submitted[0].querySelectorAll('input[type="file"]'),
    ) as HTMLInputElement[];
    expect(inputs).toHaveLength(3);
    expect(inputs.map((input) => input.name)).toEqual([
      'attachment',
      'attachment2',
      'attachment3',
    ]);
    expect(new Set(inputs.map((input) => input.name)).size).toBe(3);
    expect(inputs.map((input) => input.files?.[0].name)).toEqual([
      'north-slope.jpg',
      'ridge.jpg',
      'gutter.jpg',
    ]);
    for (const input of inputs) expect(input.files?.length).toBe(1);

    expect(new FormData(submitted[0]).get('Photos attached')).toBe(
      'north-slope.jpg, ridge.jpg, gutter.jpg',
    );
  });

  it('adds to the list across separate picks, and ignores a repeat of the same file', async () => {
    estimate.open();
    await fixture.whenStable();

    const first = new File(['a'], 'north-slope.jpg', { type: 'image/jpeg', lastModified: 1 });
    await pickPhoto(first);
    await pickPhoto(new File(['bb'], 'ridge.jpg', { type: 'image/jpeg', lastModified: 2 }));
    // Same file again: one photo, not two entries.
    await pickPhoto(first);

    const listed = Array.from(
      fixture.nativeElement.querySelectorAll('.rm-upload__name'),
    ).map((el) => (el as HTMLElement).textContent);
    expect(listed).toEqual(['north-slope.jpg', 'ridge.jpg']);
  });

  it('keeps two different photos that happen to share a name', async () => {
    estimate.open();
    await fixture.whenStable();

    // Two shots from different phones both called image.jpg. Deduplicating on
    // the name alone used to throw the second one away without saying so.
    await pickPhoto(
      new File(['a'], 'image.jpg', { type: 'image/jpeg', lastModified: 1 }),
      new File(['bbbb'], 'image.jpg', { type: 'image/jpeg', lastModified: 2 }),
    );

    expect(fixture.nativeElement.querySelectorAll('.rm-upload__item').length).toBe(2);
  });

  it('removes only the photo whose button was pressed', async () => {
    estimate.open();
    await fixture.whenStable();

    await pickPhoto(
      new File(['a'], 'one.jpg', { type: 'image/jpeg', lastModified: 1 }),
      new File(['bb'], 'two.jpg', { type: 'image/jpeg', lastModified: 2 }),
    );

    (fixture.nativeElement.querySelector('.rm-upload__remove') as HTMLElement).click();
    await fixture.whenStable();

    const listed = Array.from(
      fixture.nativeElement.querySelectorAll('.rm-upload__name'),
    ).map((el) => (el as HTMLElement).textContent);
    expect(listed).toEqual(['two.jpg']);
  });

  it('refuses to send a link in any free-text field, and says why', async () => {
    estimate.open();
    await fixture.whenStable();

    fillRequired();
    type('#rm-description', 'Great prices at http://spam.example.com');
    await fixture.whenStable();

    submitForm();
    await fixture.whenStable();

    expect(submitted).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('#rm-description-err')?.textContent).toContain(
      'remove the web address',
    );
  });

  it('lets an ordinary description through untouched', async () => {
    estimate.open();
    await fixture.whenStable();

    fillRequired();
    type('#rm-description', 'The shingles are cracked.The gutter leaks too. Roof is approx. 12 yrs old.');
    await fixture.whenStable();

    submitForm();
    await fixture.whenStable();

    expect(submitted).toHaveLength(1);
    expect(new FormData(submitted[0]).get('Description of the issue or project')).toContain(
      'shingles are cracked',
    );
  });

  it('accepts photos dropped on the picker, not just chosen through it', async () => {
    estimate.open();
    await fixture.whenStable();

    // jsdom has no DragEvent, and the handler only reads dataTransfer.files.
    const drop = new Event('drop') as Event & { dataTransfer: { files: File[] } };
    Object.defineProperty(drop, 'dataTransfer', {
      value: { files: [new File(['a'], 'dropped.jpg', { type: 'image/jpeg', lastModified: 1 })] },
    });
    fixture.nativeElement.querySelector('.rm-upload').dispatchEvent(drop);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.rm-upload__name')?.textContent).toBe(
      'dropped.jpg',
    );
  });

  it('rejects a file that is not an image', async () => {
    estimate.open();
    await fixture.whenStable();

    await pickPhoto(new File(['%PDF'], 'quote.pdf', { type: 'application/pdf' }));

    expect(fixture.nativeElement.querySelector('.rm-upload__list')).toBeNull();
    expect(fixture.nativeElement.querySelector('.rm-field__error')?.textContent).toContain(
      'not an image',
    );
  });
});

/**
 * The other half of the round trip: FormSubmit redirects the visitor back with
 * `?estimate=sent`, and that has to land on the thank-you panel rather than on
 * the empty form they just filled in.
 */
describe('EstimateModalComponent returning from FormSubmit', () => {
  const originalUrl = window.location.href;

  afterEach(() => {
    window.history.replaceState({}, '', originalUrl);
    document.body.classList.remove('rm-modal-open');
  });

  it('opens straight onto the confirmation and cleans the URL', async () => {
    window.history.replaceState({}, '', `/?${ESTIMATE_FORM.returnParam}=sent`);

    await TestBed.configureTestingModule({
      imports: [EstimateModalComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    const fixture = TestBed.createComponent(EstimateModalComponent);
    // Injecting is what constructs the service, which is what reads the URL.
    const estimate = TestBed.inject(EstimateService);
    await fixture.whenStable();

    expect(estimate.isOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('.rm-modal__done')).not.toBeNull();
    // A refresh must not replay a thank-you for an enquiry nobody sent.
    expect(window.location.search).not.toContain(ESTIMATE_FORM.returnParam);
  });
});

/** Noon and midnight are where every 12-hour conversion goes wrong. */
describe('formatTime', () => {
  it('converts the clock value the input produces', () => {
    expect(formatTime('09:05')).toBe('9:05 AM');
    expect(formatTime('14:30')).toBe('2:30 PM');
    expect(formatTime('00:15')).toBe('12:15 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('23:59')).toBe('11:59 PM');
    expect(formatTime('07:00')).toBe('7:00 AM');
  });

  it('passes anything it does not recognise straight through', () => {
    expect(formatTime('')).toBe('');
    expect(formatTime('whenever')).toBe('whenever');
    expect(formatTime('31:00')).toBe('31:00');
  });
});
