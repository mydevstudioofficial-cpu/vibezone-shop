// Netlify Function: generates a product-specific share preview.
// When someone opens a /product/<id> link, this runs BEFORE the React app loads.
// - Real users: instantly redirected into the app at that exact product.
// - WhatsApp/Facebook/Messenger link-preview bots: they don't run JavaScript,
//   they just read these <meta property="og:..."> tags, so this is what makes
//   the shared link show the product's own photo, name, and price as a card.

const FIREBASE_PRODUCTS_URL = "https://vibe-zone-2c278-default-rtdb.firebaseio.com/catalog/products.json";

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

exports.handler = async (event) => {
  const parts = event.path.split("/").filter(Boolean);
  const id = parts[parts.length - 1];
  const siteUrl = "https://" + event.headers.host;
  const redirectUrl = siteUrl + "/?product=" + encodeURIComponent(id);

  let product = null;
  try {
    const res = await fetch(FIREBASE_PRODUCTS_URL);
    const products = await res.json();
    if (Array.isArray(products)) {
      product = products.find((p) => p && p.id === id);
    } else if (products && typeof products === "object") {
      product = Object.values(products).find((p) => p && p.id === id);
    }
  } catch (e) {
    // Firebase unreachable — fall through and just redirect to the store
  }

  if (!product) {
    return { statusCode: 302, headers: { Location: siteUrl } };
  }

  const title = product.name + " — Vibe Zone";
  const image = (product.images && product.images[0]) || product.image || (siteUrl + "/icon-512.png");
  const priceLine = "৳ " + product.price + (product.oldPrice ? " (আগের দাম ৳ " + product.oldPrice + ")" : "");
  const description = (product.description && product.description.trim())
    ? product.description.trim().slice(0, 160)
    : priceLine + " — Vibe Zone-e ekhoni order koro!";

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">

<meta property="og:type" content="product">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${escapeHtml(redirectUrl)}">
<meta property="product:price:amount" content="${escapeHtml(String(product.price))}">
<meta property="product:price:currency" content="BDT">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">

<meta http-equiv="refresh" content="0; url=${escapeHtml(redirectUrl)}">
<script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
</head>
<body>
<p>Redirecting to <a href="${escapeHtml(redirectUrl)}">${escapeHtml(product.name)}</a>…</p>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: html,
  };
};
