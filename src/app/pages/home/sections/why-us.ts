import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { FEATURES, WHY_US_PHOTO } from '../../../core/content';
import { SITE } from '../../../core/site.config';
import type { WhyUsPhoto } from '../../../core/models';

/**
 * Where the section's photo is chosen. Like work.json, the file sits in public/,
 * so the client can swap the photo in cPanel with no rebuild. Until it arrives,
 * or if it is missing or broken, the built-in photo in content.ts is shown.
 */
const WHY_US_URL = 'data/why-us.json';

/**
 * A soft tinted band between two white sections: enough of a change of ground
 * to give a long page some rhythm, without the eye strain of a dark block.
 */
@Component({
  selector: 'rm-why-us',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-why" id="about">
      <div class="rm-container rm-why__inner">

        <div class="rm-why__visual">
          <img class="rm-why__photo" [src]="photo().image" [alt]="photo().alt"
               width="768" height="860" loading="lazy" decoding="async">

          <!-- The motto is the brand's own promise, so it sits with the logo on the
               photograph rather than competing with the headline in the hero. Top
               right, as the client asked, over sky rather than the roof. -->
          <figure class="rm-why__badge">
            <img src="/images/logo.png" width="500" height="392" [alt]="site.name" loading="lazy">
            <figcaption>&ldquo;{{ site.motto }}&rdquo;</figcaption>
          </figure>
        </div>

        <div class="rm-why__copy">
          <p class="rm-eyebrow">Why choose R&amp;M</p>
          <h2 class="rm-h2">Built on faith. <span class="rm-accent">Focused on you.</span></h2>
          <p class="rm-lead">
            We treat every roof the way we would want our own home treated: honest advice,
            quality materials, and work we stand behind.
          </p>

          <ul class="rm-features">
            @for (feature of features; track feature.title) {
              <li class="rm-feature">
                <span class="rm-feature__icon"><rm-icon [name]="feature.icon" /></span>
                <span>
                  <span class="rm-feature__title">{{ feature.title }}</span>
                  <span class="rm-feature__text">{{ feature.text }}</span>
                </span>
              </li>
            }
          </ul>
        </div>

      </div>
    </section>
  `,
})
export class WhyUsComponent {
  protected readonly features = FEATURES;
  protected readonly site = SITE;
  protected readonly photo = signal<WhyUsPhoto>(WHY_US_PHOTO);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      // no-cache: revalidate with the server on each visit, so an edit made in
      // cPanel shows up straight away rather than when the browser cache expires.
      const response = await fetch(new URL(WHY_US_URL, document.baseURI), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const photo = parseWhyUsPhoto(await response.json());
      if (!photo) throw new Error('no image path in the file');
      this.photo.set(photo);
    } catch (error) {
      console.error(`Could not load the photo from ${WHY_US_URL}. Is the JSON valid? Showing the built-in photo.`, error);
    }
  }
}

/**
 * The JSON is edited by hand, so accept either `{ "photo": { ... } }` or the
 * image and alt at the top level. No image path means null, so the caller keeps
 * the photo it has rather than showing a broken one.
 */
export function parseWhyUsPhoto(data: unknown): WhyUsPhoto | null {
  const root = data as { photo?: unknown } | null;
  const raw = (root?.photo && typeof root.photo === 'object' ? root.photo : root) as
    Partial<Record<keyof WhyUsPhoto, unknown>> | null;
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

  const image = text(raw?.image);
  if (!image) return null;
  return { image, alt: text(raw?.alt) || `A roof completed by ${SITE.name}` };
}
