import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { IconComponent } from '../../shared/icon/icon';
import { SITE, telHref } from '../../core/site.config';
import { ScrollSpyService } from '../../core/scroll-spy.service';

interface NavItem {
  /** Element id of the section this links to. */
  id: string;
  label: string;
}

@Component({
  selector: 'rm-header',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
})
export class HeaderComponent {
  protected readonly site = SITE;
  protected readonly telHref = telHref();

  /** Declaration order doubles as document order for the scroll spy. */
  protected readonly navItems: readonly NavItem[] = [
    { id: 'home', label: 'Home' },
    { id: 'services', label: 'Services' },
    { id: 'about', label: 'About us' },
    { id: 'work', label: 'Our work' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'contact', label: 'Contact' },
  ];

  private readonly scrollSpy = inject(ScrollSpyService);
  protected readonly activeId = this.scrollSpy.active;

  protected readonly menuOpen = signal(false);

  /** Drives the header's drop shadow: on as soon as anything slides under it. */
  protected readonly stuck = signal(false);

  /**
   * Collapses the overhanging badge back into the bar.
   *
   * Deliberately a larger threshold than `stuck`: at 8px the badge would snap
   * shut on a trackpad twitch and nobody would ever see the overhang.
   */
  protected readonly compact = signal(false);

  constructor() {
    // Sections live in the lazy-loaded home route, so wait for a render pass
    // before going looking for them.
    afterNextRender(() => this.scrollSpy.watch(this.navItems.map((item) => item.id)));
  }

  /**
   * Highlight immediately on click. Smooth scrolling means the observer would
   * otherwise take a moment to catch up, which reads as an unresponsive nav.
   */
  protected onNavClick(id: string): void {
    this.scrollSpy.select(id);
    this.closeMenu();
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    document.body.classList.toggle('rm-nav-open', this.menuOpen());
  }

  protected closeMenu(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    document.body.classList.remove('rm-nav-open');
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    const y = window.scrollY;
    this.stuck.set(y > 8);
    this.compact.set(y > 40);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeMenu();
  }

  @HostListener('window:resize')
  protected onResize(): void {
    if (window.innerWidth > 900) this.closeMenu();
  }
}
