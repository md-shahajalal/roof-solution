import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { afterEach, describe, expect, it } from 'vitest';
import { WORK_PAGE_SIZE, WorkComponent, parseWorkPhases } from './work';

/** A stage with `count` photos, shaped the way public/data/work.json writes them. */
const stage = (title: string, count: number) => ({
  title,
  photos: Array.from({ length: count }, (_, i) => ({
    image: `/images/work/${i}.jpg`,
    caption: `Caption ${i}`,
    alt: `Photo ${i}`,
  })),
});

/**
 * work.json is edited by hand in cPanel, so the parser is what stands between a
 * stray typo and a gallery that silently disappears.
 */
describe('parseWorkPhases', () => {
  it('reads stages in the shape work.json uses', () => {
    const phases = parseWorkPhases({
      _howToEdit: 'ignored',
      phases: [stage('Tear-off and new decking', 5), stage('Finished roof', 8)],
    });

    expect(phases.map((phase) => phase.title)).toEqual(['Tear-off and new decking', 'Finished roof']);
    expect(phases.map((phase) => phase.photos.length)).toEqual([5, 8]);
    expect(phases[0].photos[0]).toEqual({ image: '/images/work/0.jpg', caption: 'Caption 0', alt: 'Photo 0' });
  });

  it('picks a column count that makes the rows come out even', () => {
    const columns = (count: number) => parseWorkPhases([stage('Stage', count)])[0].columns;
    expect(columns(5)).toBe(5);
    expect(columns(8)).toBe(4);
    expect(columns(6)).toBe(3);
    expect(columns(7)).toBe(4);
    expect(columns(10)).toBe(5);
  });

  it('uses 4 columns for any tab long enough to page, however many photos', () => {
    const columns = (count: number) => parseWorkPhases([stage('Stage', count)])[0].columns;
    expect(columns(WORK_PAGE_SIZE + 1)).toBe(4);
    expect(columns(25)).toBe(4);
    expect(columns(500)).toBe(4);
  });

  it('accepts a bare array as well as { "phases": [...] }', () => {
    const phases = [stage('Stage', 2)];
    expect(parseWorkPhases(phases)).toEqual(parseWorkPhases({ phases }));
    expect(parseWorkPhases(phases)).toHaveLength(1);
  });

  it('skips a photo with no image, and drops a stage left empty', () => {
    const phases = parseWorkPhases({
      phases: [
        { title: 'Kept', photos: [{ image: '/a.jpg' }, { caption: 'no image' }] },
        { title: 'Dropped', photos: [{ caption: 'no image either' }] },
        { title: '', photos: [{ image: '/b.jpg' }] },
      ],
    });

    expect(phases.map((phase) => phase.title)).toEqual(['Kept']);
    expect(phases[0].photos).toHaveLength(1);
  });

  it('falls back to the caption for alt text when alt is missing', () => {
    const [phase] = parseWorkPhases([{ title: 'Stage', photos: [{ image: '/a.jpg', caption: 'Ridge vent' }] }]);
    expect(phase.photos[0]).toEqual({ image: '/a.jpg', caption: 'Ridge vent', alt: 'Ridge vent' });
  });

  it('returns nothing for JSON of the wrong shape instead of throwing', () => {
    expect(parseWorkPhases(null)).toEqual([]);
    expect(parseWorkPhases({ reviews: [] })).toEqual([]);
    expect(parseWorkPhases('not json')).toEqual([]);
  });
});

/**
 * A long work.json must not turn the section into most of the page: photos
 * arrive in batches, and the full list is one button press at a time away.
 */
describe('WorkComponent with a long photo list', () => {
  const nativeFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = nativeFetch;
  });

  async function render(...stages: ReturnType<typeof stage>[]): Promise<ComponentFixture<WorkComponent>> {
    globalThis.fetch = (async () => ({ ok: true, json: async () => ({ phases: stages }) })) as unknown as typeof fetch;

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

  const tiles = (fixture: ComponentFixture<WorkComponent>) =>
    fixture.nativeElement.querySelectorAll('.rm-work__item').length;
  const moreButton = (fixture: ComponentFixture<WorkComponent>) =>
    fixture.nativeElement.querySelector('.rm-work__more .rm-btn') as HTMLButtonElement | null;

  async function press(fixture: ComponentFixture<WorkComponent>): Promise<void> {
    moreButton(fixture)!.click();
    await fixture.whenStable();
  }

  it('shows one batch, adds a batch per press, then collapses back', async () => {
    const fixture = await render(stage('Big job', 30));

    expect(tiles(fixture)).toBe(12);
    expect(moreButton(fixture)?.textContent).toContain('Show 12 more photos');
    expect(fixture.nativeElement.querySelector('.rm-work__count')?.textContent).toContain('Showing 12 of 30');

    await press(fixture);
    expect(tiles(fixture)).toBe(24);
    // The last batch is only as big as what is left.
    expect(moreButton(fixture)?.textContent).toContain('Show 6 more photos');

    await press(fixture);
    expect(tiles(fixture)).toBe(30);
    expect(moreButton(fixture)?.textContent).toContain('Show fewer photos');

    await press(fixture);
    expect(tiles(fixture)).toBe(12);
  });

  it('shows every photo, and no button, when a tab fits in one batch', async () => {
    const fixture = await render(stage('Small job', 10));

    expect(tiles(fixture)).toBe(10);
    expect(moreButton(fixture)).toBeNull();
  });

  it('starts each tab on its first batch, whatever was expanded before', async () => {
    const fixture = await render(stage('First', 30), stage('Second', 40));

    await press(fixture);
    expect(tiles(fixture)).toBe(24);

    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');
    (tabs[1] as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(tiles(fixture)).toBe(12);
    expect(fixture.nativeElement.querySelector('.rm-work__count')?.textContent).toContain('Showing 12 of 40');
  });
});
