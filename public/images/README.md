# Image assets

All images used by TicketOS live here.

## Brand

| File | Use |
| --- | --- |
| `ticketos-mark.svg` | The circuit-"T" mark only (square, transparent). Favicons, app icons, tight spaces. |
| `ticketos-logo.svg` | Full lockup: mark + "TicketOS" wordmark. Emails, external embeds, docs. |

**In the app, the logo is rendered by the React component**
`src/components/brand/ticketos-logo.tsx` (`<TicketOSLogo />`) so it stays crisp at
any size and adapts to light/dark backgrounds. These SVG files are the matching
standalone exports — keep them in sync with the component.

Brand colors: gradient `#38bdf8 → #1d4ed8`; wordmark `Ticket` `#0b1220` (white on
dark), `OS` `#1d4ed8` (`#38bdf8` on dark).

> To use the exact raster logo instead of the SVG recreation, drop it here as
> `ticketos-logo.png` and point the component / `<Image>` at `/images/ticketos-logo.png`.
