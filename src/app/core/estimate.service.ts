import { Injectable, signal } from '@angular/core';
import { ESTIMATE_FORM } from './site.config';

/** One submitted enquiry, exactly the field list the client asked for. */
export interface EstimateRequest {
  fullName: string;
  phone: string;

  // Present only while the matching field is shown (see HIDDEN FIELD in the
  // modal). Absent means the question was not asked, so `send` writes no row
  // for it; an empty string means it was asked and left blank.
  email?: string;
  propertyAddress?: string;
  city?: string;
  propertyType?: string;
  service?: string;
  description?: string;
  preferredDate?: string;
  preferredTime?: string;
  photos?: readonly File[];
}

/**
 * Owns the estimate modal's open/closed state and posts the form.
 *
 * State lives in a root service rather than in the modal component because four
 * different "Get a free estimate" buttons — two in the header, one in the hero,
 * one in the closing band — all need to open the same single instance that is
 * mounted once in `App`. A shared signal is cheaper than routing an output
 * through every section component in between.
 *
 * ── How the mail actually gets sent ──────────────────────────────────────────
 *
 * The site ships as static files to two different hosts, Vercel and Namecheap
 * cPanel. Neither a Vercel function nor a PHP script would run on both, so the
 * send has to happen from the browser. It goes to FormSubmit, which accepts a
 * cross-origin POST and relays it to the confirmed address.
 *
 * It is a real form navigation, not `fetch`. FormSubmit documents that file
 * uploads work, and separately that AJAX works, but never that files survive the
 * AJAX endpoint — and an AJAX call that quietly drops the photos would look
 * exactly like a success. A native submit is the documented path for
 * attachments, so it is the one taken here. The cost is a redirect out and back;
 * `_next` brings the visitor straight to the confirmation, and `readReturn()`
 * below turns that arrival back into the open modal's success panel.
 */
@Injectable({ providedIn: 'root' })
export class EstimateService {
  private readonly open$ = signal(false);
  /** True while the modal is mounted and visible. */
  readonly isOpen = this.open$.asReadonly();

  /** Set when this page load is FormSubmit returning a visitor after a send. */
  private readonly returned = signal(false);

  /** The element to hand focus back to when the modal closes. */
  private returnFocusTo: HTMLElement | null = null;

  constructor() {
    this.readReturn();
  }

  open(trigger?: HTMLElement | null): void {
    this.returnFocusTo = trigger ?? (document.activeElement as HTMLElement | null);
    this.open$.set(true);
    // The page behind a fixed-position overlay must not scroll with it.
    document.body.classList.add('rm-modal-open');
  }

  close(): void {
    if (!this.open$()) return;
    this.open$.set(false);
    document.body.classList.remove('rm-modal-open');
    this.returnFocusTo?.focus?.();
    this.returnFocusTo = null;
  }

  /**
   * Reports whether this opening should start on the thank-you panel, and clears
   * the flag so it only counts once.
   */
  consumeReturn(): boolean {
    const had = this.returned();
    if (had) this.returned.set(false);
    return had;
  }

  /**
   * Notices `?estimate=sent` on the URL, which is where `_next` drops the
   * visitor after FormSubmit accepts a submission, and reopens the modal on its
   * confirmation panel.
   *
   * The marker is stripped from the address bar straight away, so a refresh or a
   * shared link does not replay a thank-you for an enquiry nobody sent.
   */
  private readReturn(): void {
    const params = new URLSearchParams(window.location.search);
    if (params.get(ESTIMATE_FORM.returnParam) !== 'sent') return;

    this.returned.set(true);

    params.delete(ESTIMATE_FORM.returnParam);
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (query ? `?${query}` : '') + window.location.hash,
    );

    this.open();
  }

  /**
   * Hands the enquiry to FormSubmit and navigates. On success nothing after this
   * call runs in the current page, so there is no success branch to return to;
   * it throws only when the request could not be built at all.
   */
  send(request: EstimateRequest): void {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = ESTIMATE_FORM.endpoint;
    form.enctype = 'multipart/form-data';
    form.hidden = true;

    const field = (name: string, value: string) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.append(input);
    };

    // FormSubmit reads every underscore-prefixed name as an instruction rather
    // than as a form field, so none of these appear in the email body.
    const about = request.service ? ` (${request.service})` : '';
    field('_subject', `Free estimate request — ${request.fullName}${about}`);
    field('_template', 'table');
    field('_captcha', String(ESTIMATE_FORM.captcha));
    // Built from the current origin so the same bundle returns to whichever host
    // it happens to be served from, Vercel or cPanel, with no per-host config.
    field('_next', this.returnUrl());
    // Honeypot. A bot fills every field it finds; a human never sees this one,
    // so anything arriving with it set is discarded by FormSubmit.
    field('_honey', '');
    // Lets the owner hit Reply in Gmail and land in the customer's inbox. Only
    // when there is an inbox to land in: the address is optional.
    if (request.email) field('_replyto', request.email);


    field('Full name', request.fullName);
    field('Phone number', request.phone);
    if (request.email) {
      // Named `email`, not something prettier: FormSubmit only honours
      // `_replyto` when it can find a field by exactly that name.
      field('email', request.email);
    } else if (request.email !== undefined) {
      // Asked but left blank. Not `email`: FormSubmit may validate a field by
      // that name, and the owner should see plainly there is nothing to reply to.
      field('Email address', 'Not provided');
    }

    // A row per question actually asked. `undefined` means the field is hidden,
    // so no row; an empty answer still gets one, with a placeholder.
    const asked = (label: string, value: string | undefined, blank: string) => {
      if (value !== undefined) field(label, value || blank);
    };
    asked('Property address', request.propertyAddress, '—');
    asked('City', request.city, '—');
    asked('Type of property', request.propertyType, '—');
    asked('Roofing service needed', request.service, '—');
    asked('Description of the issue or project', request.description, '—');
    asked('Preferred date for inspection', request.preferredDate, 'No preference');
    asked('Preferred time', request.preferredTime, 'No preference');

    const photos = request.photos ?? [];
    if (request.photos !== undefined) {
      field('Photos attached', photos.length ? photos.map((photo) => photo.name).join(', ') : 'None');
    }

    if (photos.length) {
      // Better to stop here with something the visitor can act on than to send
      // an enquiry whose photos quietly went missing.
      if (typeof DataTransfer !== 'function') {
        throw new Error(
          'This browser is too old to attach photos. Please update it, or send your request without photos and email the pictures to us afterwards.',
        );
      }
      for (const [index, photo] of photos.entries()) {
        form.append(this.photoInput(photo, index));
      }
    }

    // A form has to be in the document to submit, and `form.submit()` is used
    // rather than a click so no submit handler can intercept it.
    document.body.append(form);
    form.submit();
  }

  /** Where FormSubmit sends the visitor once it has accepted the submission. */
  private returnUrl(): string {
    const url = new URL(window.location.href);
    url.searchParams.set(ESTIMATE_FORM.returnParam, 'sent');
    return url.toString();
  }

  /**
   * One input per photo, each under its own name.
   *
   * This is the shape FormSubmit asks for — "you can use several file input
   * fields within a form" — and it is not interchangeable with a single
   * `multiple` input. Sending every file as a repeated `attachment` part looked
   * correct from the browser and listed correctly in the email body, but only
   * one photo ever arrived: the parts collide on the field name and the last one
   * wins. Distinct names are what make all of them survive.
   *
   * A file input cannot have `files` assigned directly either, but it will
   * accept the `FileList` off a `DataTransfer`, which is the only way to attach
   * a file the visitor picked somewhere else — here, one that was re-encoded
   * after picking.
   */
  private photoInput(photo: File, index: number): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    // The first keeps the documented name; the rest just have to differ from it.
    input.name = index === 0 ? 'attachment' : `attachment${index + 1}`;

    const transfer = new DataTransfer();
    transfer.items.add(photo);
    input.files = transfer.files;

    return input;
  }
}
