// src/pages/Admin.jsx
//
// Espace administrateur: CRUD produits et consultation/gestion des commandes.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, getImageUrl } from "../lib/api";

export default function Admin() {
  const navigate = useNavigate();

  // Sécurité front rapide (on cache la page si pas admin)
  const role = (typeof localStorage !== "undefined" && localStorage.getItem("role")) || "user";
  useEffect(() => {
    if (role !== "admin") navigate("/", { replace: true });
  }, [role, navigate]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // État pour les commandes clients
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showOrders, setShowOrders] = useState(false);

  // Formulaire de création
  const [form, setForm] = useState({
    name: "",
    description: "",
    price_eur: "", // on saisit en euros côté UI, on convertit en cents pour l'API
    stock_qty: "",
    active: true,
    image_url: "",
    characteristics: "",
    usage_advice: "",
    commitment: "",
    composition: "",
  });
  
  // État pour l'upload d'image
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const fmt = useMemo(() => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }), []);

  function eurToCents(v) {
    if (v === "" || v === null || v === undefined) return 0;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }

  function centsToEur(c) {
    if (c === null || c === undefined) return "";
    return (c / 100).toFixed(2);
  }

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await api.adminListProducts();
      console.log("Produits chargés:", data);
      setItems(data || []);
    } catch (e) {
      console.error("Erreur chargement produits:", e);
      setErr(e.message || "Impossible de charger les produits.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Fonction pour charger les commandes
  async function loadOrders(params = {}) {
    setOrdersLoading(true);
    setErr("");
    try {
      const data = await api.adminListOrders(params);
      setOrders(data || []);
    } catch (e) {
      console.error("Erreur chargement commandes:", e);
      setErr(e.message || "Impossible de charger les commandes.");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  // Fonction pour afficher toutes les commandes
  async function handleViewAllOrders() {
    setShowOrders(true);
    await loadOrders();
  }

  // Fonction pour uploader une image
  async function handleImageUpload(file) {
    if (!file) return;
    
    setUploadingImage(true);
    setErr("");
    try {
      const result = await api.adminUploadImage(file);
      const fullImageUrl = getImageUrl(result.image_url) || result.image_url;
      setForm(f => ({ ...f, image_url: fullImageUrl }));
      setImagePreview(fullImageUrl);
      setMsg("Image uploadée avec succès");
    } catch (e) {
      console.error("Erreur upload image:", e);
      setErr(e.message || "Erreur lors de l'upload de l'image.");
    } finally {
      setUploadingImage(false);
    }
  }

  // Fonction pour gérer la sélection d'un fichier
  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Vérifier le type de fichier
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErr("Format de fichier non autorisé. Formats acceptés: JPG, PNG, GIF, WEBP");
      return;
    }
    
    setSelectedImageFile(file);
    
    // Créer un aperçu local
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    // Uploader automatiquement
    handleImageUpload(file);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      // Validation côté client
      if (!form.name.trim()) {
        setErr("Le nom du produit est obligatoire");
        return;
      }
      if (eurToCents(form.price_eur) < 0) {
        setErr("Le prix ne peut pas être négatif");
        return;
      }
      if (Number(form.stock_qty || 0) < 0) {
        setErr("Le stock ne peut pas être négatif");
        return;
      }

      const body = {
        name: form.name.trim(),
        description: form.description.trim() || "",
        price_cents: eurToCents(form.price_eur),
        stock_qty: Number(form.stock_qty || 0),
        active: !!form.active,
        image_url: form.image_url || null,
        characteristics: form.characteristics.trim() || null,
        usage_advice: form.usage_advice.trim() || null,
        commitment: form.commitment.trim() || null,
        composition: form.composition.trim() || null,
      };
      
      console.log("Données envoyées:", body);
      
      const created = await api.adminCreateProduct(body);
      console.log("Produit créé reçu:", created);
      setMsg(`Produit créé : ${created.name}`);
      setForm({ 
        name: "", 
        description: "", 
        price_eur: "", 
        stock_qty: "", 
        active: true, 
        image_url: "",
        characteristics: "",
        usage_advice: "",
        commitment: "",
        composition: "",
      });
      setSelectedImageFile(null);
      setImagePreview(null);
      await load();
    } catch (e) {
      console.error("Erreur création produit:", e);
      setErr(e.message || "Erreur lors de la création.");
    }
  }

  async function handleUpdate(id, patch) {
    setErr(""); setMsg("");
    try {
      // Validation côté client
      if (patch.name !== undefined && !patch.name.trim()) {
        setErr("Le nom du produit ne peut pas être vide");
        return;
      }
      if (patch.price_eur !== undefined && eurToCents(patch.price_eur) < 0) {
        setErr("Le prix ne peut pas être négatif");
        return;
      }
      if (patch.stock_qty !== undefined && Number(patch.stock_qty) < 0) {
        setErr("Le stock ne peut pas être négatif");
        return;
      }

      // On convertit si besoin
      const b = { ...patch };
      if (Object.prototype.hasOwnProperty.call(b, "price_eur")) {
        b.price_cents = eurToCents(b.price_eur);
        delete b.price_eur;
      }
      if (Object.prototype.hasOwnProperty.call(b, "stock_qty")) {
        b.stock_qty = Number(b.stock_qty);
      }
      const updated = await api.adminUpdateProduct(id, b);
      setMsg(`Modifié : ${updated.name}`);
      await load();
    } catch (e) {
      console.error("Erreur mise à jour produit:", e);
      setErr(e.message || "Erreur de mise à jour.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce produit ?")) return;
    setErr(""); setMsg("");
    try {
      await api.adminDeleteProduct(id);
      setMsg("Produit supprimé");
      await load();
    } catch (e) {
      console.error("Erreur suppression produit:", e);
      setErr(e.message || "Erreur de suppression.");
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Espace administrateur</h2>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          Gérer le catalogue produits (créer, éditer, supprimer).
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <Link to="/admin/support" style={adminLinkStyle}>Support</Link>
          <Link to="/admin/reset-password" style={adminLinkStyle}>Réinitialiser un mot de passe</Link>
        </div>
      </header>

      {/* Alerts */}
      {msg && (
        <div style={{
          padding: "10px 12px", borderRadius: 8, marginBottom: 12,
          background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", fontWeight: 600
        }}>
          {msg}
        </div>
      )}
      {err && (
        <div style={{
          padding: "10px 12px", borderRadius: 8, marginBottom: 12,
          background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", fontWeight: 600
        }}>
          {err}
        </div>
      )}

      {/* Formulaire Création */}
      <section style={{
        border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 20,
        background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.04)"
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>Créer un produit</h3>
        <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "block" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Nom</div>
            <input
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              required
              style={fieldStyle}
              placeholder="Ex: T-Shirt Logo"
            />
          </label>

          <label style={{ display: "block" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Prix (EUR)</div>
            <input
              value={form.price_eur}
              onChange={(e) => setForm(f => ({ ...f, price_eur: e.target.value }))}
              required
              inputMode="decimal"
              style={fieldStyle}
              placeholder="19.99"
            />
          </label>

          <label style={{ display: "block" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Stock</div>
            <input
              value={form.stock_qty}
              onChange={(e) => setForm(f => ({ ...f, stock_qty: e.target.value }))}
              required
              inputMode="numeric"
              style={fieldStyle}
              placeholder="100"
            />
          </label>

          <label style={{ display: "block" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Actif</div>
            <select
              value={form.active ? "1" : "0"}
              onChange={(e) => setForm(f => ({ ...f, active: e.target.value === "1" }))}
              style={fieldStyle}
            >
              <option value="1">Oui</option>
              <option value="0">Non</option>
            </select>
          </label>

          <label style={{ display: "block", gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Description</div>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              style={{ ...fieldStyle, resize: "vertical" }}
              placeholder="Coton bio, coupe droite…"
            />
          </label>

          <label style={{ display: "block", gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Caractéristiques</div>
            <textarea
              value={form.characteristics}
              onChange={(e) => setForm(f => ({ ...f, characteristics: e.target.value }))}
              rows={3}
              style={{ ...fieldStyle, resize: "vertical" }}
              placeholder="Matériau, dimensions, poids, etc."
            />
          </label>

          <label style={{ display: "block", gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Conseil d'utilisation</div>
            <textarea
              value={form.usage_advice}
              onChange={(e) => setForm(f => ({ ...f, usage_advice: e.target.value }))}
              rows={3}
              style={{ ...fieldStyle, resize: "vertical" }}
              placeholder="Instructions d'utilisation, conseils d'entretien, etc."
            />
          </label>

          <label style={{ display: "block", gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Engagement</div>
            <textarea
              value={form.commitment}
              onChange={(e) => setForm(f => ({ ...f, commitment: e.target.value }))}
              rows={3}
              style={{ ...fieldStyle, resize: "vertical" }}
              placeholder="Garantie, politique de retour, engagement qualité, etc."
            />
          </label>

          <label style={{ display: "block", gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Composition</div>
            <textarea
              value={form.composition}
              onChange={(e) => setForm(f => ({ ...f, composition: e.target.value }))}
              rows={3}
              style={{ ...fieldStyle, resize: "vertical" }}
              placeholder="Liste des ingrédients, matériaux, etc."
            />
          </label>

          <label style={{ display: "block", gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Image du produit</div>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              disabled={uploadingImage}
              style={fieldStyle}
            />
            {uploadingImage && (
              <div style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>
                Upload en cours...
              </div>
            )}
            {imagePreview && (
              <div style={{ marginTop: 12 }}>
                <img 
                  src={imagePreview} 
                  alt="Aperçu" 
                  style={{ 
                    maxWidth: "200px", 
                    maxHeight: "200px", 
                    borderRadius: 8,
                    border: "1px solid #e5e7eb"
                  }} 
                />
              </div>
            )}
            {form.image_url && !imagePreview && (
              <div style={{ marginTop: 12 }}>
                <img 
                  src={getImageUrl(form.image_url) || form.image_url} 
                  alt="Image actuelle" 
                  style={{ 
                    maxWidth: "200px", 
                    maxHeight: "200px", 
                    borderRadius: 8,
                    border: "1px solid #e5e7eb"
                  }} 
                />
              </div>
            )}
          </label>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="submit" style={primaryBtn} disabled={uploadingImage}>Créer</button>
            <button 
              type="button" 
              style={secondaryBtn} 
              onClick={() => {
                setForm({ 
                  name:"", 
                  description:"", 
                  price_eur:"", 
                  stock_qty:"", 
                  active:true, 
                  image_url:"",
                  characteristics: "",
                  usage_advice: "",
                  commitment: "",
                  composition: "",
                });
                setSelectedImageFile(null);
                setImagePreview(null);
              }}
            >
              Réinitialiser
            </button>
          </div>
        </form>
      </section>

      {/* Liste produits */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Produits ({items.length})</h3>
          <button onClick={load} style={secondaryBtn}>Rafraîchir</button>
        </div>

        {loading ? (
          <p style={{ color: "#64748b" }}>Chargement…</p>
        ) : items.length === 0 ? (
          <div style={{
            padding: 24, textAlign: "center", border: "1px solid #e5e7eb",
            borderRadius: 12, background: "#fff"
          }}>
            Aucun produit.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {items.map(p => (
              <article key={p.id} style={{
                border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff",
                boxShadow: "0 1px 2px rgba(0,0,0,.04)", overflow: "hidden"
              }}>
                <div style={{
                  padding: 12, borderBottom: "1px solid #eef2f7", background: "#f8fafc",
                  display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                  <strong>{p.name}</strong>
                  <span style={{ fontWeight: 700, color: "#2563eb" }}>{fmt.format(p.price_cents / 100)}</span>
                </div>

                <div style={{ padding: 12, display: "grid", gap: 8 }}>
                  <div style={{ color: "#64748b", fontSize: 14 }}>
                    <div><strong>Description:</strong> {p.description || "—"}</div>
                    <div style={{ marginTop: 6 }}>
                      <strong>Caractéristiques:</strong> {p.characteristics || "—"}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <strong>Conseil d'utilisation:</strong> {p.usage_advice || "—"}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <strong>Engagement:</strong> {p.commitment || "—"}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <strong>Composition:</strong> {p.composition || "—"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <small>Stock:</small>
                    <input
                      defaultValue={p.stock_qty}
                      type="number"
                      min="0"
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (val !== p.stock_qty && Number.isFinite(val)) handleUpdate(p.id, { stock_qty: val });
                      }}
                      style={{ ...fieldStyle, width: 110, padding: "6px 8px" }}
                    />

                    <small>Actif:</small>
                    <select
                      defaultValue={p.active ? "1" : "0"}
                      onChange={(e) => handleUpdate(p.id, { active: e.target.value === "1" })}
                      style={{ ...fieldStyle, width: 100, padding: "6px 8px" }}
                    >
                      <option value="1">Oui</option>
                      <option value="0">Non</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <small>Nom:</small>
                    <input
                      defaultValue={p.name}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== p.name) handleUpdate(p.id, { name: v });
                      }}
                      style={{ ...fieldStyle, flex: 1, padding: "6px 8px" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <small>Prix (EUR):</small>
                    <input
                      defaultValue={centsToEur(p.price_cents)}
                      inputMode="decimal"
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v !== centsToEur(p.price_cents)) handleUpdate(p.id, { price_eur: v });
                      }}
                      style={{ ...fieldStyle, width: 140, padding: "6px 8px" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                    <button onClick={() => handleDelete(p.id)} style={dangerBtn}>Supprimer</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Section Commandes Clients */}
      <section style={{
        border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginTop: 20,
        background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.04)"
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Commandes</h3>
        
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <button 
            onClick={handleViewAllOrders}
            style={secondaryBtn}
            disabled={ordersLoading}
          >
            Voir toutes les commandes
          </button>
        </div>

        {showOrders && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h4 style={{ margin: 0 }}>
                Toutes les commandes ({orders.length})
              </h4>
              <button onClick={() => setShowOrders(false)} style={secondaryBtn}>
                Masquer
              </button>
            </div>

            {ordersLoading ? (
              <p style={{ color: "#64748b" }}>Chargement des commandes…</p>
            ) : orders.length === 0 ? (
              <div style={{
                padding: 24, textAlign: "center", border: "1px solid #e5e7eb",
                borderRadius: 12, background: "#f8fafc"
              }}>
                Aucune commande trouvée.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {orders.map(order => (
                  <div key={order.id} style={{
                    border: "1px solid #e5e7eb", borderRadius: 8, padding: 12,
                    background: "#f8fafc"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <strong>Commande #{order.id.slice(-8)}</strong>
                        <div style={{ fontSize: 14, color: "#64748b" }}>
                          Client: {order.user_id.slice(0, 8)}...
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "#2563eb" }}>
                          {fmt.format(order.total_cents / 100)}
                        </div>
                        <div style={{ 
                          fontSize: 12, 
                          padding: "2px 6px", 
                          borderRadius: 4,
                          background: order.status === "PAYEE" ? "#dcfce7" : 
                                     order.status === "EXPEDIEE" ? "#dbeafe" :
                                     order.status === "LIVREE" ? "#f0f9ff" : "#fef3c7",
                          color: order.status === "PAYEE" ? "#166534" :
                                 order.status === "EXPEDIEE" ? "#1e40af" :
                                 order.status === "LIVREE" ? "#0c4a6e" : "#92400e"
                        }}>
                          {order.status}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: 14, color: "#64748b", marginBottom: 8 }}>
                      {order.items.length} article(s) : {order.items.map(item => `${item.name} (x${item.quantity})`).join(", ")}
                    </div>

                    {order.delivery && (
                      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 8 }}>
                        Livraison: {order.delivery.transporteur} - {order.delivery.delivery_status}
                        {order.delivery.tracking_number && ` (${order.delivery.tracking_number})`}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button 
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                        style={{ ...secondaryBtn, fontSize: 12, padding: "4px 8px" }}
                      >
                        Voir détails
                      </button>
                      {order.status === "PAYEE" && (
                        <button 
                          onClick={async () => {
                            try {
                              await api.adminValidateOrder(order.id);
                              setMsg(`Commande ${order.id.slice(-8)} validée`);
                              await loadOrders();
                            } catch (e) {
                              setErr(e.message);
                            }
                          }}
                          style={{ ...primaryBtn, fontSize: 12, padding: "4px 8px" }}
                        >
                          Valider
                        </button>
                      )}
                      {order.status === "VALIDEE" && (
                        <button 
                          onClick={async () => {
                            try {
                              setErr(""); // Effacer les erreurs précédentes
                              await api.adminShipOrder(order.id);
                              setMsg(`Commande ${order.id.slice(-8)} expédiée`);
                              await loadOrders();
                            } catch (e) {
                              console.error("Erreur expédition:", e);
                              if (e.status === 422) {
                                setErr(`Erreur de validation: ${e.message}`);
                              } else if (e.status === 400) {
                                setErr(`Erreur de statut: ${e.message}`);
                              } else {
                                setErr(`Erreur d'expédition: ${e.message}`);
                              }
                            }
                          }}
                          style={{ ...primaryBtn, fontSize: 12, padding: "4px 8px" }}
                        >
                          Expédier
                        </button>
                      )}
                      {order.status === "EXPEDIEE" && (
                        <button 
                          onClick={async () => {
                            try {
                              await api.adminMarkDelivered(order.id);
                              setMsg(`Commande ${order.id.slice(-8)} marquée livrée`);
                              await loadOrders();
                            } catch (e) {
                              setErr(e.message);
                            }
                          }}
                          style={{ ...primaryBtn, fontSize: 12, padding: "4px 8px" }}
                        >
                          Marquer livrée
                        </button>
                      )}
                      {["CREE", "VALIDEE", "PAYEE"].includes(order.status) && (
                        <button 
                          onClick={async () => {
                            if (confirm("Annuler cette commande ?\n\nCette action :\n- Remettra le stock\n- Remboursera si payée")) {
                              try {
                                await api.adminCancelOrder(order.id);
                                setMsg(`Commande ${order.id.slice(-8)} annulée`);
                                await loadOrders();
                              } catch (e) {
                                setErr(e.message);
                              }
                            }
                          }}
                          style={{ ...dangerBtn, fontSize: 12, padding: "4px 8px" }}
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

const adminLinkStyle = {
  padding: "6px 14px",
  backgroundColor: "#f1f5f9",
  color: "#1e40af",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  fontSize: 14,
  textDecoration: "none",
  fontWeight: 500,
};

const fieldStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  outline: "none",
};

const primaryBtn = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtn = {
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const dangerBtn = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};