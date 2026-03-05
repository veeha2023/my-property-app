// src/utils/priceLabels.js — Contextual price label formatting utility
// Returns styling objects (text + className) for React components to render.
// Color coding: emerald-600 = savings, amber-600 = upgrades, gray badge = base option.
import { applyDiscount } from './discountUtils';

/**
 * Formats a price delta into a contextual label with appropriate styling.
 * @param {number} deltaAmount - The price delta (can be positive, negative, or zero)
 * @param {function} displayPrice - Function to format currency (from currencyUtils)
 * @param {string} context - Context type: 'property', 'transport', 'flight', 'activity'
 * @returns {{ text: string, className: string, isBadge: boolean }}
 */
export const formatContextualLabel = (deltaAmount, displayPrice, context = 'property') => {
  // Parse to number if needed
  const amount = typeof deltaAmount === 'number' ? deltaAmount : parseFloat(deltaAmount) || 0;

  if (amount < 0) {
    // Negative delta = savings
    return {
      price: displayPrice(Math.abs(amount)),
      suffix: 'Savings',
      text: `Saves ${displayPrice(Math.abs(amount))}`,
      className: 'text-emerald-600 font-semibold',
      isBadge: false
    };
  } else if (amount > 0) {
    // Positive delta = upgrade cost
    return {
      price: `+${displayPrice(amount)}`,
      suffix: 'upgrade',
      text: `+${displayPrice(amount)} upgrade`,
      className: 'text-amber-600 font-semibold',
      isBadge: false
    };
  } else {
    // Zero delta = base option
    return {
      text: 'Included in package',
      className: 'inline-flex items-center px-2 py-1 rounded text-sm font-medium bg-emerald-50 text-emerald-700',
      isBadge: true
    };
  }
};

/**
 * Specialized formatter for activities with included_in_base logic.
 * @param {object} activity - Activity object with price fields
 * @param {function} displayPrice - Currency formatter
 * @param {function} parseCurrencyToNumber - Parser from currencyUtils
 * @returns {{ text: string, className: string, isBadge: boolean }}
 */
export const formatActivityLabel = (activity, displayPrice, parseCurrencyToNumber) => {
  const costPerPax = parseCurrencyToNumber(activity.cost_per_pax);
  const flatPrice = parseCurrencyToNumber(activity.flat_price);
  const basePrice = parseCurrencyToNumber(activity.base_price);
  const pax = activity.pax || 0;
  const rawPrice = costPerPax * pax + flatPrice;
  const currentPrice = applyDiscount(rawPrice, activity.discount_type, activity.discount_value);

  if (activity.included_in_base) {
    const deltaPrice = currentPrice - basePrice;

    if (!activity.selected) {
      // Deselected included activity = saves the base price
      return {
        price: displayPrice(Math.abs(basePrice)),
        suffix: 'Savings',
        text: `${displayPrice(Math.abs(basePrice))} Savings`,
        className: 'text-emerald-600 font-semibold',
        isBadge: false
      };
    } else if (deltaPrice === 0) {
      // Selected, no change from base
      return {
        text: 'Included',
        className: 'text-emerald-600 font-semibold',
        isBadge: false
      };
    } else if (deltaPrice > 0) {
      // Selected with pax increase
      return {
        price: displayPrice(deltaPrice),
        suffix: 'Extra',
        text: `${displayPrice(deltaPrice)} Extra`,
        className: 'text-amber-600 font-semibold',
        isBadge: false
      };
    } else {
      // Selected with pax decrease
      return {
        price: displayPrice(Math.abs(deltaPrice)),
        suffix: 'Savings',
        text: `${displayPrice(Math.abs(deltaPrice))} Savings`,
        className: 'text-emerald-600 font-semibold',
        isBadge: false
      };
    }
  } else {
    // Optional activity
    if (!activity.selected) {
      return {
        text: 'Optional',
        className: 'text-gray-500 font-medium',
        isBadge: false
      };
    } else {
      // Selected optional activity shows the cost
      return {
        price: `+${displayPrice(currentPrice)}`,
        suffix: 'Extra',
        text: `+${displayPrice(currentPrice)} Extra`,
        className: 'text-amber-600 font-semibold',
        isBadge: false
      };
    }
  }
};
