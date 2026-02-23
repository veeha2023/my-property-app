// src/components/PriceSummaryPanel.jsx
import React from 'react';
import { ChevronDown } from 'lucide-react';

const PriceSummaryPanel = ({
  baseQuote,
  totalChangeValue,
  finalQuote,
  propertyDelta,
  activityDelta,
  transportDelta,
  flightDelta,
  displayPrice,
  selectedCurrency,
  onBreakdownClick,
  onConfirm
}) => {
  // Color helpers
  const getPriceColor = (price) => {
    if (price < 0) return 'text-green-600';
    if (price > 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatDeltaWithSign = (amount) => {
    if (amount === 0) return displayPrice(0);
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${displayPrice(amount)}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-4">
        YOUR TRIP TOTAL
      </h2>

      {/* Base Package Row */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-700">Base Package</span>
        <span className="text-base font-semibold text-gray-800">
          {displayPrice(baseQuote)}
        </span>
      </div>

      {/* Changes Row */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-700">Your Changes</span>
        <span className={`text-base font-semibold ${getPriceColor(totalChangeValue)}`}>
          {formatDeltaWithSign(totalChangeValue)}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-300 my-4"></div>

      {/* Final Price Row */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-xl font-bold text-gray-900">FINAL PRICE</span>
        <span className="text-2xl font-bold text-blue-700">
          {displayPrice(finalQuote)}
        </span>
      </div>

      {/* Category Breakdown Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
          Breakdown by Category
        </h3>

        {/* Properties */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-700">Properties</span>
          <span className={`text-sm font-semibold ${getPriceColor(propertyDelta)}`}>
            {formatDeltaWithSign(propertyDelta)}
          </span>
        </div>

        {/* Activities */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-700">Activities</span>
          <span className={`text-sm font-semibold ${getPriceColor(activityDelta)}`}>
            {formatDeltaWithSign(activityDelta)}
          </span>
        </div>

        {/* Transport */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-700">Transport</span>
          <span className={`text-sm font-semibold ${getPriceColor(transportDelta)}`}>
            {formatDeltaWithSign(transportDelta)}
          </span>
        </div>

        {/* Flights */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Flights</span>
          <span className={`text-sm font-semibold ${getPriceColor(flightDelta)}`}>
            {formatDeltaWithSign(flightDelta)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 space-y-3">
        {/* See Full Breakdown Button */}
        <button
          className="w-full py-3 px-4 border border-gray-300 rounded-lg font-semibold text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          onClick={onBreakdownClick}
        >
          <span>See full breakdown</span>
          <ChevronDown size={16} />
        </button>

        {/* Confirm Button */}
        <button
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={onConfirm}
        >
          Confirm My Selections
        </button>
      </div>
    </div>
  );
};

export default PriceSummaryPanel;
