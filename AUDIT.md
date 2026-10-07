# Portfolio polish audit

Date: 2026-10-07  
Scope: static GitHub Pages portfolio, audited before code changes.

## Site summary

The site is a single-page portfolio with a full-screen name introduction, sticky desktop navigation, a mobile navigation drawer, profile hero, recruiter highlights, a lens filter, skill ribbons, an About section with counters, an interactive career roadmap, experience, education, skills/tools, contact form, and footer. Content is initially embedded in `index.html` and then hydrated from `info.json`. Styling and scripts are inline; the page currently requests Google Fonts, Remix Icon, GSAP, and ScrollTrigger from CDNs. Assets include one displayed portrait and two unused case-study images, plus two duplicate résumé PDFs.

## Baseline checks

- Git repository detected. The existing uncommitted `index.html` work was preserved and the `polish-upgrade` branch was created before changes.
- `info.json` is valid JSON.
- The displayed portrait is 1086 x 1448 px / 96 KB. It is appropriately small on disk, but lacks intrinsic HTML dimensions and asynchronous decoding.
- The two 1376 x 768 case-study images are not referenced by the page, so they are not downloaded.
- No baseline console warnings or errors were reported by the local browser.
- Baseline checks at 360, 768, and 1440 px found no horizontal page overflow. The existing opening composition is visually intact at 360 and 1440 px.

## Findings

| Area | Severity | Finding | Planned treatment |
| --- | --- | --- | --- |
| Performance | High | Two render-blocking GSAP/ScrollTrigger CDN scripts underpin counters, page entry, scroll reveals, progress, cursor, ribbon motion, magnetic buttons, and card tilt. A failed CDN leaves stat figures at `0`. | Replace the GSAP-dependent layer with small native controllers and remove the GSAP resources. |
| Performance | High | Existing motion code contains an obsolete intro/roadmap implementation that targets DOM not present in the current page. It still initializes a large animation stack and duplicate scroll work. | Remove obsolete animation code while retaining every visible feature through the native controllers. |
| Performance | Medium | `info.json?v=` + `Date.now()` defeats browser caching on every visit. | Fetch the same local file without cache busting. |
| Performance | Medium | The hero image does not declare `width`, `height`, or `decoding="async"`, increasing layout-shift risk. | Add intrinsic dimensions and async decoding while retaining eager hero loading. |
| Performance | Low | The ambient SVG turbulence noise and multiple blurred fixed blobs are compositing-heavy on low-end mobile devices. | Keep the look but reduce their strength and pause decorative motion when the page is hidden. |
| Smoothness | High | The current GSAP sequence runs numerous timelines, scroll triggers, filters, clip-paths, and 3D effects simultaneously. It exceeds the requested light, non-blocking page-load sequence and can jank on mobile. | Use one shared IntersectionObserver, transform/opacity-only reveals, and a sub-1.2 s page-ready sequence. |
| Smoothness | Medium | Several overlapping scroll handlers/controllers calculate geometry independently, while broad `transition: all` rules can animate costly properties. | Consolidate new scroll behavior into one rAF-scheduled controller and use shared timing/easing tokens. |
| Smoothness | Medium | Native `scroll-behavior` is paired with manual anchor scrolling based on a hard-coded offset. Sections do not have `scroll-margin-top`. | Use section scroll margins and a single accessible smooth-anchor handler. |
| Mobile | Medium | `.hero-section` mobile overrides do not match the actual `.hero` class. The actual hero still relies on `100vh` in its min-height calculation. | Target the real class and use `100svh`-safe sizing. |
| Mobile | Medium | The mobile drawer and ambient mesh retain `100vh` fallbacks that can mismeasure browser chrome; the compact lens controls can fall below a 44 px target. | Prefer safe/dynamic viewport units and preserve comfortable tap targets. |
| Mobile | Low | Existing breakpoint coverage is broad, but the page lacks dedicated behavior validation at 320, 390, and 430 px. | Validate all requested widths after the changes. |
| Accessibility | High | The mobile drawer is declared modal but does not trap focus or make background content inert while open. | Add a compact focus trap, Escape handling, focus return, and background inert state. |
| Accessibility | Medium | The opening wordmark and main hero both use an `h1`, creating duplicate primary headings. | Make the opening wordmark decorative to assistive technology; retain the visible design and main content `h1`. |
| Accessibility | Medium | Lens controls use `role="tab"` without tab panels/`aria-controls`, so their semantics do not match their filtering behavior. | Use pressed-state filter buttons and keyboard-friendly state updates. |
| Accessibility | Medium | There is no skip link, and externally opened résumé links lack `rel="noopener"`. | Add a visually hidden skip link and secure external targets. |
| Accessibility | Low | Decorative icon glyphs are exposed in the accessibility tree before their labels. | Mark decorative icon elements hidden from assistive technology. |
| Accessibility | Low | The current warm-accent hover state uses white text with insufficient contrast. | Keep the palette but use navy text on that accent surface. |
| SEO/sharing | Low | Title, description, canonical URL, Open Graph, Twitter card, language, robots, and favicon are already present. `og:site_name` and locale are absent. | Add the missing non-copy sharing metadata. |
| Code quality | High | The page mixes three large inline controllers, duplicate data hydration, stale selectors, and a third-party animation library. This makes behavior brittle and hard to audit. | Preserve the existing single-file structure but consolidate motion into a labelled vanilla FX block. |
| Code quality | Medium | Inline style values and magic timing numbers are scattered through markup and scripts. | Add tweakable FX variables at `:root` and group new code using the required markers. |
| Code quality | Medium | Google Fonts and Remix Icon are existing CDN dependencies. They are needed to preserve the hard-locked typography/icon appearance. | Self-host the exact displayed typefaces and icon font with relative asset paths, then remove every external stylesheet/script request. |
| Code quality | Low | `index.html` contains unused legacy selectors and data-facing DOM-generation patterns. | Avoid risky cosmetic refactors; remove only stale animation code that is replaced by a maintained FX equivalent. |

## Fix boundary

The implementation will preserve the palette, typography, logo, images, copy, section order, and existing visible features. New motion will be scoped with `.fx-` classes and clearly delimited with `FX` comments. No framework, build step, or new CDN dependency will be introduced.
