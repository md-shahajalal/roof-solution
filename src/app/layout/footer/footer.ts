import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../shared/icon/icon';
import { SITE, mailHref, telHref } from '../../core/site.config';
import { SERVICES } from '../../core/content';
import { environment } from '../../../environments/environment';
import { tawkWidgetPath } from '../../core/tawk.service';

@Component({
  selector: 'rm-footer',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.html',
})
export class FooterComponent {
  protected readonly site = SITE;
  protected readonly services = SERVICES;
  protected readonly telHref = telHref();
  protected readonly mailHref = mailHref();
  protected readonly year = new Date().getFullYear();

  /**
   * Drives the development banner below the footer. Which environment file is
   * compiled in is settled by angular.json at build time, so the banner is
   * decided when the bundle is built, not by anything the browser can flip.
   */
  protected readonly env = environment;

  /** The chat line in that banner: the widget in use, or why there is none. */
  protected readonly chat =
    tawkWidgetPath(environment.tawk) ?? (environment.tawk.trim() ? 'invalid link' : 'off');
}
