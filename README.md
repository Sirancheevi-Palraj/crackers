# Crackera

A lightweight one-month Diwali cracker storefront built with plain HTML, CSS and vanilla JavaScript.

## Customer flow

Home → Crackers → Cart → Order Details → Success → WhatsApp

## Current features

- Responsive Diwali storefront for mobile, tablet and desktop
- Hardcoded product catalogue in `js/products.js`
- Category filtering and product search
- Product quantity controls without page reloads
- Product-card quick view modal
- Cart persistence with browser `localStorage`
- Order preview and customer details validation
- Generated order number
- WhatsApp message pre-filled for `+91 93606 51897`
- No backend, database or API required
- No external font or runtime dependency

## Product configuration

Edit only `js/products.js` to change the business details and products.

Each product supports:
- `id`
- `name`
- `category`
- `price`
- `emoji`
- `available`
- `featured`

## Order storage

This is intentionally a static one-month website. Orders are stored in the customer's browser until the WhatsApp message is sent. There is no shared order database.

## Testing

Node.js 22 is used in GitHub Actions.

```bash
npm run check
npm test
```

Tests cover:
- product catalogue structure
- cart add/update/remove calculations
- invalid cart cleanup
- Indian mobile validation
- order number and WhatsApp URL generation
- static HTML asset checks
- reload-loop / auto-refresh primitive checks

## GitHub Pages

Every push to `main` runs tests first. The site is deployed only when the test job succeeds.
