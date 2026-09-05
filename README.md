# R&M Roofing Solutions — Angular front end

The roofing homepage design, rebuilt as a standalone Angular single-page app. No backend, no CMS:
content lives in typed TypeScript files and can be swapped for an HTTP call later without
touching a single template.

- **Angular 22.1** (see *A note on the version* below — you asked for 19)
- Zoneless change detection, standalone components, signals, `@if` / `@for` control flow
- Zero runtime dependencies beyond Angular itself
- ~67 kB gzipped initial load, home page lazy-loaded

---

## Run it

### Docker — nothing installed but Docker

```
docker compose up dev
```

http://localhost:4200 with live reload. Edit anything under `src/` and the browser updates.

Production build behind nginx:

```
docker compose up prod
```

http://localhost:8080.

Identical in PowerShell, CMD, bash and zsh. Nothing to `chmod`.

```
DEV_PORT=4300 docker compose up dev            # bash / zsh
$env:DEV_PORT=4300; docker compose up dev      # PowerShell
```

### Without Docker

Needs Node 22.22.3+ or 24.15+ (Angular 22's floor).

```bash
npm install
npm start          # http://localhost:4200
npm run build      # production build, then the privacy check
```

---

## Client details, and where they live

Everything you specified sits in **one file**: `src/app/core/site.config.ts`.

| Detail | Value |
|---|---|
| Phone | (707) 641-6198 |
| Email | roofingsolutionsrm@gmail.com |
| Service area | Serving California |
| Licence | CSLB License #1160338 |

Nothing is hardcoded in a template. Changing the phone number is a one-line edit that updates the
header call box, the mobile menu, the closing call-to-action, the footer, the `tel:` links and
the schema.org markup at once.

`telHref()` derives `tel:+17076416198` from the display string, so the two cannot drift apart.

### The address is deliberately absent

The registered mailing address is also your home address, so it appears nowhere in this
repository. `Serving California` is shown in its place — in the footer, in the hero badge, and as
`areaServed` in the structured data.

This is enforced, not just documented:

```bash
npm run check:privacy
```

`tools/check-privacy.mjs` scans `src/`, `public/` and `dist/` for the street name, city and ZIP
and exits non-zero on a hit. It is wired into `npm run build`, and `npm run build` is what the
production Dockerfile runs — so a leaked address fails the image build rather than reaching
production. I tested it by pasting the address into `index.html` and watching the build go red.

### Where the licence number appears

California contractors must display the CSLB number on advertising, so it is in three places: a
pill under the hero buttons (above the fold), the "why choose us" panel, and the footer bar. It
is also emitted as a schema.org `identifier`.

---

## The logo

The supplied transparent PNG is used everywhere, unmodified — header, "why choose us" panel and
footer. It is cropped to its content bounds (the source had ~50px of empty padding) and served at
its native 500x392; no upscaling, which would only add blur.

| File | Used by |
|---|---|
| `logo.png` | header, "why choose us", footer — 500x392, transparent |
| `site-icon.png` | favicon / browser tab — badge on the brand dark, 512x512 |

This cut carries its own dark keyline and a backed tagline, so it holds up on both the white
header and the dark footer. An earlier version needed a dark plate behind it on light
backgrounds; that is gone and the header is plain white again, as in the original design.

**The 500px source is the constraint now.** The panel logo is capped at 250px CSS width so it is
exactly 2x on a retina display; anything larger goes soft. If you can get a vector export
(`.svg`, `.ai` or `.eps`) from whoever drew it, the cap disappears, the file gets smaller, and it
stays sharp at any size.

## The "Our work" gallery

Thirteen real job photos from a single tear-off and re-roof, grouped into the two stages they
document: **tear-off and new decking**, then **finished roof**.

The grouping is doing work. The decking photos show what a homeowner never sees once the shingles
go on — which is exactly where a cheap contractor cuts corners. Ungrouped, eight photographs of
grey shingles blur into one another; grouped, each one is evidence.

Tiles are **3:4 portrait**, not the 4:3 landscape the design originally used. Twelve of the
thirteen photos are portrait phone shots, and a landscape crop would have cut the roofline out of
nearly all of them.

Everything lives in `WORK_PHASES` in `src/app/core/content.ts`. Adding a phase, reordering
photos, or fixing a caption is a data edit; the component just iterates. `columns` on each phase
controls how many tiles per row on desktop, so rows come out even (5 decking shots, 8 finished).

Photos are in `public/images/work/`, cropped to 640x853 — roughly 2x the largest size they render
at, so they stay sharp on retina without shipping full-resolution phone files.

## Photography

The six supplied photographs are cropped to each slot's exact aspect ratio rather than squeezed
by CSS, so nothing is distorted and no bytes are wasted on pixels that get cropped away anyway.

| Source file | Used as | Output |
|---|---|---|
| `banner.jpeg` | hero background | 1600x916 |
| `roof-replacement-background.jpg` | Roof replacement, closing band | 900x620, 1920x400 |
| `roof-repair-active-action.jpeg` | Roof repair | 900x620 |
| `roof_inspectation.jpg` | Roof inspection | 900x620 |
| `strom_-damage.jpeg` | Storm damage | 900x620 |
| `maintance.jpg` | Maintenance, "why choose us" | 900x620, 1000x1200 |

Crops are focal-point aware, not naive centre crops — the portrait shots would have lost their
roofline to a centre crop, so they are biased upward. The gallery tiles are deliberately tighter
crops of the same sources so they read as separate photographs rather than repeats.

Alt text describes the photograph, not the service: "A roofer fastening replacement shingles with
a coil nailer", not "Roof repair". That is what a screen reader user actually needs, and it gives
the image something to rank on.

## Structure

```
src/
├── index.html                  title, meta, fonts, RoofingContractor JSON-LD
├── styles.css                  the whole design system (CSS custom properties)
└── app/
    ├── app.ts                  shell: skip link, header, router-outlet, footer
    ├── app.config.ts           router with anchor scrolling, zoneless CD
    ├── app.routes.ts           home (lazy) + wildcard
    ├── core/
    │   ├── site.config.ts      <- contact details, licence, service area
    │   ├── content.ts          services, projects, reviews, trust items
    │   └── models.ts           interfaces
    ├── shared/icon/icon.ts     19 inline SVG icons
    ├── layout/
    │   ├── header/             sticky bar, off-canvas mobile menu
    │   └── footer/             contact block, licence line
    └── pages/home/
        ├── home.ts             composes the seven bands in order
        └── sections/           hero, trust, services, why-us, work, reviews, cta
```

Each band is its own `OnPush` component. Reordering the page is a one-line change in `home.ts`.

### The overhanging badge

At the top of the page the badge hangs about 47px below the header bar, over the hero. There is
no plate or panel behind it — just the transparent artwork and a soft drop shadow that follows
its outline rather than boxing it in.

It is positioned absolutely so its height cannot stretch the flex row: an in-flow element would
just make the header taller instead of overhanging it. The row reserves the space back with
`padding-left`. Both the badge height and that reserved space derive from `--rm-logo-h`, so they
resize together and the nav never jumps sideways — it slides with the logo.

Past the fold the header is pinned over live content, where an overhanging badge would sit on
top of whatever is scrolling beneath it. So it collapses into the bar and the header returns to
the plain design from the mockup.

**Two thresholds, on purpose.** `stuck` fires at 8px and only draws the header shadow. `compact`
fires at 40px and collapses the badge. Sharing one 8px threshold would snap the badge shut on a
trackpad twitch and nobody would ever see the overhang.

### Fragment navigation

Anchor links need one non-obvious fix. Angular's `ViewportScroller` jumps with `window.scrollTo()`
and its own offset rather than `element.scrollIntoView()`, so the CSS `scroll-margin-top` on the
section ids is **ignored entirely** — every anchor lands at `y=0`, tucked behind the sticky
header, with the section half-hidden and the wrong nav item highlighted.

`App` fixes it by measuring the header at call time:

```ts
scroller.setOffset(() => {
  const header = document.querySelector<HTMLElement>('.rm-header');
  return [0, (header?.getBoundingClientRect().height ?? 104) + 16];
});
```

Measuring rather than hardcoding means it stays correct across breakpoints, where the header is
104px on desktop and 86px on mobile.

### Navigation highlight

`ScrollSpyService` tracks which section is in view and exposes it as a signal, so the header is
purely declarative — `[class.is-active]="activeId() === item.id"` — and the nav is generated from
one array rather than six hand-written list items.

It uses an IntersectionObserver over a thin band across the middle of the viewport, so the
callback only runs when a boundary is crossed rather than on every scroll frame. Two details
worth knowing:

- **The last section needs a special case.** Contact *is* the footer, and once the page bottoms
  out the footer sits below the detection band and can never cross it — the highlight would stay
  stuck on Reviews forever. A small passive scroll listener pins the last item whenever the page
  is scrolled to the end.
- **Clicking highlights immediately.** With smooth scrolling the observer takes a moment to
  catch up, which reads as an unresponsive nav, so a click sets the active id directly and the
  observer takes over once the scroll settles.

`aria-current` follows the highlight, so the state is exposed to assistive tech and not only
carried by colour.

### Icons

`IconComponent` writes its SVG literally in the template and switches on the icon name. No
`innerHTML`, no `DomSanitizer.bypassSecurityTrust*`, no runtime SVG parsing — the class of
problem behind CVE-2025-66412 has no surface here. Icon names are a union type, so a typo is a
compile error rather than a blank space.

Colour flows one direction: a parent sets `color` on the `rm-icon` element and the glyph inherits
it through `fill: currentColor`. Angular scopes component styles with an attribute selector,
which outranks a global `.parent svg { fill: ... }` rule — inheritance sidesteps that entirely.

---

## A note on the version

You asked for Angular 19. This is built on **Angular 22.1**, and I want to be straight about why.

Angular 19 reached end of life on **19 May 2026** and receives no further patches of any kind. It
is also the release that shipped just before three CVEs were disclosed across the Angular
platform in late 2025, one of which (CVE-2025-66412) is a stored XSS in the template compiler
related to SVG attribute sanitization — and this design is built almost entirely from inline SVG.

For a public site carrying a contractor's licence number, shipping a framework with known
unpatched vulnerabilities seemed like the wrong default, so I used the current release.

**If you have a hard requirement for 19**, the migration is small. The code uses standalone
components, signals and the new control flow, all of which exist in 19. You would need to:

1. Pin `@angular/*` and `@angular/cli` to `^19.2.0` in `package.json`.
2. Replace `provideZonelessChangeDetection()` with
   `provideZoneChangeDetection({ eventCoalescing: true })` and add `zone.js` back to the
   `polyfills` array in `angular.json` — zoneless was experimental in 19.
3. Drop `provideBrowserGlobalErrorListeners()`, which landed after 19.
4. Change the Docker base images to `node:20-alpine`.

Components, templates, signals and styles compile unchanged.

---

## Verified before hand-off

- `npm run build` clean; 67.47 kB initial transfer, home chunk lazy-loaded at 2.09 kB
- Rendered in a real browser at 1440px and 390px: zero console errors, zero broken images
- Every icon's computed `fill` asserted against its intended colour
- Phone, email, service area and licence all confirmed present in the rendered DOM
- Asserted the DOM contains no `Yosemite`, `Antioch`, `94509`, or the old `(469)` number
- Mobile menu opens, sets `aria-expanded`, closes on Escape
- Scroll spy: every one of the six nav items highlights at the right scroll
  position, on both 1440px and 390px, and returns to Home at the top
- Clicking each nav link lands the section at header height + 16px, with the
  matching nav item highlighted — measured after the smooth scroll settles
- Every image carries descriptive alt text; zero images missing the attribute

**Not verified: the Docker images.** There is no Docker daemon where this was built, so
`docker-compose.yml`, `Dockerfile` and `nginx.conf` are validated by schema and review only. The
build step they run (`npm ci && npm run build`) is the same one confirmed working above.

---

## Before launch

1. **A contact form.** `estimateUrl` points at `#contact`, which scrolls to the footer. Every
   "Get a free estimate" button reads that one value.
2. **Gallery captions and location.** The captions in `WORK_PHASES` are my reading of the
   photographs — confirm them, and add the city. "Re-roof in <city>" ranks and converts far
   better than "Finished roof" for a business that lives on local search.
3. **Google Business Profile** and call tracking. The phone number is the conversion.
4. **Self-host the fonts** to drop the two Google Fonts requests.
5. **Prerender** (`ng build --prerender`) to ship static HTML for crawlers, which matters for a
   local-services business competing on search.
