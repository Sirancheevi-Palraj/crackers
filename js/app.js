const CART_KEY="crackera_cart_v1", ORDER_KEY="crackera_order_v1";
const money=n=>BUSINESS.currency+Number(n).toLocaleString("en-IN");
const getCart=()=>JSON.parse(localStorage.getItem(CART_KEY)||"{}");
const saveCart=c=>localStorage.setItem(CART_KEY,JSON.stringify(c));
const getProduct=id=>PRODUCTS.find(p=>p.id===Number(id));
const cartEntries=()=>Object.entries(getCart()).map(([id,qty])=>({product:getProduct(id),qty:Number(qty)})).filter(x=>x.product&&x.qty>0);
const cartCount=()=>cartEntries().reduce((s,x)=>s+x.qty,0);
const cartTotal=()=>cartEntries().reduce((s,x)=>s+x.product.price*x.qty,0);

function setCartQty(id,qty){
  const c=getCart();
  if(qty<=0) delete c[id]; else c[id]=qty;
  saveCart(c);
  refreshCommon();
  window.__drawProducts?.();
  renderCart();
  renderBooking();
}

function addToCart(id){
  const c=getCart();
  c[id]=(c[id]||0)+1;
  saveCart(c);
  refreshCommon();
  window.__drawProducts?.();
  renderCart();
  renderBooking();
  toast("Added to your basket");
}

function refreshCommon(){
  document.querySelectorAll("#cart-count").forEach(e=>e.textContent=cartCount());
  const total=cartTotal();
  document.querySelectorAll("#listing-total").forEach(e=>e.textContent=money(total));
  document.querySelectorAll("#sticky-items").forEach(e=>e.textContent=cartCount()+" item"+(cartCount()===1?"":"s"));
  document.querySelectorAll("#sticky-total").forEach(e=>e.textContent=money(total));
}

function toast(message){
  const el=document.querySelector("#toast");
  if(!el)return;
  el.textContent=message;
  el.classList.add("show");
  clearTimeout(window.__toast);
  window.__toast=setTimeout(()=>el.classList.remove("show"),1800);
}

function renderProductCard(p){
  const qty=getCart()[p.id]||0;
  return `<article class="product-card">
    <div class="product-image"><span>${p.emoji}</span>${p.available?"":"<small>OUT OF STOCK</small>"}</div>
    <div class="product-body">
      <div class="product-meta"><div><div class="product-name">${p.name}</div><div class="product-category">${p.category}</div></div></div>
      <div class="price-row">
        <div class="price">${money(p.price)}</div>
        <div class="quantity">
          <button type="button" class="qty-btn" onclick="setCartQty(${p.id},${Math.max(0,qty-1)})" aria-label="Decrease quantity">−</button>
          <span class="qty-value">${qty}</span>
          <button type="button" class="qty-btn" onclick="setCartQty(${p.id},${qty+1})" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button type="button" class="add-btn" onclick="addToCart(${p.id})" ${p.available?"":"disabled"}>${p.available?(qty?"Add another":"Add to cart"):"Unavailable"}</button>
    </div>
  </article>`;
}

function initProductsPage(){
  const grid=document.querySelector("#product-grid");
  if(!grid)return;

  const tabs=document.querySelector("#category-tabs");
  const search=document.querySelector("#product-search");
  const cats=["All",...new Set(PRODUCTS.map(p=>p.category))];
  let active=window.__productCategory||"All";

  function draw(){
    const q=(search?.value||"").trim().toLowerCase();
    const list=PRODUCTS.filter(p=>
      (active==="All"||p.category===active) &&
      (!q||p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q))
    );

    grid.innerHTML=list.length
      ?list.map(renderProductCard).join("")
      :'<div class="empty-state" style="grid-column:1/-1"><h2>No matches.</h2><p>Try another search or category.</p></div>';

    tabs.innerHTML=cats.map(c=>`<button type="button" class="category-tab ${c===active?"active":""}" data-category="${c}">${c}</button>`).join("");
    tabs.querySelectorAll(".category-tab").forEach(btn=>{
      btn.addEventListener("click",()=>{
        active=btn.dataset.category;
        window.__productCategory=active;
        draw();
      });
    });
    refreshCommon();
  }

  window.__drawProducts=draw;
  if(!window.__productSearchBound){
    search?.addEventListener("input",draw);
    window.__productSearchBound=true;
  }
  draw();
}

function renderFeatured(){
  const box=document.querySelector("#featured-products");
  if(box)box.innerHTML=PRODUCTS.filter(p=>p.featured).slice(0,4).map(renderProductCard).join("");
}

function renderCart(){
  const box=document.querySelector("#cart-items");
  const entries=cartEntries();
  if(!box)return;

  if(!entries.length){
    box.innerHTML='<div class="empty-state"><div style="font-size:52px">🪔</div><h2>Your basket is empty.</h2><p>Add a few favourites and come back here when you are ready.</p><a class="btn btn-primary" href="products.html">Browse crackers →</a></div>';
    const checkout=document.querySelector("#checkout-btn");
    if(checkout)checkout.setAttribute("aria-disabled","true");
    return;
  }

  box.innerHTML=entries.map(({product:p,qty})=>`<div class="cart-item">
    <div class="cart-thumb">${p.emoji}</div>
    <div>
      <h3>${p.name}</h3><p>${p.category} • ${money(p.price)} each</p>
      <div class="item-actions">
        <button type="button" class="qty-btn" onclick="setCartQty(${p.id},${qty-1})">−</button>
        <strong>${qty}</strong>
        <button type="button" class="qty-btn" onclick="setCartQty(${p.id},${qty+1})">+</button>
        <button type="button" class="remove-btn" onclick="setCartQty(${p.id},0)">Remove</button>
      </div>
    </div>
    <strong>${money(p.price*qty)}</strong>
  </div>`).join("");

  document.querySelector("#summary-items").textContent=cartCount();
  document.querySelector("#summary-total").textContent=money(cartTotal());
  document.querySelector("#summary-grand-total").textContent=money(cartTotal());
}

function renderBooking(){
  const preview=document.querySelector("#checkout-preview");
  if(!preview)return;
  const entries=cartEntries();
  if(!entries.length){
    location.href="products.html";
    return;
  }
  preview.innerHTML=entries.map(({product:p,qty})=>`<div class="checkout-preview-item"><span>${p.name} × ${qty}</span><strong>${money(p.price*qty)}</strong></div>`).join("");
  document.querySelector("#checkout-total").textContent=money(cartTotal());
}

function orderNumber(){
  const d=new Date(),stamp=d.toISOString().replace(/\D/g,"").slice(2,12);
  return "CRK-"+stamp+"-"+Math.floor(Math.random()*90+10);
}

function initBooking(){
  const form=document.querySelector("#booking-form");
  if(!form)return;
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const name=String(fd.get("name")).trim();
    const phone=String(fd.get("phone")).replace(/\D/g,"");
    const address=String(fd.get("address")).trim();

    if(!/^[6-9]\d{9}$/.test(phone)){toast("Enter a valid 10-digit Indian mobile number");return;}

    const entries=cartEntries();
    if(!entries.length){location.href="products.html";return;}

    const order={
      number:orderNumber(),
      name,
      phone,
      address,
      items:entries.map(({product,qty})=>({id:product.id,name:product.name,qty,price:product.price})),
      total:cartTotal(),
      createdAt:new Date().toISOString()
    };

    localStorage.setItem(ORDER_KEY,JSON.stringify(order));
    localStorage.removeItem(CART_KEY);
    location.href="success.html";
  });
}

function initSuccess(){
  const order=JSON.parse(localStorage.getItem(ORDER_KEY)||"null");
  if(!order){location.href="products.html";return;}

  document.querySelector("#success-order-number").textContent="#"+order.number;
  document.querySelector("#success-total").textContent=money(order.total);
  document.querySelector("#success-items").innerHTML=order.items.map(i=>`<div class="success-item"><span>${i.name} × ${i.qty}</span><strong>${money(i.price*i.qty)}</strong></div>`).join("");
  document.querySelector("#success-copy").textContent=`Thanks, ${order.name}. Send this order to us on WhatsApp and we'll take it from there.`;

  const body=[
    `🎆 NEW CRACKERA ORDER\n\nOrder: #${order.number}`,
    `Customer: ${order.name}`,
    `Mobile: ${order.phone}`,
    `Address: ${order.address}`,
    "",
    "Items:",
    ...order.items.map(i=>`• ${i.name} × ${i.qty} = ${money(i.price*i.qty)}`),
    "",
    `Total: ${money(order.total)}`,
    "",
    "Please confirm my order."
  ];

  const url=`https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(body.join("\n"))}`;
  document.querySelector("#whatsapp-btn").href=url;
}

document.addEventListener("DOMContentLoaded",()=>{
  refreshCommon();
  renderFeatured();
  initProductsPage();
  renderCart();
  renderBooking();
  initBooking();
  initSuccess();
});
