import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../shared/icon/icon';
import { SITE, mailHref, telHref } from '../../core/site.config';
import { SERVICES } from '../../core/content';

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
}
