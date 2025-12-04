// src/lib/api.js
//
// Frontend HTTP client for the ecommerce API.
// - Centralizes fetch calls with consistent error handling
// - Injects bearer token when available
// - Exposes typed-like JSDoc for better IDE help and self-documentation
//
/**
 * Base URL of the backend API. Overridable via Vite env `VITE_API_BASE`.
 * Example: https://api.example.com
 * @type {string}
 */
const API = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

// --- Token helpers ---
/**
 * Read the JWT token from localStorage.
 * @returns {string|null}
 */
function getToken() {
  return localStorage.getItem("token");
}
/**
 * Persist or clear the JWT token in localStorage.
 * @param {string|null|undefined} t
 *   A non-empty string stores the token, otherwise it clears it.
 */
export function setToken(t) {
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

// --- HTTP helper ---
/**
 * Low-level HTTP request wrapper adding JSON headers and auth when available.
 * Parses JSON when possible, otherwise returns raw text. Throws Error on !ok.
 *
 * @template T
 * @param {string} path - API path beginning with '/'
 * @param {RequestInit} [init]
 * @returns {Promise<T>}
 */
async function request(path, init = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(API + path, {
    credentials: "include", // ok même si tu n'utilises pas de cookies
    ...init,
    headers,
  });

  // Try to read response (JSON first, fallback to plain text)
  let payload = null;
  const text = await res.text();
  if (text) {
    try { payload = JSON.parse(text); }
    catch { payload = text; }
  }

  if (!res.ok) {
    let msg;
    if (payload) {
      if (typeof payload === "string") {
        msg = payload;
      } else if (payload.detail) {
        // FastAPI retourne parfois detail comme array pour les erreurs de validation
        if (Array.isArray(payload.detail)) {
          // Extraire les messages d'erreur du tableau
          msg = payload.detail.map(err => {
            if (typeof err === "string") return err;
            if (err.msg) return err.msg;
            return JSON.stringify(err);
          }).join(", ");
        } else {
          msg = payload.detail;
        }
      } else if (payload.message) {
        msg = payload.message;
      } else if (payload.error) {
        msg = payload.error;
      } else {
        msg = `Erreur ${res.status}: ${JSON.stringify(payload)}`;
      }
    } else {
      msg = `Erreur HTTP ${res.status}`;
    }
    
    /** @type {Error & {status?: number, payload?: unknown}} */
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

/* =========================
   AUTH
   ========================= */

/**
 * Register a new user account.
 * @param {{email:string,password:string,first_name:string,last_name:string,address?:string}} params
 * @returns {Promise<object>}
 */
async function register({ email, password, first_name, last_name, address }) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, first_name, last_name, address }),
  });
}

/**
 * Login with credentials, store token, then fetch current user via /auth/me.
 * @param {{email:string,password:string}} params
 * @returns {Promise<{token:string,user:object}>}
 */
async function login({ email, password }) {
  const response = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  
  // Le backend retourne { access_token, token_type, user }
  const token = response.access_token;
  setToken(token);

  // récupère l'utilisateur courant (contient is_admin)
  let user = null;
  try { 
    user = await me(); 
  } catch (error) {
    console.warn('Erreur lors de la récupération des données utilisateur:', error);
    // Si on ne peut pas récupérer l'utilisateur, on déconnecte
    setToken(null);
    throw new Error('Erreur d\'authentification');
  }
  return { token, user };
}

/**
 * Get current authenticated user.
 * @returns {Promise<{id:string,email:string,first_name:string,last_name:string,address?:string,is_admin:boolean}>}
 */
async function me() {
  return request("/auth/me");
}

/**
 * Update the authenticated user's profile.
 * @param {{first_name?:string,last_name?:string,address?:string}} params
 * @returns {Promise<object>}
 */
async function updateProfile({ first_name, last_name, address }) {
  const body = {};
  if (first_name !== undefined) body.first_name = first_name;
  if (last_name !== undefined) body.last_name = last_name;
  if (address !== undefined) body.address = address;
  return request("/auth/profile", { method: "PUT", body: JSON.stringify(body) });
}

/**
 * Logout the current user and clear token locally even if remote call fails.
 * @returns {Promise<void>}
 */
async function logout() {
  try {
    await request("/auth/logout", { method: "POST" });
  } finally {
    setToken(null);
  }
}

/**
 * Request a password reset token for an email address.
 * @param {{email:string}} params
 * @returns {Promise<{message:string,token?:string,reset_url?:string}>}
 */
async function forgotPassword({ email }) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/**
 * Verify if a reset token is valid.
 * @param {{token:string}} params
 * @returns {Promise<{valid:boolean,email?:string,message?:string}>}
 */
async function verifyResetToken({ token }) {
  return request("/auth/verify-reset-token", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

/**
 * Reset password using a valid token.
 * @param {{token:string,new_password:string}} params
 * @returns {Promise<{message:string,success:boolean}>}
 */
async function resetPassword({ token, new_password }) {
  // Désactivé côté backend (retournera 410)
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password }),
  });
}

/**
 * Change password for the authenticated user.
 * @param {{current_password:string,new_password:string}} params
 * @returns {Promise<{message:string}>}
 */
async function changePassword({ current_password, new_password }) {
  return request("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
}

/**
 * Simple reset for unauthenticated user using email.
 * @param {{email:string,new_password:string}} params
 * @returns {Promise<{message:string}>}
 */
async function resetPasswordSimple({ email, new_password }) {
  return request("/auth/reset-password-simple", {
    method: "POST",
    body: JSON.stringify({ email, new_password }),
  });
}

/* =========================
   CATALOGUE (public)
   ========================= */

/**
 * List all products (public catalog).
 * @returns {Promise<Array<object>>}
 */
async function listProducts() {
  return request("/products");
}

/**
 * Get product details by id.
 * @param {string} productId
 * @returns {Promise<object>}
 */
async function getProduct(productId) {
  return request(`/products/${productId}`);
}

/* =========================
   PANIER & COMMANDES (user)
   ========================= */

/**
 * Retrieve the authenticated user's cart.
 * @returns {Promise<object>}
 */
async function viewCart() {
  return request("/cart");
}

// alias pour compat avec ton code existant
const getCart = viewCart;

/**
 * Add a product to cart.
 * @param {{product_id:string, qty?:number}} params
 * @returns {Promise<object>}
 */
async function addToCart({ product_id, qty = 1 }) {
  return request("/cart/add", { method: "POST", body: JSON.stringify({ product_id, qty }) });
}

/**
 * Remove quantity of a product from cart.
 * @param {{product_id:string, qty?:number}} params
 * @returns {Promise<object>}
 */
async function removeFromCart({ product_id, qty = 1 }) {
  return request("/cart/remove", { method: "POST", body: JSON.stringify({ product_id, qty }) });
}

async function clearCart() {
  return request("/cart/clear", { method: "DELETE" });
}

/**
 * Create an order from the current cart.
 * @returns {Promise<{order_id:string,total_cents:number,status:string}>}
 */
async function checkout() {
  return request("/orders/checkout", { method: "POST" });
}

/**
 * Pay an order with card details.
 * @param {string} order_id
 * @param {{card_number:string,exp_month:number,exp_year:number,cvc:string}} card
 * @returns {Promise<object>}
 */
async function payOrder(order_id, { card_number, exp_month, exp_year, cvc }) {
  return request(`/orders/${order_id}/pay`, {
    method: "POST",
    body: JSON.stringify({ card_number, exp_month, exp_year, cvc }),
  });
}

// alias pour compat (ton code utilisait payByCard)
const payByCard = payOrder;

/**
 * List the current user's orders.
 * @returns {Promise<Array<object>>}
 */
async function myOrders() {
  return request("/orders");
}

// alias compat
const getOrders = myOrders;

/**
 * Retrieve an order by id.
 * @param {string} orderId
 * @returns {Promise<object>}
 */
async function getOrder(orderId) {
  return request(`/orders/${orderId}`);
}

/**
 * Cancel an order by id.
 * @param {string} orderId
 * @returns {Promise<object>}
 */
async function cancelOrder(orderId) {
  return request(`/orders/${orderId}/cancel`, { method: "POST" });
}

/**
 * Retrieve invoice details for a given order id.
 * @param {string} orderId
 * @returns {Promise<object|string>}
 */
async function getInvoice(orderId) {
  return request(`/orders/${orderId}/invoice`);
}

/**
 * Trigger a browser download of the invoice PDF for an order.
 * Note: uses window object to create a temporary link.
 * @param {string} orderId
 * @returns {Promise<void>}
 */
async function downloadInvoicePDF(orderId) {
  const token = getToken();
  const response = await fetch(API + `/orders/${orderId}/invoice/download`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur de téléchargement: ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `facture_${orderId.slice(-8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Get shipping tracking details for an order.
 * @param {string} orderId
 * @returns {Promise<object>}
 */
async function getOrderTracking(orderId) {
  return request(`/orders/${orderId}/tracking`);
}

/**
 * Pay an order with extended fields (address, phone, postal code).
 * @param {{orderId:string,cardNumber:string,expMonth:number,expYear:number,cvc:string,postalCode?:string,phone?:string,streetNumber?:string,streetName?:string}} params
 * @returns {Promise<object>}
 */
async function processPayment({ orderId, cardNumber, expMonth, expYear, cvc, postalCode, phone, streetNumber, streetName }) {
  return request(`/orders/${orderId}/pay`, {
    method: "POST",
    body: JSON.stringify({ 
      card_number: cardNumber, 
      exp_month: expMonth, 
      exp_year: expYear, 
      cvc: cvc,
      postal_code: postalCode,
      phone: phone,
      street_number: streetNumber,
      street_name: streetName
    }),
  });
}

/* =========================
   ADMIN — Produits
   ========================= */

/**
 * Admin: list products.
 * @returns {Promise<Array<object>>}
 */
async function adminListProducts() {
  return request("/admin/products");
}

/**
 * Admin: create a product.
 * @param {object} body
 * @returns {Promise<object>}
 */
async function adminCreateProduct(body) {
  return request("/admin/products", { method: "POST", body: JSON.stringify(body) });
}

/**
 * Admin: update a product by id.
 * @param {string} id
 * @param {object} body
 * @returns {Promise<object>}
 */
async function adminUpdateProduct(id, body) {
  return request(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

/**
 * Admin: delete a product by id.
 * @param {string} id
 * @returns {Promise<object>}
 */
async function adminDeleteProduct(id) {
  return request(`/admin/products/${id}`, { method: "DELETE" });
}

/**
 * Admin: upload a product image.
 * @param {File} file - The image file to upload
 * @returns {Promise<{image_url: string, filename: string}>}
 */
async function adminUploadImage(file) {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(API + "/admin/products/upload-image", {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    let msg;
    try {
      const payload = JSON.parse(text);
      msg = payload.detail || payload.message || payload.error || `Erreur ${res.status}`;
    } catch {
      msg = text || `Erreur HTTP ${res.status}`;
    }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

/* =========================
   ADMIN — Commandes
   ========================= */

/**
 * Admin: list orders with optional filters.
 * @param {Record<string,string>} [params]
 * @returns {Promise<Array<object>>}
 */
async function adminListOrders(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/admin/orders${qs ? `?${qs}` : ""}`);
}

/**
 * Admin: get an order by id.
 * @param {string} orderId
 * @returns {Promise<object>}
 */
async function adminGetOrder(orderId) {
  return request(`/admin/orders/${orderId}`);
}

/**
 * Admin: get order status by id.
 * @param {string} orderId
 * @returns {Promise<object>}
 */
async function adminGetOrderStatus(orderId) {
  return request(`/admin/orders/${orderId}/status`);
}

/**
 * Admin: validate an order.
 * @param {string} order_id
 * @returns {Promise<object>}
 */
async function adminValidateOrder(order_id) {
  return request(`/admin/orders/${order_id}/validate`, { method: "POST" });
}

/**
 * Admin: mark an order as shipped with delivery metadata.
 * @param {string} order_id
 * @param {object} [delivery_data]
 * @returns {Promise<object>}
 */
async function adminShipOrder(order_id, delivery_data = {}) {
  // Données par défaut pour l'expédition
  const defaultDeliveryData = {
    transporteur: "Colissimo",
    tracking_number: null,
    delivery_status: "PREPAREE",
    ...delivery_data
  };
  
  return request(`/admin/orders/${order_id}/ship`, { 
    method: "POST", 
    body: JSON.stringify(defaultDeliveryData) 
  });
}

/**
 * Admin: mark an order as delivered.
 * @param {string} order_id
 * @returns {Promise<object>}
 */
async function adminMarkDelivered(order_id) {
  return request(`/admin/orders/${order_id}/mark-delivered`, { method: "POST" });
}

/**
 * Admin: cancel an order with automatic refund if paid.
 * @param {string} order_id
 * @returns {Promise<object>}
 */
async function adminCancelOrder(order_id) {
  return request(`/admin/orders/${order_id}/cancel`, { method: "POST" });
}

/**
 * Admin: trigger a refund for an order.
 * @param {string} order_id
 * @param {{amount_cents?:number}} [body]
 * @returns {Promise<object>}
 */
async function adminRefundOrder(order_id, body = {}) {
  return request(`/admin/orders/${order_id}/refund`, { method: "POST", body: JSON.stringify(body) });
}

/* =========================
   SUPPORT CLIENT
   ========================= */

/**
 * Create a new support thread.
 * @param {{subject:string,order_id?:string|null}} params
 * @returns {Promise<object>}
 */
async function createSupportThread({ subject, order_id = null }) {
  return request("/support/threads", {
    method: "POST",
    body: JSON.stringify({ subject, order_id }),
  });
}

/**
 * List support threads for the current user/admin view.
 * @returns {Promise<Array<object>>}
 */
async function listSupportThreads() {
  return request("/support/threads");
}

/**
 * Get a support thread by id.
 * @param {string} threadId
 * @returns {Promise<object>}
 */
async function getSupportThread(threadId) {
  return request(`/support/threads/${threadId}`);
}

/**
 * Post a message to a support thread.
 * @param {string} threadId
 * @param {{content:string}} params
 * @returns {Promise<object>}
 */
async function postSupportMessage(threadId, { content }) {
  return request(`/support/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

/**
 * Mark a support thread as read.
 * @param {string} threadId
 * @returns {Promise<object>}
 */
async function markSupportThreadAsRead(threadId) {
  return request(`/support/threads/${threadId}/mark-read`, { method: "POST" });
}

/* =========================
   ADMIN SUPPORT
   ========================= */

/**
 * Admin: list all support threads.
 * @returns {Promise<Array<object>>}
 */
async function adminListSupportThreads() {
  try {
    return await request("/admin/support/threads");
  } catch (error) {
    // Erreur adminListSupportThreads
    throw new Error(`Erreur lors du chargement des fils de discussion: ${error.message || "Erreur inconnue"}`);
  }
}

/**
 * Admin: get a support thread by id.
 * @param {string} threadId
 * @returns {Promise<object>}
 */
async function adminGetSupportThread(threadId) {
  try {
    if (!threadId) {
      throw new Error("ID du fil de discussion manquant");
    }
    return await request(`/admin/support/threads/${threadId}`);
  } catch (error) {
    // Erreur adminGetSupportThread
    throw new Error(`Erreur lors du chargement du fil: ${error.message || "Erreur inconnue"}`);
  }
}

/**
 * Admin: close a support thread by id.
 * @param {string} threadId
 * @returns {Promise<object>}
 */
async function adminCloseSupportThread(threadId) {
  try {
    if (!threadId) {
      throw new Error("ID du fil de discussion manquant");
    }
    return await request(`/admin/support/threads/${threadId}/close`, { method: "POST" });
  } catch (error) {
    // Erreur adminCloseSupportThread
    throw new Error(`Erreur lors de la fermeture du fil: ${error.message || "Erreur inconnue"}`);
  }
}

/**
 * Admin: post a message in a support thread.
 * @param {string} threadId
 * @param {{content:string}} params
 * @returns {Promise<object>}
 */
async function adminPostSupportMessage(threadId, { content }) {
  try {
    if (!threadId) {
      throw new Error("ID du fil de discussion manquant");
    }
    if (!content || !content.trim()) {
      throw new Error("Le contenu du message ne peut pas être vide");
    }
    return await request(`/admin/support/threads/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: content.trim() }),
    });
  } catch (error) {
    // Erreur adminPostSupportMessage
    throw new Error(`Erreur lors de l'envoi du message: ${error.message || "Erreur inconnue"}`);
  }
}

export const api = {
  // Auth
  register, login, logout, me, updateProfile, setToken,
  changePassword,
  resetPasswordSimple,

  // Catalogue / Panier / Commandes (user)
  listProducts, getProduct,
  viewCart, getCart,
  addToCart, removeFromCart, clearCart,
  checkout,
  payOrder, payByCard, processPayment,
  myOrders, getOrders, getOrder, cancelOrder,
  getInvoice, downloadInvoicePDF,

  // Admin Produits
  adminListProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminUploadImage,

  // Admin Commandes
  adminListOrders,
  adminGetOrder,
  adminGetOrderStatus,
  adminValidateOrder,
  adminCancelOrder,
  adminShipOrder,
  adminMarkDelivered,
  adminRefundOrder,
  
  // Suivi de livraison
  getOrderTracking,

  // Support Client
  createSupportThread,
  listSupportThreads,
  getSupportThread,
  postSupportMessage,
  markSupportThreadAsRead,

  // Admin Support
  adminListSupportThreads,
  adminGetSupportThread,
  adminCloseSupportThread,
  adminPostSupportMessage,
};