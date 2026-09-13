import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { TESTIMONIALS, stars } from '../../../core/content';

/**
 * TODO(client): replace these with real reviews, ideally copied from Google with
 * the customer's permission. Reviews that turn out to be placeholders do more
 * damage to trust than having no reviews section at all.
 */
@Component({
  selector: 'rm-reviews',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-reviews" id="reviews">
      <div class="rm-container">

        <div class="rm-section-head">
          <p class="rm-eyebrow">Reviews</p>
          <h2 class="rm-h2">What customers say about R&amp;M</h2>
        </div>

        <div class="rm-reviews__grid">
          @for (review of reviews; track review.author) {
            <figure class="rm-review">
              <span class="rm-review__mark" aria-hidden="true"><rm-icon name="quote" /></span>
              <div class="rm-stars" role="img" [attr.aria-label]="review.rating + ' out of 5 stars'">
                @for (star of stars(review.rating); track star) {
                  <rm-icon name="star" />
                }
              </div>
              <blockquote class="rm-review__text">{{ review.text }}</blockquote>
              <figcaption class="rm-review__by">
                <span class="rm-review__avatar" aria-hidden="true">{{ initials(review.author) }}</span>
                <span class="rm-review__name">{{ review.author }}</span>
              </figcaption>
            </figure>
          }
        </div>

      </div>
    </section>
  `,
})
export class ReviewsComponent {
  protected readonly reviews = TESTIMONIALS;
  protected readonly stars = stars;

  /** "Sarah Mitchell" becomes "SM" for the avatar circle. */
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }
}
