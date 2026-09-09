import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../shared/icon/icon';
import { SITE, mailHref, telHref } from '../../core/site.config';
import { SERVICES } from '../../core/content';
import { ENV } from '../../core/environment';

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
   * Drives the development banner below the footer. `ENV.production` is a
   * literal written into the generated module at build time, so the banner is
   * decided when the bundle is built, not by anything the browser can flip.
   */
  protected readonly env = ENV;
}
