import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { afterEach, describe, expect, it } from 'vitest';
import { ReviewsComponent, parseReviews } from './reviews';

const review = (author: string) => ({ author, text: `Review by ${author}`, rating: 5 });

describe('parseReviews', () => {
  it('accepts a bare array as well as { "reviews": [...] }', () => {
    const reviews = [review('Sarah Mitchell')];
    expect(parseReviews(reviews)).toEqual(parseReviews({ reviews }));
    expect(parseReviews(reviews)).toHaveLength(1);
  });

  it('skips an entry with no text or name, and repairs a bad rating', () => {
    const parsed = parseReviews([
      { author: 'Kept', text: 'Great job', rating: 9 },
      { author: '', text: 'No name' },
      { author: 'No text' },
    ]);
    expect(parsed).toEqual([{ author: 'Kept', text: 'Great job', rating: 5 }]);
  });
});

/**
 * jsdom has no layout, so the scrolling itself is checked in a real browser.
 * What is checked here is the structure the loop depends on, and that it stays
 * honest for screen readers and keyboard users.
 */
describe('ReviewsComponent', () => {
  const nativeFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = nativeFetch;
  });

  async function render(...authors: string[]): Promise<ComponentFixture<ReviewsComponent>> {
    const reviews = authors.map(review);
    globalThis.fetch = (async () => ({ ok: true, json: async () => ({ reviews }) })) as unknown as typeof fetch;

    await TestBed.configureTestingModule({
      imports: [ReviewsComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReviewsComponent);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
    return fixture;
  }

  const slides = (fixture: ComponentFixture<ReviewsComponent>) =>
    Array.from(fixture.nativeElement.querySelectorAll('.rm-slider__slide')) as HTMLElement[];

  it('lays the reviews out three times so there is always a next card, even with only three', async () => {
    const fixture = await render('A', 'B', 'C');

    expect(slides(fixture)).toHaveLength(9);
    expect(slides(fixture).map((slide) => slide.querySelector('.rm-review__name')?.textContent)).toEqual([
      'A', 'B', 'C', 'A', 'B', 'C', 'A', 'B', 'C',
    ]);
  });

  it('hides the two outer copies from screen readers and keyboard focus', async () => {
    const fixture = await render('A', 'B', 'C');
    const visible = slides(fixture).filter((slide) => !slide.hasAttribute('aria-hidden'));

    expect(visible.map((slide) => slide.getAttribute('aria-label'))).toEqual(['1 of 3', '2 of 3', '3 of 3']);
    expect(slides(fixture).filter((slide) => slide.hasAttribute('inert'))).toHaveLength(6);
  });

  it('shows one dot per review, not per copy', async () => {
    const fixture = await render('A', 'B', 'C');
    expect(fixture.nativeElement.querySelectorAll('.rm-slider__dot')).toHaveLength(3);
  });

  it('keeps the strip clean: no arrow or pause buttons, only the dots', async () => {
    const fixture = await render('A', 'B', 'C');
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.rm-slider__controls button')) as HTMLElement[];

    expect(buttons).toHaveLength(3);
    expect(buttons.every((button) => button.classList.contains('rm-slider__dot'))).toBe(true);
  });

  it('shows a single review plainly, with nothing to loop or control', async () => {
    const fixture = await render('A');

    expect(slides(fixture)).toHaveLength(1);
    expect(slides(fixture)[0].hasAttribute('aria-hidden')).toBe(false);
    expect(fixture.nativeElement.querySelector('.rm-slider__controls')).toBeNull();
  });
});
