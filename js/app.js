"use strict";

const STORAGE_CART = "crackera_cart_v2";
const STORAGE_ORDER = "crackera_order_v2";
const core = typeof CrackeraCore !== "undefined" ? CrackeraCore : null;

if (!core) {
  throw new Error("CrackeraCore failed to load. Ensure js/core.js loads before js/app.js.");
}

function readCart() {
  try {
    return core.cleanCart(JSON.parse(localStorage.getItem(STORAGE_CART) || "{}"), PRODUCTS);
  } catch {
    return {};
  }
}

function writeCart(cart) {
  try {
    localStorage.setItem(STORAGE_CART, JSON.stringify(core.cleanCart(cart, PRODUCTS)));
  } catch {}
}

function readOrder() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_ORDER) || "null");
  } catch {
    return null;
  }
}

function money(value) {
  return core.formatMoney(value, BUSINESS.currency);
}

function refreshCommon() {
  const cart = readCart();
  const count = core.cartCount(cart, PRODUCTS);
  const total = core.cartTotal(cart, PRODUCTS);

  document.querySelectorAll("#cart-count").forEach((element) => { element.textContent = count; });
  document.querySelectorAll("#listing-total").forEach((element) => { element.textContent = money(total); });
  document.querySelectorAll("#sticky-items").forEach((element) => { element.textContent = `${count} item${count === 1 ? "" : "s"}`; });
  document.querySelectorAll("#sticky-total").forEach((element) => { element.textContent = money(total); });
  document.querySelectorAll(".sticky-cart").forEach((element) => element.classList.toggle("is-hidden", count === 0));

  const checkout = document.querySelector("#checkout-btn");
  if (checkout) {
    const empty = count === 0;
    checkout.href = empty ? "products.html" : "booking.html";
    checkout.textContent = empty ? "Browse crackers →" : "Continue to details →";
    checkout.classList.toggle("is-disabled", empty);
    checkout.setAttribute("aria-disabled", String(empty));
  }
}

function toast(message) {
  const element = document.querySelector("#toast");
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(window.__crackeraToast);
  window.__crackeraToast = setTimeout(() => element.classList.remove("show"), 1800);
}

function getProduct(id) {
  return PRODUCTS.find((product) => product.id === Number(id));
}

function updateVisibleProductQuantity(id) {
  const quantity = readCart()[id] || 0;
  document.querySelectorAll(`.product-card[data-product-id="${Number(id)}"]`).forEach((card) => {
    const quantityElement = card.querySelector(".qty-value");
    const addButton = card.querySelector('[data-action="add"]');
    if (quantityElement) quantityElement.textContent = quantity;
    if (addButton) addButton.textContent = quantity ? "Add another" : "Add to cart";
  });
}

function setCartQty(id, quantity) {
  writeCart(core.setQuantity(readCart(), id, quantity, PRODUCTS));
  refreshCommon();
  updateVisibleProductQuantity(id);
  renderCart();
  renderBooking();
}

function addToCart(id) {
  const product = getProduct(id);
  if (!product || !product.available) return;

  writeCart(core.addQuantity(readCart(), id, 1, PRODUCTS));
  refreshCommon();
  updateVisibleProductQuantity(id);
  renderFeatured();
  renderCart();
  renderBooking();
  toast(`${product.name} added to your basket`);
}

function openProductModal(product) {
  if (!product) return;

  let modal = document.querySelector("#product-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "product-modal";
    modal.className = "modal-backdrop";
    modal.innerHTML = `<div class="quick-modal" role="dialog" aria-modal="true" aria-labelledby="quick-title">
      <button type="button" class="modal-close" data-modal-close aria-label="Close">×</button>
      <div id="quick-image" class="quick-image"></div>
      <div class="quick-copy">
        <div class="eyebrow">QUICK VIEW</div>
        <h2 id="quick-title"></h2>
        <p id="quick-category"></p>
        <div class="quick-price" id="quick-price"></div>
        <button type="button" class="btn btn-primary btn-full" id="quick-add">Add to cart</button>
      </div>
    </div>`;

    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-modal-close]")) modal.classList.remove("open");
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") modal.classList.remove("open");
    });
  }

  modal.querySelector("#quick-image").innerHTML = `<img src="${product.image}" alt="${product.name}" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="quick-fallback" hidden>${product.emoji}</span>`;
  modal.querySelector("#quick-title").textContent = product.name;
  modal.querySelector("#quick-category").textContent = product.category;
  modal.querySelector("#quick-price").textContent = money(product.price);

  const addButton = modal.querySelector("#quick-add");
  addButton.disabled = !product.available;
  addButton.textContent = product.available ? "Add to cart" : "Unavailable";
  addButton.onclick = () => {
    addToCart(product.id);
    modal.classList.remove("open");
  };

  modal.classList.add("open");
  addButton.focus();
}

function bindProductInteractions(container) {
  if (!container || container.dataset.bound === "true") return;
  container.dataset.bound = "true";

  container.addEventListener("click", (event) => {
    const actionElement = event.target.closest("[data-action]");
    if (actionElement) {
      event.preventDefault();
      event.stopPropagation();

      const id = Number(actionElement.dataset.productId);
      const current = readCart()[id] || 0;

      if (actionElement.dataset.action === "increase" || actionElement.dataset.action === "add") addToCart(id);
      else if (actionElement.dataset.action === "decrease") setCartQty(id, current - 1);
      return;
    }

    const card = event.target.closest("[data-product-id]");
    if (card && !event.target.closest("a,button")) openProductModal(getProduct(card.dataset.productId));
  });

  container.addEventListener("keydown", (event) => {
    const card = event.target.closest("[data-product-id]");
    if (card && (event.key === "Enter" || event.key === " ") && !event.target.closest("button,a")) {
      event.preventDefault();
      openProductModal(getProduct(card.dataset.productId));
    }
  });
}

function initProductsPage() {
  const grid = document.querySelector("#product-grid");
  if (!grid) return;

  const tabs = document.querySelector("#category-tabs");
  const search = document.querySelector("#product-search");
  const categories = ["All", ...new Set(PRODUCTS.map((product) => product.category))];
  let activeCategory = "All";

  const draw = () => {
    const query = (search?.value || "").trim().toLowerCase();
    const filtered = PRODUCTS.filter(
      (product) =>
        (activeCategory === "All" || product.category === activeCategory) &&
        (!query || product.name.toLowerCase().includes(query) || product.category.toLowerCase().includes(query))
    );

    grid.innerHTML = filtered.length
      ? filtered.map(productCard).join("")
      : '<div class="empty-state" style="grid-column:1/-1"><h2>No matches.</h2><p>Try another search or category.</p></div>';

    tabs.innerHTML = categories
      .map((category) => `<button type="button" class="category-tab ${category === activeCategory ? "active" : ""}" data-category="${category}">${category}</button>`)
      .join("");

    tabs.querySelectorAll(".category-tab").forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.category;
        draw();
      });
    });

    refreshCommon();
  };

  search?.addEventListener("input", draw);
  bindProductInteractions(grid);
  window.__drawProducts = draw;
  draw();
}

function productCard(product) {
  const quantity = readCart()[product.id] || 0;
  return `<article class="product-card" tabindex="0" role="button" data-product-id="${product.id}" aria-label="View ${product.name}">
    <div class="product-image">
      <img src="${product.image}" alt="${product.name}" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false">
      <span class="image-fallback" aria-hidden="true" hidden>${product.emoji}</span>
      ${product.available ? "" : "<small>OUT OF STOCK</small>"}
    </div>
    <div class="product-body">
      <div class="product-meta"><div><div class="product-name">${product.name}</div><div class="product-category">${product.category}</div></div></div>
      <div class="price-row">
        <div class="price">${money(product.price)}</div>
        <div class="quantity">
          <button type="button" class="qty-btn" data-action="decrease" data-product-id="${product.id}" aria-label="Decrease ${product.name}">−</button>
          <span class="qty-value">${quantity}</span>
          <button type="button" class="qty-btn" data-action="increase" data-product-id="${product.id}" aria-label="Increase ${product.name}">+</button>
        </div>
      </div>
      <button type="button" class="add-btn" data-action="add" data-product-id="${product.id}" ${product.available ? "" : "disabled"}>${product.available ? (quantity ? "Add another" : "Add to cart") : "Unavailable"}</button>
    </div>
  </article>`;
}

function renderFeatured() {
  const box = document.querySelector("#featured-products");
  if (!box) return;
  box.innerHTML = PRODUCTS.filter((product) => product.featured).slice(0, 4).map(productCard).join("");
  bindProductInteractions(box);
}

function renderCart() {
  const box = document.querySelector("#cart-items");
  if (!box) return;

  const items = core.getCartItems(readCart(), PRODUCTS);

  if (!items.length) {
    box.innerHTML = `<div class="empty-state"><div style="font-size:52px">🪔</div><h2>Your basket is empty.</h2><p>Add a few favourites and come back here when you are ready.</p><a class="btn btn-primary" href="products.html">Browse crackers →</a></div>`;
  } else {
    box.innerHTML = items.map(({ product, qty }) => `<div class="cart-item">
      <div class="cart-thumb">${product.emoji}</div>
      <div><h3>${product.name}</h3><p>${product.category} • ${money(product.price)} each</p>
        <div class="item-actions">
          <button type="button" class="qty-btn" data-cart-action="decrease" data-product-id="${product.id}">−</button>
          <strong>${qty}</strong>
          <button type="button" class="qty-btn" data-cart-action="increase" data-product-id="${product.id}">+</button>
          <button type="button" class="remove-btn" data-cart-action="remove" data-product-id="${product.id}">Remove</button>
        </div>
      </div>
      <strong>${money(product.price * qty)}</strong>
    </div>`).join("");
  }

  const count = core.cartCount(readCart(), PRODUCTS);
  const total = core.cartTotal(readCart(), PRODUCTS);
  document.querySelector("#summary-items")?.replaceChildren(document.createTextNode(String(count)));
  document.querySelector("#summary-total")?.replaceChildren(document.createTextNode(money(total)));
  document.querySelector("#summary-grand-total")?.replaceChildren(document.createTextNode(money(total)));

  if (box.dataset.bound !== "true") {
    box.dataset.bound = "true";
    box.addEventListener("click", (event) => {
      const element = event.target.closest("[data-cart-action]");
      if (!element) return;
      event.preventDefault();

      const id = Number(element.dataset.productId);
      const current = readCart()[id] || 0;

      if (element.dataset.cartAction === "remove") setCartQty(id, 0);
      else if (element.dataset.cartAction === "increase") setCartQty(id, current + 1);
      else setCartQty(id, current - 1);
    });
  }

  refreshCommon();
}

function renderBooking() {
  const preview = document.querySelector("#checkout-preview");
  if (!preview) return;

  const items = core.getCartItems(readCart(), PRODUCTS);
  if (!items.length) {
    preview.innerHTML = '<div class="empty-inline">Your basket is empty. <a href="products.html">Browse crackers →</a></div>';
    document.querySelector("#checkout-total").textContent = money(0);
    return;
  }

  preview.innerHTML = items.map(({ product, qty }) =>
    `<div class="checkout-preview-item"><span>${product.name} × ${qty}</span><strong>${money(product.price * qty)}</strong></div>`
  ).join("");

  document.querySelector("#checkout-total").textContent = money(core.cartTotal(readCart(), PRODUCTS));
}

function initBooking() {
  const form = document.querySelector("#booking-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const cart = readCart();
    if (core.cartCount(cart, PRODUCTS) === 0) {
      toast("Your basket is empty");
      return;
    }

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "");
    const address = String(formData.get("address") || "").trim();

    if (!name || !address) {
      toast("Please fill in all required details");
      return;
    }

    if (!core.isValidIndianMobile(phone)) {
      toast("Enter a valid 10-digit Indian mobile number");
      return;
    }

    const order = core.createOrder({
      cart,
      products: PRODUCTS,
      name,
      phone,
      address
    });

    try {
      localStorage.setItem(STORAGE_ORDER, JSON.stringify(order));
      localStorage.removeItem(STORAGE_CART);
    } catch {}

    location.href = "success.html";
  });
}

function initSuccess() {
  const card = document.querySelector(".success-card");
  if (!card) return;

  const order = readOrder();

  if (!order || !order.items?.length) {
    document.querySelector("#success-order-number").textContent = "No active order";
    document.querySelector("#success-copy").textContent = "Start a new basket to create an order.";
    document.querySelector("#success-items").innerHTML = "";
    document.querySelector("#success-total").textContent = money(0);

    const whatsappButton = document.querySelector("#whatsapp-btn");
    whatsappButton.removeAttribute("href");
    whatsappButton.classList.add("is-disabled");
    whatsappButton.textContent = "No order to send";
    return;
  }

  document.querySelector("#success-order-number").textContent = "#" + order.number;
  document.querySelector("#success-total").textContent = money(order.total);
  document.querySelector("#success-items").innerHTML = order.items
    .map((item) => `<div class="success-item"><span>${item.name} × ${item.qty}</span><strong>${money(item.price * item.qty)}</strong></div>`)
    .join("");

  document.querySelector("#success-copy").textContent =
    `Thanks, ${order.name}. Send this order to us on WhatsApp and we'll take it from there.`;

  document.querySelector("#whatsapp-btn").href =
    core.buildWhatsAppUrl(BUSINESS.whatsapp, order, BUSINESS.currency);
}

document.addEventListener("DOMContentLoaded", () => {
  refreshCommon();
  initProductsPage();
  renderFeatured();
  renderCart();
  renderBooking();
  initBooking();
  initSuccess();
});
