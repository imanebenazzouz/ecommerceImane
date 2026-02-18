/**
 * Composant d'autocomplétion d'adresse utilisant l'API Adresse du gouvernement français
 * 
 * Ce composant permet de :
 * - Rechercher des adresses en temps réel
 * - Afficher des suggestions
 * - Remplir automatiquement les champs d'adresse
 */

import React, { useState, useEffect, useRef } from 'react';
import { searchAddresses, parseAddressFromApi } from '../utils/addressApi';
import './AddressAutocomplete.css';

/**
 * @param {Object} props
 * @param {string} props.streetNumber - Valeur actuelle du numéro de rue
 * @param {string} props.streetName - Valeur actuelle du nom de rue
 * @param {string} props.postalCode - Valeur actuelle du code postal
 * @param {Function} props.onSelect - Callback appelé quand une adresse est sélectionnée
 * @param {Function} props.onChange - Callback appelé quand les valeurs changent
 * @param {Object} props.errors - Objet contenant les erreurs de validation
 * @param {boolean} props.disabled - Désactive le composant
 * @param {boolean} props.required - Si true, seule une adresse de l'API est acceptée
 * @param {boolean} props.isValidated - Indique si l'adresse actuelle a été validée par l'API
 */
export default function AddressAutocomplete({
  streetNumber,
  streetName,
  postalCode,
  onSelect,
  onChange,
  errors = {},
  disabled = false,
  required = true,
  isValidated = false
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedAddress, setSelectedAddress] = useState(null);
  
  const searchTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Construire la requête de recherche à partir des champs
  useEffect(() => {
    const parts = [];
    if (streetNumber) parts.push(streetNumber);
    if (streetName) parts.push(streetName);
    if (postalCode) parts.push(postalCode);
    const newQuery = parts.join(' ');
    setQuery(newQuery);
  }, [streetNumber, streetName, postalCode]);

  // Recherche d'adresses avec debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    setShowSuggestions(false);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchAddresses(query, 5);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Erreur recherche adresses:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    }, 300); // Debounce de 300ms

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  // Fermer les suggestions quand on clique ailleurs
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Gérer la sélection d'une adresse
  const handleSelectAddress = (address) => {
    const parsed = parseAddressFromApi(address);
    
    // Stocker l'adresse sélectionnée pour validation
    setSelectedAddress(address);
    
    // Appeler le callback avec les valeurs parsées et l'indicateur de validation
    if (onSelect) {
      onSelect({
        streetNumber: parsed.streetNumber,
        streetName: parsed.streetName,
        postalCode: parsed.postalCode,
        city: parsed.city,
        fullAddress: address.label,
        validated: true, // Marquer comme validé par l'API
        apiData: address // Données complètes de l'API
      });
    } else if (onChange) {
      // Fallback: utiliser onChange si onSelect n'est pas fourni
      onChange({
        target: {
          name: 'street_number',
          value: parsed.streetNumber
        }
      });
      onChange({
        target: {
          name: 'street_name',
          value: parsed.streetName
        }
      });
      onChange({
        target: {
          name: 'postal_code',
          value: parsed.postalCode
        }
      });
      // Marquer comme validé
      onChange({
        target: {
          name: 'address_validated',
          value: 'true'
        }
      });
    }
    
    setShowSuggestions(false);
    setQuery(address.label);
  };

  // Gérer les touches du clavier
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectAddress(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Gérer le changement de la recherche
  const handleQueryChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setShowSuggestions(true);
    
    // Si l'utilisateur modifie manuellement, invalider l'adresse si required
    if (required && selectedAddress && newQuery !== selectedAddress.label) {
      setSelectedAddress(null);
      if (onChange) {
        onChange({
          target: { name: 'address_validated', value: 'false' }
        });
      }
    }
    
    // Si l'utilisateur efface, on peut aussi mettre à jour les champs
    if (newQuery.trim().length === 0 && onChange) {
      setSelectedAddress(null);
      onChange({
        target: { name: 'street_number', value: '' }
      });
      onChange({
        target: { name: 'street_name', value: '' }
      });
      onChange({
        target: { name: 'postal_code', value: '' }
      });
      onChange({
        target: { name: 'address_validated', value: 'false' }
      });
    }
  };

  return (
    <div className="address-autocomplete" ref={containerRef}>
      <div className="address-autocomplete__search">
        <label className="form-label" style={{ fontSize: "var(--text-sm)", marginBottom: 4 }}>
          🔍 Rechercher une adresse <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <div className="address-autocomplete__input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder="Tapez une adresse (ex: 12 rue de la paix 75001)"
            className={`address-autocomplete__input ${
              required && !isValidated && (streetNumber || streetName || postalCode) 
                ? 'address-autocomplete__input--invalid' 
                : isValidated 
                  ? 'address-autocomplete__input--valid' 
                  : ''
            }`}
            disabled={disabled}
            autoComplete="off"
            required={required}
          />
          {isLoading && (
            <span className="address-autocomplete__loader">⏳</span>
          )}
          {isValidated && (
            <span className="address-autocomplete__validated" title="Adresse validée par l'API gouvernementale">✅</span>
          )}
        </div>
        {query.length > 0 && query.length < 3 && (
          <small style={{ fontSize: 11, color: "#6b7280", display: "block", marginTop: 4 }}>
            Tapez au moins 3 caractères pour rechercher
          </small>
        )}
        {required && !isValidated && (streetNumber || streetName || postalCode) && (
          <small style={{ fontSize: 11, color: "#dc2626", display: "block", marginTop: 4 }}>
            ⚠️ Vous devez sélectionner une adresse depuis la liste ci-dessus
          </small>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="address-autocomplete__suggestions">
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.label}-${index}`}
              className={`address-autocomplete__suggestion ${
                index === selectedIndex ? 'address-autocomplete__suggestion--selected' : ''
              }`}
              onClick={() => handleSelectAddress(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="address-autocomplete__suggestion-label">
                {suggestion.label}
              </div>
              {suggestion.city && (
                <div className="address-autocomplete__suggestion-city">
                  {suggestion.city}
                </div>
              )}
              <div className="address-autocomplete__suggestion-score">
                Score: {Math.round(suggestion.score * 100)}%
              </div>
            </li>
          ))}
        </ul>
      )}

      {showSuggestions && suggestions.length === 0 && !isLoading && query.length >= 3 && (
        <div className="address-autocomplete__no-results">
          ⚠️ Aucune adresse trouvée dans la base officielle. Veuillez réessayer avec une autre recherche.
        </div>
      )}
    </div>
  );
}

