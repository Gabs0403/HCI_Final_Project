export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateExpiry(expiry: string): ValidationResult {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!match) return { valid: false, error: 'Enter expiry as MM/YY.' };

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) {
    return { valid: false, error: 'Month must be between 01 and 12.' };
  }

  // A card stays valid through the last second of its printed month.
  // The first day of the month AFTER expiry is the first invalid moment.
  const now = new Date();
  const firstOfMonthAfterExpiry = new Date(year, month, 1);
  if (now >= firstOfMonthAfterExpiry) {
    return { valid: false, error: 'Card has expired.' };
  }

  if (year > now.getFullYear() + 20) {
    return { valid: false, error: 'Expiration year looks invalid.' };
  }

  return { valid: true };
}

export function validateCardNumber(digits: string): ValidationResult {
  if (!/^\d{16}$/.test(digits)) {
    return { valid: false, error: 'Enter a 16-digit card number.' };
  }
  return { valid: true };
}

export function validateCvv(cvv: string): ValidationResult {
  if (!/^\d{3,4}$/.test(cvv)) {
    return { valid: false, error: 'Enter a valid CVV (3 or 4 digits).' };
  }
  return { valid: true };
}
