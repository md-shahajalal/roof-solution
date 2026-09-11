import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EstimateModalComponent, formatTime } from './estimate-modal';
import { EstimateService } from '../../core/estimate.service';
import { ESTIMATE_FORM } from '../../core/site.config';

/** The questions that can be shown or hidden. Name and phone are always asked. */
type OptionalField =
  | 'email'
  | 'city'
  | 'propertyAddress'
  | 'propertyType'
  | 'service'
  | 'description'
  | 'preferredDate'
  | 'preferredTime'
  | 'photos';

/**
 * Which of them the form shows right now.
 *
 * Mirrors the HIDDEN FIELD blocks in estimate-modal.html: when you show or hide
 * a field there, add or remove it here and the suite follows. The field-by-field
 * checks cover whatever combination this lists, and a test that needs a field
 * which is hidden skips itself rather than failing.
 */
const SHOWN: ReadonlySet<OptionalField> = new Set<OptionalField>([
  'propertyAddress',
  'service',
  'photos',
]);

/** Where each field sits in the page, and the row it produces in the email. */
const FIELDS: Record<OptionalField, { selector: string; row: string }> = {
  email: { selector: '#rm-email', row: 'email' },
  city: { selector: '#rm-city', row: 'City' },
  propertyAddress: { selector: '#rm-address', row: 'Property address' },
  propertyType: { selector: 'input[type="radio"]', row: 'Type of property' },
  service: { selector: '#rm-service', row: 'Roofing service needed' },
  description: { selector: '#rm-description', row: 'Description of the issue or project' },
  preferredDate: { selector: '#rm-date', row: 'Preferred date for inspection' },
  preferredTime: { selector: '#rm-time', row: 'Preferred time' },
  photos: { selector: '#rm-photos', row: 'Photos attached' },
};

const ALL = Object.keys(FIELDS) as OptionalField[];

/** Runs while every named field is shown; skipped, not deleted, otherwise. */
const withFields = (...fields: OptionalField[]) => it.runIf(fields.every((f) => SHOWN.has(f)));

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

  /** Fills what is required: name, phone, and each required field that is shown. */
  function fillRequired(): void {
    type('#rm-name', 'Jane Doe');
    type('#rm-phone', '(707) 555-0123');
    if (SHOWN.has('service')) type('#rm-service', 'Roof Repair');
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

  it('shows exactly the fields SHOWN lists, besides name and phone', async () => {
    estimate.open();
    await fixture.whenStable();

    expect(field('#rm-name')).toBeTruthy();
    expect(field('#rm-phone')).toBeTruthy();

    // Hidden means commented out, not merely styled away: absent from the DOM.
    for (const name of ALL) {
      const present = fixture.nativeElement.querySelector(FIELDS[name].selector) !== null;
      expect(present, `${name} should be ${SHOWN.has(name) ? 'shown' : 'hidden'}`).toBe(
        SHOWN.has(name),
      );
    }
  });

  withFields('photos')('labels the photos as optional', async () => {
    estimate.open();
    await fixture.whenStable();

    const photoField = field('#rm-photos').closest('.rm-field');
    expect(photoField?.querySelector('.rm-optional')?.textContent).toContain('optional');
  });

  withFields('service')('offers every service the business provides', async () => {
    estimate.open();
    await fixture.whenStable();

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

  withFields('propertyAddress')('sends without a property address, since it is optional', async () => {
    estimate.open();
    await fixture.whenStable();
    fillRequired();
    await fixture.whenStable();

    submitForm();
    await fixture.whenStable();

    expect(submitted).toHaveLength(1);
    // Asked but left blank: the row stays, so the owner can see it was asked.
    expect(new FormData(submitted[0]).get('Property address')).toBe('—');
  });

  withFields('propertyAddress')('labels the property address as optional', async () => {
    estimate.open();
    await fixture.whenStable();

    const label = fixture.nativeElement.querySelector('label[for="rm-address"]');
    expect(label?.querySelector('.rm-optional')?.textContent).toContain('optional');
    expect(label?.querySelector('.rm-req')).toBeNull();
  });

  withFields('service')('requires the roofing service', async () => {
    estimate.open();
    await fixture.whenStable();
    fillRequired();
    type('#rm-service', '');
    await fixture.whenStable();

    submitForm();
    await fixture.whenStable();

    expect(submitted).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('#rm-service-err')?.textContent).toContain(
      'pick the service',
    );
  });

  it('builds a FormSubmit POST with a row for every question asked, and none for the rest', async () => {
    estimate.open();
    await fixture.whenStable();

    fillRequired();
    if (SHOWN.has('propertyAddress')) type('#rm-address', '19 Example St');
    if (SHOWN.has('email')) type('#rm-email', 'jane@example.com');
    if (SHOWN.has('city')) type('#rm-city', 'Vallejo');
    if (SHOWN.has('description')) type('#rm-description', 'Leak over the back bedroom.');
    if (SHOWN.has('preferredTime')) type('#rm-time', '14:30');
    if (SHOWN.has('propertyType')) {
      (fixture.nativeElement.querySelector('input[type="radio"]') as HTMLInputElement).click();
    }
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

    // What each shown question should read as in the email.
    const expected: Record<OptionalField, string> = {
      email: 'jane@example.com',
      city: 'Vallejo',
      propertyAddress: '19 Example St',
      propertyType: 'Residential',
      service: 'Roof Repair',
      description: 'Leak over the back bedroom.',
      // Left blank on purpose: the owner is told rather than left guessing.
      preferredDate: 'No preference',
      // Sent in 12-hour form: `14:30` is a puzzle to read in an inbox.
      preferredTime: '2:30 PM',
      // None picked in this test.
      photos: 'None',
    };

    for (const name of ALL) {
      const { row } = FIELDS[name];
      if (SHOWN.has(name)) {
        expect(sent.get(row), `row for ${name}`).toBe(expected[name]);
      } else {
        // A question that was not asked leaves no row, rather than a dash.
        expect(sent.has(row), `${name} is hidden, so no "${row}" row`).toBe(false);
      }
    }

    // Reply-To exists only when there is an address to reply to.
    if (SHOWN.has('email')) {
      expect(sent.get('_replyto')).toBe('jane@example.com');
    } else {
      expect(sent.has('_replyto')).toBe(false);
      expect(sent.has('Email address')).toBe(false);
    }

    const about = SHOWN.has('service') ? ' (Roof Repair)' : '';
    expect(sent.get('_subject')).toBe(`Free estimate request — Jane Doe${about}`);
    // Honeypot must go out empty, otherwise every submission looks like a bot.
    expect(sent.get('_honey')).toBe('');
  });

  withFields('email')('sends without an email address, and says so in the email', async () => {
    estimate.open();
    await fixture.whenStable();
    fillRequired();
    await fixture.whenStable();

    submitForm();
    await fixture.whenStable();

    expect(submitted).toHaveLength(1);
    const sent = new FormData(submitted[0]);
    expect(sent.get('Email address')).toBe('Not provided');
    // No address to reply to, so neither field FormSubmit reads for one.
    expect(sent.has('email')).toBe(false);
    expect(sent.has('_replyto')).toBe(false);
  });

  withFields('email')('still rejects an email address that is filled in but malformed', async () => {
    estimate.open();
    await fixture.whenStable();
    fillRequired();
    type('#rm-email', 'not-an-email');
    await fixture.whenStable();

    submitForm();
    await fixture.whenStable();

    expect(submitted).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('#rm-email-err')?.textContent).toContain(
      'check the email address',
    );
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

  withFields('photos')('attaches the photos as files under the name FormSubmit expects', async () => {
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

  withFields('photos')('refuses to send rather than dropping photos a browser cannot attach', async () => {
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

  withFields('photos')('keeps every photo from one multi-select', async () => {
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

  withFields('photos')('adds to the list across separate picks, and ignores a repeat of the same file', async () => {
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

  withFields('photos')('keeps two different photos that happen to share a name', async () => {
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

  withFields('photos')('removes only the photo whose button was pressed', async () => {
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

  withFields('photos')('accepts photos dropped on the picker, not just chosen through it', async () => {
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

  withFields('photos')('rejects a file that is not an image', async () => {
    estimate.open();
    await fixture.whenStable();

    await pickPhoto(new File(['%PDF'], 'quote.pdf', { type: 'application/pdf' }));

    expect(fixture.nativeElement.querySelector('.rm-upload__list')).toBeNull();
    expect(fixture.nativeElement.querySelector('.rm-field__error')?.textContent).toContain(
      'not an image',
    );
  });

  it('refuses to send a link in a free-text field, and says why', async () => {
    estimate.open();
    await fixture.whenStable();

    fillRequired();
    type('#rm-name', 'Jane http://spam.example.com');
    await fixture.whenStable();

    submitForm();
    await fixture.whenStable();

    expect(submitted).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('#rm-name-err')?.textContent).toContain(
      'remove the web address',
    );
  });

  withFields('propertyAddress')('refuses a link in the property address too', async () => {
    estimate.open();
    await fixture.whenStable();

    fillRequired();
    type('#rm-address', 'Visit www.spam-roofing.example');
    await fixture.whenStable();

    submitForm();
    await fixture.whenStable();

    expect(submitted).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('#rm-address-err')?.textContent).toContain(
      'remove the web address',
    );
  });

  withFields('description')('lets an ordinary description through untouched', async () => {
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
