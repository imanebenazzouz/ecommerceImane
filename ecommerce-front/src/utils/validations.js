/**
 * Utilitaires de validation pour les formulaires de paiement et checkout
 * Toutes les validations sont strictes et retournent des messages en français
 */

/**
 * Sanitize un champ numérique en supprimant tous les caractères non-numériques
 * @param {string} value - La valeur à nettoyer
 * @returns {string} - La valeur nettoyée (chiffres uniquement)
 */
export function sanitizeNumeric(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
}

/**
 * Valide un numéro de carte bancaire (PAN) avec l'algorithme de Luhn
 * @param {string} cardNumber - Le numéro de carte (peut contenir espaces/tirets)
 * @returns {boolean} - true si valide
 */
export function isValidLuhn(cardNumber) {
  const sanitized = sanitizeNumeric(cardNumber);
  if (!sanitized) return false;

  let sum = 0;
  let isEven = false;

  // Parcourir de droite à gauche
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Valide un numéro de carte bancaire (13-19 chiffres + Luhn)
 * @param {string} cardNumber - Le numéro de carte
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateCardNumber(cardNumber) {
  const sanitized = sanitizeNumeric(cardNumber);

  // Vérifier la longueur
  if (!/^[0-9]{13,19}$/.test(sanitized)) {
    return {
      valid: false,
      error: 'Le numéro de carte doit contenir uniquement des chiffres (13 à 19).'
    };
  }

  // Vérifier l'algorithme de Luhn
  if (!isValidLuhn(sanitized)) {
    return {
      valid: false,
      error: 'Le numéro de carte est invalide.'
    };
  }

  return { valid: true, error: null };
}

/**
 * Valide un CVV/CVC (3 ou 4 chiffres)
 * @param {string} cvv - Le CVV
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateCVV(cvv) {
  const sanitized = sanitizeNumeric(cvv);

  if (!/^[0-9]{3,4}$/.test(sanitized)) {
    return {
      valid: false,
      error: 'Le CVV doit contenir uniquement des chiffres (3 ou 4).'
    };
  }

  return { valid: true, error: null };
}

/**
 * Valide un mois d'expiration (MM: 01-12)
 * @param {string} month - Le mois (MM)
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateExpiryMonth(month) {
  const sanitized = sanitizeNumeric(month);

  if (!/^(0[1-9]|1[0-2])$/.test(sanitized)) {
    return {
      valid: false,
      error: 'Le mois doit être entre 01 et 12.'
    };
  }

  return { valid: true, error: null };
}

/**
 * Valide une année d'expiration (YY ou YYYY)
 * @param {string} year - L'année (YY ou YYYY)
 * @param {boolean} fullYear - Si true, attend YYYY, sinon YY
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateExpiryYear(year, fullYear = false) {
  const sanitized = sanitizeNumeric(year);
  const pattern = fullYear ? /^[0-9]{4}$/ : /^[0-9]{2}$/;

  if (!pattern.test(sanitized)) {
    return {
      valid: false,
      error: fullYear ? 'L\'année doit contenir 4 chiffres.' : 'L\'année doit contenir 2 chiffres.'
    };
  }

  return { valid: true, error: null };
}

/**
 * Valide une date d'expiration complète (doit être postérieure au mois actuel)
 * @param {string} month - Le mois (MM)
 * @param {string} year - L'année (YY ou YYYY)
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateExpiryDate(month, year) {
  const sanitizedMonth = sanitizeNumeric(month);
  const sanitizedYear = sanitizeNumeric(year);

  // Valider le format du mois
  const monthValidation = validateExpiryMonth(sanitizedMonth);
  if (!monthValidation.valid) {
    return monthValidation;
  }

  // Valider le format de l'année
  const isFullYear = sanitizedYear.length === 4;
  const yearValidation = validateExpiryYear(sanitizedYear, isFullYear);
  if (!yearValidation.valid) {
    return yearValidation;
  }

  // Convertir en année complète si nécessaire
  const fullYear = isFullYear 
    ? parseInt(sanitizedYear, 10)
    : 2000 + parseInt(sanitizedYear, 10);

  // Vérifier que la date est dans le futur
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() retourne 0-11

  const expiryMonth = parseInt(sanitizedMonth, 10);

  if (fullYear < currentYear || (fullYear === currentYear && expiryMonth < currentMonth)) {
    return {
      valid: false,
      error: 'Date d\'expiration invalide.'
    };
  }

  return { valid: true, error: null };
}

/**
 * Valide un code postal français (5 chiffres)
 * @param {string} postalCode - Le code postal
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validatePostalCode(postalCode) {
  const sanitized = sanitizeNumeric(postalCode);

  if (!/^[0-9]{5}$/.test(sanitized)) {
    return {
      valid: false,
      error: 'Code postal invalide — 5 chiffres.'
    };
  }

  return { valid: true, error: null };
}

/**
 * Valide un numéro de téléphone français (10 chiffres, commence par 06 ou 07)
 * @param {string} phone - Le numéro de téléphone
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validatePhone(phone) {
  const sanitized = sanitizeNumeric(phone);

  if (!/^[0-9]{10}$/.test(sanitized)) {
    return {
      valid: false,
      error: 'Numéro de téléphone invalide — 10 chiffres.'
    };
  }

  // Vérifier que le numéro commence par 06 ou 07
  if (!/^0[67]/.test(sanitized)) {
    return {
      valid: false,
      error: 'Le numéro de téléphone doit commencer par 06 ou 07.'
    };
  }

  return { valid: true, error: null };
}

/**
 * Valide un numéro de rue (chiffres uniquement)
 * @param {string} streetNumber - Le numéro de rue
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateStreetNumber(streetNumber) {
  const sanitized = sanitizeNumeric(streetNumber);

  if (!/^[0-9]+$/.test(sanitized) || sanitized.length === 0) {
    return {
      valid: false,
      error: 'Numéro de rue : chiffres uniquement.'
    };
  }

  return { valid: true, error: null };
}

/**
 * Valide un nom de rue (lettres, espaces, tirets, apostrophes - 3 à 100 caractères)
 * @param {string} streetName - Le nom de rue
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateStreetName(streetName) {
  if (!streetName || typeof streetName !== 'string') {
    return {
      valid: false,
      error: 'Nom de rue requis.'
    };
  }

  // Nettoyer les espaces multiples
  const cleaned = streetName.trim().replace(/\s+/g, ' ');

  // Vérifier la longueur (3 à 100 caractères)
  if (cleaned.length < 3) {
    return {
      valid: false,
      error: 'Nom de rue trop court (minimum 3 caractères).'
    };
  }

  if (cleaned.length > 100) {
    return {
      valid: false,
      error: 'Nom de rue trop long (maximum 100 caractères).'
    };
  }

  // Vérifier le format : lettres, espaces, tirets, apostrophes autorisés
  // Autorise aussi les accents français
  if (!/^[a-zA-ZÀ-ÿ0-9\s'.-]+$/.test(cleaned)) {
    return {
      valid: false,
      error: 'Nom de rue invalide : lettres, chiffres, espaces, apostrophes et tirets uniquement.'
    };
  }

  // Vérifier qu'il y a au moins 2 lettres
  const letterCount = (cleaned.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  if (letterCount < 2) {
    return {
      valid: false,
      error: 'Nom de rue invalide : au moins 2 lettres requises.'
    };
  }

  return { valid: true, error: null };
}

/**
 * Valide une quantité (entier >= 1)
 * @param {string | number} quantity - La quantité
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateQuantity(quantity) {
  const sanitized = typeof quantity === 'string' 
    ? sanitizeNumeric(quantity) 
    : String(quantity);

  if (!/^[0-9]+$/.test(sanitized)) {
    return {
      valid: false,
      error: 'Quantité invalide.'
    };
  }

  const num = parseInt(sanitized, 10);
  if (num < 1) {
    return {
      valid: false,
      error: 'Quantité invalide.'
    };
  }

  return { valid: true, error: null };
}

/**
 * Formatte un numéro de carte pour l'affichage (groupes de 4 chiffres)
 * @param {string} cardNumber - Le numéro de carte
 * @returns {string} - Le numéro formatté (ex: "1234 5678 9012 3456")
 */
export function formatCardNumber(cardNumber) {
  const sanitized = sanitizeNumeric(cardNumber);
  return sanitized.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/**
 * Formatte un numéro de téléphone pour l'affichage (groupes de 2 chiffres)
 * @param {string} phone - Le numéro de téléphone
 * @returns {string} - Le numéro formatté (ex: "06 12 34 56 78")
 */
export function formatPhone(phone) {
  const sanitized = sanitizeNumeric(phone);
  return sanitized.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

/**
 * Valide un nom ou prénom (lettres uniquement, pas de chiffres)
 * @param {string} name - Le nom ou prénom à valider
 * @param {string} fieldName - Le nom du champ pour le message d'erreur (ex: "Prénom", "Nom")
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateName(name, fieldName = 'Nom') {
  if (!name || typeof name !== 'string') {
    return {
      valid: false,
      error: `${fieldName} requis.`
    };
  }

  // Nettoyer les espaces multiples et trim
  const cleaned = name.trim().replace(/\s+/g, ' ');

  // Vérifier la longueur minimale (au moins 2 caractères)
  if (cleaned.length < 2) {
    return {
      valid: false,
      error: `${fieldName} trop court (minimum 2 caractères).`
    };
  }

  // Vérifier la longueur maximale (100 caractères)
  if (cleaned.length > 100) {
    return {
      valid: false,
      error: `${fieldName} trop long (maximum 100 caractères).`
    };
  }

  // Vérifier qu'il n'y a pas de chiffres
  if (/\d/.test(cleaned)) {
    return {
      valid: false,
      error: `${fieldName} ne doit pas contenir de chiffres.`
    };
  }

  // Vérifier le format : lettres, espaces, tirets, apostrophes autorisés
  // Autorise aussi les accents français
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(cleaned)) {
    return {
      valid: false,
      error: `${fieldName} invalide : lettres, espaces, apostrophes et tirets uniquement.`
    };
  }

  return { valid: true, error: null };
}

/**
 * Valide une adresse postale complète
 * @param {string} address - L'adresse postale complète
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateAddress(address) {
  if (!address || typeof address !== 'string') {
    return {
      valid: false,
      error: 'Adresse requise.'
    };
  }

  // Nettoyer les espaces multiples et trim
  const cleaned = address.trim().replace(/\s+/g, ' ');

  // Vérifier la longueur minimale (au moins 10 caractères)
  if (cleaned.length < 10) {
    return {
      valid: false,
      error: 'L\'adresse doit contenir au moins 10 caractères (numéro, rue, ville, code postal).'
    };
  }

  // Vérifier qu'il n'y a pas de symboles interdits (@, #, $, %, &, etc.)
  // Autorise uniquement : lettres, chiffres, espaces, virgules, tirets, apostrophes, points
  if (!/^[a-zA-ZÀ-ÿ0-9\s,.'-]+$/.test(cleaned)) {
    return {
      valid: false,
      error: 'L\'adresse contient des caractères interdits. Seuls les lettres, chiffres, espaces, virgules, points, tirets et apostrophes sont autorisés.'
    };
  }

  // Vérifier qu'il y a un code postal (5 chiffres consécutifs)
  if (!/\b\d{5}\b/.test(cleaned)) {
    return {
      valid: false,
      error: 'L\'adresse doit contenir un code postal valide (5 chiffres).'
    };
  }

  // Vérifier qu'il y a au moins quelques lettres
  const letterCount = (cleaned.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  if (letterCount < 5) {
    return {
      valid: false,
      error: 'L\'adresse doit contenir au moins 5 lettres (nom de rue et ville).'
    };
  }

  return { valid: true, error: null };
}

/**
 * Reconstruit une adresse complète à partir des champs séparés
 * @param {string} streetNumber - Le numéro de rue
 * @param {string} streetName - Le nom de rue/avenue
 * @param {string} postalCode - Le code postal
 * @returns {string} - L'adresse complète formatée
 */
export function buildFullAddress(streetNumber, streetName, postalCode) {
  const parts = [];
  if (streetNumber?.trim()) parts.push(streetNumber.trim());
  if (streetName?.trim()) parts.push(streetName.trim());
  if (postalCode?.trim()) parts.push(postalCode.trim());
  return parts.join(' ');
}

/**
 * Parse une adresse complète pour extraire numéro, nom de rue et code postal
 * @param {string} address - L'adresse complète
 * @returns {{ streetNumber: string, streetName: string, postalCode: string }}
 */
export function parseAddress(address) {
  if (!address || typeof address !== 'string') {
    return { streetNumber: '', streetName: '', postalCode: '' };
  }

  const cleaned = address.trim().replace(/\s+/g, ' ');
  
  // Extraire le code postal (5 chiffres)
  const postalMatch = cleaned.match(/\b(\d{5})\b/);
  const postalCode = postalMatch ? postalMatch[1] : '';
  
  // Extraire le numéro de rue (chiffres au début)
  const numberMatch = cleaned.match(/^(\d+[a-zA-Z]?)\s+/);
  const streetNumber = numberMatch ? numberMatch[1] : '';
  
  // Extraire le nom de rue (tout le reste sauf le code postal et le numéro)
  let streetName = cleaned;
  if (streetNumber) {
    streetName = streetName.replace(new RegExp(`^${streetNumber}\\s+`), '');
  }
  if (postalCode) {
    streetName = streetName.replace(new RegExp(`\\s*${postalCode}.*$`), '').trim();
  }
  
  return {
    streetNumber: streetNumber || '',
    streetName: streetName || '',
    postalCode: postalCode || ''
  };
}

