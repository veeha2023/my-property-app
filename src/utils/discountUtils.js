// src/utils/discountUtils.js — Pure discount calculation functions

/**
 * Applies a discount to a raw total price.
 * @param {number} rawTotal - The pre-discount total
 * @param {string} discountType - '' | 'percentage' | 'fixed'
 * @param {number} discountValue - e.g. 20 (for 20%) or 50 (for $50 off)
 * @returns {number} The discounted price (never less than 0)
 */
export const applyDiscount = (rawTotal, discountType, discountValue) => {
  if (!discountType || !discountValue) return rawTotal;
  const value = parseFloat(discountValue) || 0;
  if (value <= 0) return rawTotal;

  if (discountType === 'percentage') {
    return Math.max(0, rawTotal * (1 - value / 100));
  } else if (discountType === 'fixed') {
    return Math.max(0, rawTotal - value);
  }
  return rawTotal;
};

/**
 * Calculates the savings amount from a discount.
 * @param {number} rawTotal - The pre-discount total
 * @param {string} discountType - '' | 'percentage' | 'fixed'
 * @param {number} discountValue - The discount value
 * @returns {number} The amount saved
 */
export const getDiscountAmount = (rawTotal, discountType, discountValue) => {
  return rawTotal - applyDiscount(rawTotal, discountType, discountValue);
};

/**
 * Checks whether an activity has an active discount.
 * @param {object} activity - Activity object
 * @returns {boolean}
 */
export const hasDiscount = (activity) => {
  return !!(activity.discount_type && parseFloat(activity.discount_value) > 0);
};
