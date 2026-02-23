// src/components/MobileBottomBar.jsx
import React from 'react';
import { ChevronUp } from 'lucide-react';

const MobileBottomBar = ({
  finalQuote,
  displayPrice,
  selectedCurrency,
  onDetailsClick,
  onConfirm
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3 h-16">
      {/* Price Display */}
      <div className="flex-1">
        <p className="text-xl font-bold text-gray-900">
          {displayPrice(finalQuote)}
        </p>
        <p className="text-xs text-gray-600">total</p>
      </div>

      {/* Details Button */}
      <button
        onClick={onDetailsClick}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
      >
        <span>Details</span>
        <ChevronUp size={16} />
      </button>

      {/* Confirm Button */}
      <button
        onClick={onConfirm}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Confirm
      </button>
    </div>
  );
};

export default MobileBottomBar;
