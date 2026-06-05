# Image assets

All images used by TicketOS live here.

## Brand

| File | Use |
| --- | --- |
| `logo.png` | **The primary brand lockup** — rendered in-app by `<TicketOSLogo />` via `next/image`. On dark surfaces it's shown as a white silhouette (the artwork has dark text). |
| `ticketos-mark.svg` | The circuit-"T" mark only (square, transparent). Favicon (`src/app/icon.svg`), tight spaces, `showWordmark={false}`. |
| `ticketos-logo.svg` | Vector lockup fallback for emails / external embeds where a PNG isn't ideal. |

**In the app, the logo is rendered by the React component**
`src/components/brand/ticketos-logo.tsx` (`<TicketOSLogo />`). To swap the brand
image, replace `logo.png` here (keep it transparent); everything updates.

Brand colors: gradient `#38bdf8 → #1d4ed8`; wordmark `Ticket` `#0b1220`, `OS` `#1d4ed8`.
