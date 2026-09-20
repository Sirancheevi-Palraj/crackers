const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const core = require("../js/core.js");
const { BUSINESS, PRODUCTS } = (() => {
  const source = fs.readFileSync(path.join(__dirname, "..", "js", "products.js"), "utf8");
  const vm = require("node:vm");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(source + "\nthis.BUSINESS = BUSINESS; this.PRODUCTS = PRODUCTS;", sandbox);
  return { BUSINESS: sandbox.BUSINESS, PRODUCTS: sandbox.PRODUCTS };
})();

test("catalog is structurally valid", () => {
  assert.ok(BUSINESS);
  assert.equal(BUSINESS.whatsapp, "919360651897");
  assert.ok(PRODUCTS.length >= 30);
  assert.equal(new Set(PRODUCTS.map((p) => p.id)).size, PRODUCTS.length);
  assert.ok(PRODUCTS.every((p) => Number.isInteger(p.id) && p.id > 0));
  assert.ok(PRODUCTS.every((p) => p.name && p.category));
  assert.ok(PRODUCTS.every((p) => /^https:\/\//.test(p.image)));
  assert.ok(PRODUCTS.every((p) => Number.isFinite(p.price) && p.price > 0));
});

test("cart add/update/remove flow is correct", () => {
  let cart = {};
  cart = core.addQuantity(cart, 1, 2, PRODUCTS);
  cart = core.addQuantity(cart, 2, 1, PRODUCTS);
  assert.equal(core.cartCount(cart, PRODUCTS), 3);
  assert.equal(core.cartTotal(cart, PRODUCTS), 250);

  cart = core.setQuantity(cart, 1, 3, PRODUCTS);
  assert.equal(core.cartTotal(cart, PRODUCTS), 325);

  cart = core.removeItem(cart, 2, PRODUCTS);
  assert.deepEqual(cart, { "1": 3 });
});

test("invalid cart data is cleaned", () => {
  const cart = core.cleanCart({ "1": 2, "999": 4, "2": -2, "3": "3" }, PRODUCTS);
  assert.equal(cart["1"], 2);
  assert.equal(cart["999"], undefined);
  assert.equal(cart["2"], undefined);
});

test("Indian mobile validation works", () => {
  assert.equal(core.normalisePhone("+91 93606-51897"), "919360651897");
  assert.equal(core.isValidIndianMobile("9360651897"), true);
  assert.equal(core.isValidIndianMobile("5360651897"), false);
  assert.equal(core.isValidIndianMobile("936065189"), false);
});

test("order and WhatsApp URL are generated correctly", () => {
  const now = new Date("2026-09-20T07:00:00.000Z");
  const order = core.createOrder({
    cart: { "1": 2, "2": 1 },
    products: PRODUCTS,
    name: "Siran",
    phone: "9360651897",
    email: "customer@example.com",
    address: "Chennai",
    now,
    random: 0
  });

  assert.equal(order.number, "CRK-2609200700-10");
  assert.equal(order.total, 250);
  assert.equal(order.items.length, 2);
  assert.equal(order.email, "customer@example.com");

  const emailParams = core.buildEmailTemplateParams(order, BUSINESS.currency);
  assert.equal(emailParams.order_number, order.number);
  assert.equal(emailParams.customer_email, "customer@example.com");
  assert.match(emailParams.order_items_html, /3½ Lakshmi/);
  assert.match(emailParams.order_items_html, /<tr>/);
  assert.equal(emailParams.order_total, "₹250");

  const url = core.buildWhatsAppUrl(BUSINESS.whatsapp, order, BUSINESS.currency);
  assert.match(url, /^https:\/\/wa\.me\/919360651897\?text=/);
  assert.match(decodeURIComponent(url), /3½ Lakshmi × 2/);
  assert.match(decodeURIComponent(url), /Total: ₹250/);
});

test("all HTML pages use local assets and have no reload/meta-refresh mechanism", () => {
  const pages = ["index.html", "products.html", "cart.html", "booking.html", "success.html"];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(__dirname, "..", page), "utf8");
    assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
    assert.doesNotMatch(html, /http-equiv\s*=\s*["']refresh["']/i);
    assert.match(html, /js\/products\.js/);
    assert.match(html, /js\/core\.js/);
    assert.match(html, /js\/app\.js/);
    assert.match(html, /css\/style\.css/);
    if (page === "booking.html") {
      assert.match(html, /@emailjs\/browser@4\/dist\/email\.min\.js/);
      assert.match(html, /id="confirm-order-btn"/);
      assert.match(html, /name="email"/);
    }
  }
});

test("browser code contains no EmailJS private key or REST access token", () => {
  const pages = ["index.html", "products.html", "cart.html", "booking.html", "success.html"];
  const sources = pages
    .map((page) => fs.readFileSync(path.join(__dirname, "..", page), "utf8"))
    .concat(
      fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8"),
      fs.readFileSync(path.join(__dirname, "..", "js", "products.js"), "utf8")
    )
    .join("\n");

  assert.doesNotMatch(sources, /privateKey\s*:/i);
  assert.doesNotMatch(sources, /accessToken\s*:/i);
  assert.doesNotMatch(sources, /private_key/i);
});

test("application JavaScript has no reload loop primitives", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8");
  assert.doesNotMatch(source, /location\.reload\s*\(/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
});
