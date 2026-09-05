import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon';
import { TESTIMONIALS, stars } from '../../../core/content';

@Component({
  selector: 'rm-reviews',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rm-reviews" id="reviews">
      <div class="rm-container">

        <div class="rm-section-head">
          <h2 class="rm-h2">What our customers say</h2>
        </div>

        <div class="rm-reviews__grid">
          @for (review of reviews; track review.author) {
            <figure class="rm-review">
              <div class="rm-stars" role="img"
                   [attr.aria-label]="review.rating + ' out of 5 stars'">
                @for (star of stars(review.rating); track star) {
                  <rm-icon name="star" />
                }
              </div>
              <blockquote class="rm-review__text">&ldquo;{{ review.text }}&rdquo;</blockquote>
              <figcaption class="rm-review__by">
                <rm-icon name="house" />
                {{ review.author }}
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
}
