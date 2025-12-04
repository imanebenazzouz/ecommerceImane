// src/pages/Support.jsx
//
// Support client: création de fils, lecture, réponses, marquage comme lu.
import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

export default function Support() {
  const { isAuthenticated } = useAuth();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Formulaire de création de thread
  const [newThread, setNewThread] = useState({
    subject: "",
    order_id: "",
  });

  // États pour l'autocomplétion des commandes
  const [userOrders, setUserOrders] = useState([]);
  const [showOrderSuggestions, setShowOrderSuggestions] = useState(false);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [orderValidation, setOrderValidation] = useState({ isValid: null, message: "" });

  // Charger les threads au montage
  useEffect(() => {
    if (isAuthenticated()) {
      loadThreads();
      loadUserOrders();
    }
  }, [isAuthenticated]);

  const loadThreads = async () => {
    try {
      setLoading(true);
      const data = await api.listSupportThreads();
      setThreads(data);
      setError(null);
    } catch (err) {
      setError("Erreur lors du chargement des fils de discussion");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserOrders = async () => {
    try {
      const orders = await api.myOrders();
      setUserOrders(orders);
    } catch (err) {
      console.error("Erreur lors du chargement des commandes:", err);
    }
  };

  const loadThread = async (threadId) => {
    try {
      const data = await api.getSupportThread(threadId);
      setSelectedThread(data);

      // Marquer automatiquement les messages comme lus quand on ouvre le thread
      if (data.unread_count > 0) {
        try {
          await api.markSupportThreadAsRead(threadId);
          // Mettre à jour la liste des threads pour refléter le changement
          await loadThreads();
        } catch (markReadErr) {
          console.error("Erreur lors du marquage des messages comme lus:", markReadErr);
        }
      }
    } catch (err) {
      setError("Erreur lors du chargement du fil");
      console.error(err);
    }
  };

  const createThread = async (e) => {
    e.preventDefault();

    if (!isAuthenticated()) {
      setError("Vous devez être connecté pour créer un fil de support");
      return;
    }

    // Validation de la commande si un ID est fourni
    if (newThread.order_id && newThread.order_id.trim()) {
      const orderExists = userOrders.find((order) => order.id === newThread.order_id.trim());
      if (!orderExists) {
        setError("L'ID de commande saisi n'existe pas dans vos commandes. Veuillez utiliser l'autocomplétion ou laisser le champ vide.");
        return;
      }
    }

    try {
      const data = await api.createSupportThread({
        subject: newThread.subject,
        order_id: newThread.order_id && newThread.order_id.trim() ? newThread.order_id.trim() : null,
      });
      setThreads([data, ...threads]);
      setNewThread({ subject: "", order_id: "" });
      setShowCreateForm(false);
      setShowOrderSuggestions(false);
      setOrderValidation({ isValid: null, message: "" });
      setError(null);
    } catch (err) {
      console.error("Erreur lors de la création du fil:", err);
      setError(`Erreur lors de la création du fil: ${err.message || err}`);
    }
  };

  // Fonctions pour l'autocomplétion des commandes
  const handleOrderIdChange = (value) => {
    setNewThread({ ...newThread, order_id: value });

    // Réinitialiser la validation
    setOrderValidation({ isValid: null, message: "" });

    if (value.trim()) {
      const filtered = userOrders.filter(
        (order) => order.id.toLowerCase().includes(value.toLowerCase()) || order.id.slice(-8).includes(value)
      );
      setFilteredOrders(filtered);
      setShowOrderSuggestions(filtered.length > 0);

      // Vérifier si l'ID saisi correspond exactement à une commande
      const exactMatch = userOrders.find((order) => order.id === value.trim());
      if (exactMatch) {
        setOrderValidation({ isValid: true, message: "Commande trouvée" });
      } else if (value.trim().length > 8) {
        // Si l'utilisateur a tapé quelque chose de long qui ne correspond à aucune commande
        setOrderValidation({ isValid: false, message: "Commande introuvable" });
      }
    } else {
      // Afficher toutes les commandes si le champ est vide
      setFilteredOrders(userOrders);
      setShowOrderSuggestions(userOrders.length > 0);
    }
  };

  const handleOrderIdFocus = () => {
    // Afficher toutes les commandes dès qu'on focus le champ
    if (userOrders.length > 0) {
      if (newThread.order_id.trim()) {
        handleOrderIdChange(newThread.order_id);
      } else {
        setFilteredOrders(userOrders);
        setShowOrderSuggestions(true);
      }
    }
  };

  const selectOrder = (orderId) => {
    setNewThread({ ...newThread, order_id: orderId });
    setShowOrderSuggestions(false);
    setFilteredOrders([]);
    setOrderValidation({ isValid: true, message: "Commande sélectionnée" });
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    // Validation côté client : vérifier que le message fait au moins 3 caractères après nettoyage
    const trimmedMessage = newMessage.trim().replace(/\s+/g, " ");
    if (!trimmedMessage || trimmedMessage.length < 3) {
      setError("Le message doit contenir au moins 3 caractères");
      return;
    }

    if (!selectedThread) return;

    try {
      const data = await api.postSupportMessage(selectedThread.id, {
        content: newMessage,
      });

      // Mettre à jour le thread avec le nouveau message
      const updatedThread = {
        ...selectedThread,
        messages: [...selectedThread.messages, data],
      };
      setSelectedThread(updatedThread);
      setNewMessage("");
      setError(null);
    } catch (err) {
      // Afficher le message d'erreur exact du backend
      const errorMessage = err.message || err.toString() || "Erreur lors de l'envoi du message";
      setError(`Erreur : ${errorMessage}`);
      console.error("Erreur lors de l'envoi du message:", err);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString("fr-FR");
  };

  // Vérifier l'authentification
  if (!isAuthenticated()) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card--frosted" style={{ maxWidth: 520 }}>
          <h2>Accès refusé</h2>
          <p className="muted" style={{ textAlign: "center" }}>
            Vous devez être connecté pour accéder au support.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card--frosted" style={{ maxWidth: 520, textAlign: "center" }}>
          <p>Chargement des fils de discussion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="support-page">
      <div className="support-header">
        <div>
          <p className="support-kicker">Contact & Support</p>
          <h1>Une aide réactive et douce</h1>
          <p className="support-subtitle">
            Posez vos questions, suivez vos fils de discussion et gardez un œil sur vos commandes. Même univers visuel que vos pages de
            connexion/inscription.
          </p>
        </div>
        <button className="btn btn-rose btn-lg" onClick={() => setShowCreateForm(true)}>
          + Nouvelle demande
        </button>
      </div>

      {error && <div className="message message-error">{error}</div>}

      <div className="support-grid">
        {/* Liste des threads */}
        <div className="support-panel">
          <div className="support-panel__header">
            <h2>Mes demandes</h2>
            <span className="support-pill">{threads.length} fils</span>
          </div>

          {threads.length === 0 ? (
            <p className="muted support-empty">Aucune demande de support</p>
          ) : (
            <div className="support-threads">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className={`support-thread ${selectedThread?.id === thread.id ? "support-thread--active" : ""}`}
                  onClick={() => loadThread(thread.id)}
                >
                  <div className="support-thread__title">
                    <span>{thread.subject}</span>
                    {thread.unread_count > 0 && <span className="support-badge">{thread.unread_count}</span>}
                  </div>
                  <div className="support-thread__meta">
                    {thread.order_id ? `Commande #${thread.order_id.slice(-8)}` : "Demande générale"}
                    {thread.closed && " • 🔒 Fermé"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zone de conversation */}
        <div className="support-panel support-panel--conversation">
          {selectedThread ? (
            <>
              <div className="support-thread-head">
                <div>
                  <h3>{selectedThread.subject}</h3>
                  <p className="support-thread__meta">
                    {selectedThread.order_id ? `Commande #${selectedThread.order_id.slice(-8)}` : "Demande générale"}
                    {selectedThread.closed && " • 🔒 Fermé"}
                  </p>
                </div>
                {!selectedThread.closed && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateForm(true)}>
                    Nouveau fil
                  </button>
                )}
              </div>

              <div className="support-messages">
                {selectedThread.messages.length === 0 ? (
                  <p className="muted support-empty">Aucun message dans cette conversation</p>
                ) : (
                  <div className="support-messages__list">
                    {selectedThread.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`support-bubble ${message.author_user_id ? "support-bubble--me" : "support-bubble--them"}`}
                      >
                        <div className="support-bubble__content">{message.content}</div>
                        <div className="support-bubble__meta">
                          {message.author_name} • {formatDate(message.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!selectedThread.closed ? (
                <form className="support-message-form" onSubmit={sendMessage}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Tapez votre message..."
                    className="form-input"
                  />
                  <button type="submit" className="btn btn-rose" disabled={!newMessage.trim()}>
                    Envoyer
                  </button>
                </form>
              ) : (
                <div className="support-closed">🔒 Cette conversation est fermée</div>
              )}
            </>
          ) : (
            <div className="support-empty-state">
              <p>Sélectionnez une conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de création de thread */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Nouvelle demande de support</h3>
              <button className="modal-close" type="button" onClick={() => setShowCreateForm(false)}>
                ×
              </button>
            </div>
            <form onSubmit={createThread}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="subject">
                    Sujet *
                  </label>
                  <input
                    id="subject"
                    type="text"
                    value={newThread.subject}
                    onChange={(e) => setNewThread({ ...newThread, subject: e.target.value })}
                    placeholder="Décrivez votre problème..."
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group support-order">
                  <label className="form-label" htmlFor="order">
                    Commande (optionnel)
                  </label>
                  <input
                    id="order"
                    type="text"
                    value={newThread.order_id}
                    onChange={(e) => handleOrderIdChange(e.target.value)}
                    onFocus={handleOrderIdFocus}
                    onBlur={() => setTimeout(() => setShowOrderSuggestions(false), 200)}
                    placeholder="Cliquez pour voir vos commandes..."
                    className={`form-input ${
                      orderValidation.isValid === false ? "support-input--error" : orderValidation.isValid === true ? "support-input--ok" : ""
                    }`}
                  />
                  {showOrderSuggestions && filteredOrders.length > 0 && (
                    <div className="support-suggestions">
                      <div className="support-suggestions__header">
                        {filteredOrders.length === userOrders.length
                          ? `${userOrders.length} commande(s) disponible(s)`
                          : `${filteredOrders.length} résultat(s) trouvé(s)`}
                      </div>
                      {filteredOrders.slice(0, 5).map((order) => (
                        <button key={order.id} type="button" className="support-suggestion" onClick={() => selectOrder(order.id)}>
                          <div className="support-suggestion__title">Commande #{order.id.slice(-8)}</div>
                          <div className="support-suggestion__meta">
                            {order.status} • {new Date(order.created_at * 1000).toLocaleDateString("fr-FR")}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {orderValidation.message && (
                    <div className="support-hint" style={{ color: orderValidation.isValid ? "var(--success-700)" : "var(--danger-600)" }}>
                      {orderValidation.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-rose">
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
