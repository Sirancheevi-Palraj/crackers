# Crackera

A lightweight one-month Diwali cracker storefront built with plain HTML, CSS and vanilla JavaScript.

## Files
- `index.html` — landing page
- `products.html` — catalogue + search + category filter
- `cart.html` — cart
- `booking.html` — customer details + preview
- `success.html` — order confirmation + WhatsApp link
- `js/products.js` — **edit product names, prices, categories, emoji and availability here**
- `js/app.js` — cart, checkout and WhatsApp logic
- `css/style.css` — full responsive design

## Business setup
The WhatsApp number is configured in `js/products.js` as:
`919360651897`

## Product images
The demo uses emoji-based product visuals so the site works immediately with no asset setup. Replace the `emoji` field and card rendering later if you want actual product images.

## Order flow
Products are hardcoded in JavaScript. Cart/order details are stored only in the customer's browser via localStorage. On confirmation, a WhatsApp link is generated with the order details pre-filled; the customer must press Send in WhatsApp.

## Run
Open `index.html` directly, or serve the folder with any static server / GitHub Pages-compatible host.