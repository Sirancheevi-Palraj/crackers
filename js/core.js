(function (root) {
  "use strict";

  const formatMoney = (value, currency = "₹") =>
    currency + Number(value).toLocaleString("en-IN");

  const normalisePhone = (value) => String(value ?? "").replace(/\D/g, "");
  const isValidIndianMobile = (value) => /^[6-9]\d{9}$/.test(normalisePhone(value));

  const cleanCart = (cart, products) => {
    const validIds = new Set(products.map((product) => String(product.id)));
    return Object.fromEntries(
      Object.entries(cart || {})
        .map(([id, quantity]) => [String(id), Math.max(0, Number(quantity) || 0)])
        .filter(([id, quantity]) => validIds.has(id) && quantity > 0)
    );
  };

  const addQuantity = (cart, productId, delta, products) => {
    const next = cleanCart(cart, products);
    const id = String(productId);
    if (!products.some((product) => String(product.id) === id)) return next;
    const quantity = (next[id] || 0) + Number(delta);
    if (quantity <= 0) delete next[id];
    else next[id] = quantity;
    return next;
  };

  const setQuantity = (cart, productId, quantity, products) => {
    const next = cleanCart(cart, products);
    const id = String(productId);
    const value = Number(quantity) || 0;
    if (value <= 0) delete next[id];
    else if (products.some((product) => String(product.id) === id)) next[id] = value;
    return next;
  };

  const removeItem = (cart, productId, products) =>
    setQuantity(cart, productId, 0, products);

  const getCartItems = (cart, products) =>
    Object.entries(cleanCart(cart, products))
      .map(([id, quantity]) => ({
        product: products.find((product) => String(product.id) === id),
        qty: quantity
      }))
      .filter((item) => item.product);

  const cartCount = (cart, products) =>
    getCartItems(cart, products).reduce((sum, item) => sum + item.qty, 0);

  const cartTotal = (cart, products) =>
    getCartItems(cart, products)
      .reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const makeOrderNumber = (now = new Date(), random = Math.random()) => {
    const stamp = now.toISOString().replace(/\D/g, "").slice(2, 12);
    return `CRK-${stamp}-${Math.floor(random * 90 + 10)}`;
  };

  const createOrder = ({
    cart,
    products,
    name,
    phone,
    address,
    now = new Date(),
    random = Math.random()
  }) => ({
    number: makeOrderNumber(now, random),
    name: String(name).trim(),
    phone: normalisePhone(phone),
    address: String(address).trim(),
    items: getCartItems(cart, products).map(({ product, qty }) => ({
      id: product.id,
      name: product.name,
      qty,
      price: product.price
    })),
    total: cartTotal(cart, products),
    createdAt: now.toISOString()
  });

  const buildWhatsAppUrl = (businessNumber, order, currency = "₹") => {
    const body = [
      `🎆 NEW CRACKERA ORDER\n\nOrder: #${order.number}`,
      `Customer: ${order.name}`,
      `Mobile: ${order.phone}`,
      `Address: ${order.address}`,
      "",
      "Items:",
      ...order.items.map(
        (item) =>
          `• ${item.name} × ${item.qty} = ${formatMoney(item.price * item.qty, currency)}`
      ),
      "",
      `Total: ${formatMoney(order.total, currency)}`,
      "",
      "Please confirm my order."
    ].join("\n");

    return `https://wa.me/${normalisePhone(businessNumber)}?text=${encodeURIComponent(body)}`;
  };

  const api = {
    formatMoney,
    normalisePhone,
    isValidIndianMobile,
    cleanCart,
    addQuantity,
    setQuantity,
    removeItem,
    getCartItems,
    cartCount,
    cartTotal,
    makeOrderNumber,
    createOrder,
    buildWhatsAppUrl
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CrackeraCore = api;
})(typeof window !== "undefined" ? window : globalThis);
