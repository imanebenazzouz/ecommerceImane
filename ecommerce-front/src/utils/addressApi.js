/**
 * Service pour interagir avec l'API Adresse du gouvernement français
 * Documentation: https://adresse.data.gouv.fr/api-doc/adresse
 * 
 * Cette API permet de :
 * - Rechercher des adresses (autocomplétion)
 * - Valider des adresses
 * - Obtenir des coordonnées géographiques
 */

const API_BASE_URL = 'https://api-adresse.data.gouv.fr';

/**
 * Recherche d'adresses avec autocomplétion
 * @param {string} query - La recherche (ex: "12 rue de la paix 75001")
 * @param {number} limit - Nombre maximum de résultats (défaut: 5)
 * @returns {Promise<Array>} Liste des adresses trouvées
 */
export async function searchAddresses(query, limit = 5) {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `${API_BASE_URL}/search/?q=${encodedQuery}&limit=${limit}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('Erreur API Adresse:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    // L'API retourne { features: [...] }
    if (data.features && Array.isArray(data.features)) {
      return data.features.map(feature => {
        const props = feature.properties;
        const geometry = feature.geometry;
        
        return {
          // Adresse complète formatée
          label: props.label,
          // Numéro de rue
          streetNumber: props.housenumber || '',
          // Nom de rue
          streetName: props.street || props.name || '',
          // Code postal
          postalCode: props.postcode || '',
          // Ville
          city: props.city || '',
          // Coordonnées GPS (si disponibles)
          coordinates: geometry?.coordinates || null,
          // Score de pertinence (0-1)
          score: props.score || 0,
          // Type de résultat
          type: props.type || 'housenumber',
          // Données brutes pour référence
          raw: props
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('Erreur lors de la recherche d\'adresses:', error);
    return [];
  }
}

/**
 * Recherche d'adresses par code postal
 * @param {string} postalCode - Le code postal (5 chiffres)
 * @param {number} limit - Nombre maximum de résultats
 * @returns {Promise<Array>} Liste des adresses
 */
export async function searchByPostalCode(postalCode, limit = 10) {
  if (!postalCode || !/^\d{5}$/.test(postalCode)) {
    return [];
  }
  
  return searchAddresses(postalCode, limit);
}

/**
 * Recherche d'adresses par ville
 * @param {string} city - Le nom de la ville
 * @param {string} postalCode - Optionnel: code postal pour affiner
 * @param {number} limit - Nombre maximum de résultats
 * @returns {Promise<Array>} Liste des adresses
 */
export async function searchByCity(city, postalCode = null, limit = 10) {
  if (!city || city.trim().length < 2) {
    return [];
  }
  
  let query = city.trim();
  if (postalCode && /^\d{5}$/.test(postalCode)) {
    query = `${postalCode} ${city}`;
  }
  
  return searchAddresses(query, limit);
}

/**
 * Valide une adresse en la recherchant dans l'API
 * @param {string} address - L'adresse complète à valider
 * @returns {Promise<{valid: boolean, match: object|null, score: number}>}
 */
export async function validateAddress(address) {
  if (!address || address.trim().length < 5) {
    return { valid: false, match: null, score: 0 };
  }
  
  const results = await searchAddresses(address, 1);
  
  if (results.length === 0) {
    return { valid: false, match: null, score: 0 };
  }
  
  const bestMatch = results[0];
  // Considérer comme valide si le score est > 0.5
  const isValid = bestMatch.score > 0.5;
  
  return {
    valid: isValid,
    match: bestMatch,
    score: bestMatch.score
  };
}

/**
 * Parse une adresse de l'API pour extraire les composants
 * @param {object} addressResult - Résultat de l'API Adresse
 * @returns {{streetNumber: string, streetName: string, postalCode: string, city: string}}
 */
export function parseAddressFromApi(addressResult) {
  if (!addressResult) {
    return { streetNumber: '', streetName: '', postalCode: '', city: '' };
  }
  
  return {
    streetNumber: addressResult.streetNumber || '',
    streetName: addressResult.streetName || '',
    postalCode: addressResult.postalCode || '',
    city: addressResult.city || ''
  };
}

