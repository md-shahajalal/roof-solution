import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { afterEach, describe, expect, it } from 'vitest';
import { WORK_TILES, WorkComponent, parseWorkPhotos } from './work';
import { WORK_PHOTOS } from '../../../core/content';

/** `count` photos, shaped the way public/data/work.json writes them. */
const photos = (count: number, from = 0) =>
  Array.from({ length: count }, (_, n) => {
    const i = from + n;
    return { image: `/images/work/${i}.jpg`, caption: `Caption ${i}`, alt: `Photo ${i}` };
  });

/**
 * work.json is edited by hand in cPanel, so the parser is what stands between a
 * stray typo and a gallery that silently disappears.
 */
describe('parseWorkPhotos', () => {
  it('reads photos in the shape work.json uses', () => {
    const parsed = parseWorkPhotos({ _howToEdit: 'ignored', photos: photos(3) });

    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({ image: '/images/work/0.jpg', caption: 'Caption 0', alt: 'Photo 0' });
  });

  it('accepts a bare array as well as { "photos": [...] }', () => {
    expect(parseWorkPhotos(photos(2))).toEqual(parseWorkPhotos({ photos: photos(2) }));
  });

  it('still loads a file saved in the old tabbed shape, groups run together in order', () => {
    const parsed = parseWorkPhotos({
      phases: [
        { title: 'Tear-off and new decking', photos: photos(5) },
        { title: 'Finished roof', photos: photos(8, 5) },
      ],
    });

    expect(parsed.map((photo) => photo.image)).toEqual(photos(13).map((photo) => photo.image));
  });

  it('skips a photo with no image', () => {
    const parsed = parseWorkPhotos({ photos: [{ image: '/a.jpg' }, { caption: 'no image' }, { image: '  ' }] });
    expect(parsed.map((photo) => photo.image)).toEqual(['/a.jpg']);
  });

  it('falls back to the caption for alt text when alt is missing', () => {
    const [photo] = parseWorkPhotos([{ image: '/a.jpg', caption: 'Ridge vent' }]);
    expect(photo).toEqual({ image: '/a.jpg', caption: 'Ridge vent', alt: 'Ridge vent' });
  });

  it('returns nothing for JSON of the wrong shape instead of throwing', () => {
    expect(parseWorkPhotos(null)).toEqual([]);
    expect(parseWorkPhotos({ reviews: [] })).toEqual([]);
    expect(parseWorkPhotos('not json')).toEqual([]);
  });
});

/**
 * Every photo sits on the page at once, up to a grid that ends flush; the rest
 * are in the viewer, never behind a tab or a button that grows the page.
 */
describe('WorkComponent gallery', () => {
  const nativeFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = nativeFetch;
    document.body.classList.remove('rm-lightbox-open');
  });

  async function render(count: number): Promise<ComponentFixture<WorkComponent>> {
    return renderWith((async () => ({ ok: true, json: async () => ({ photos: photos(count) }) })) as unknown as typeof fetch);
  }

  async function renderWith(fakeFetch: typeof fetch): Promise<ComponentFixture<WorkComponent>> {
    globalThis.fetch = fakeFetch;

    await TestBed.configureTestingModule({
      imports: [WorkComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    const fixture = TestBed.createComponent(WorkComponent);
    // Let the mocked fetch resolve, then let the view catch up.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
    return fixture;
  }

  const el = (fixture: ComponentFixture<WorkComponent>) => fixture.nativeElement as HTMLElement;
  const tiles = (fixture: ComponentFixture<WorkComponent>) =>
    el(fixture).querySelectorAll<HTMLButtonElement>('.rm-work__item');

  it('shows every photo with no tabs, the first one leading', async () => {
    const fixture = await render(WORK_TILES);

    expect(tiles(fixture)).toHaveLength(WORK_TILES);
    expect(el(fixture).querySelector('[role="tab"]')).toBeNull();
    expect(el(fixture).querySelector('.rm-work__grid')?.classList).toContain('has-feature');
    expect(el(fixture).querySelector('.rm-work__rest:not(.rm-work__rest--tablet)')).toBeNull();
  });

  it('caps the grid and counts the rest on the last tile', async () => {
    const fixture = await render(20);

    expect(tiles(fixture)).toHaveLength(WORK_TILES);
    expect(el(fixture).querySelector('.rm-work__rest:not(.rm-work__rest--tablet)')?.textContent).toContain('+7');
    expect(el(fixture).querySelector('.rm-work__rest--tablet')?.textContent).toContain('+8');
  });

  const tileImages = (fixture: ComponentFixture<WorkComponent>) =>
    Array.from(tiles(fixture)).map((tile) => tile.querySelector('img')?.getAttribute('src'));

  it('shows the built-in photos when work.json is missing', async () => {
    const fixture = await renderWith((async () => ({ ok: false, status: 404 })) as unknown as typeof fetch);
    expect(tileImages(fixture)).toEqual(WORK_PHOTOS.slice(0, WORK_TILES).map((photo) => photo.image));
  });

  it('shows the built-in photos when work.json holds no usable photo', async () => {
    const fixture = await renderWith((async () => ({ ok: true, json: async () => ({ photos: [] }) })) as unknown as typeof fetch);
    expect(tileImages(fixture)).toEqual(WORK_PHOTOS.slice(0, WORK_TILES).map((photo) => photo.image));
  });

  it('skips the lead tile for a handful of photos', async () => {
    const fixture = await render(3);

    expect(tiles(fixture)).toHaveLength(3);
    expect(el(fixture).querySelector('.rm-work__grid')?.classList).not.toContain('has-feature');
  });

  it('lets the viewer step past the grid into the rest', async () => {
    const fixture = await render(20);

    tiles(fixture)[WORK_TILES - 1].click();
    await fixture.whenStable();
    expect(el(fixture).querySelector('.rm-lightbox__count')?.textContent).toContain('13 / 20');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await fixture.whenStable();
    expect(el(fixture).querySelector('.rm-lightbox__count')?.textContent).toContain('14 / 20');
  });
});
