// src/components/MobileBottomBar.jsx
import React from 'react';
import { ChevronUp } from 'lucide-react';

const MobileBottomBar = ({
  finalQuote,
  displayPrice,
  selectedCurrency,
  onDetailsClick,
  onSave,
  onAccept
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-2 h-16">
      {/* Price Display — doubles as the breakdown trigger so three buttons don't crowd the bar */}
      <button
        onClick={onDetailsClick}
        className="flex-1 min-w-0 text-left rounded-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        aria-label="View price breakdown"
      >
        <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
          <span className="truncate">{displayPrice(finalQuote)}</span>
          <ChevronUp size={16} className="text-gray-500 shrink-0" />
        </p>
        <p className="text-xs text-gray-600">total &middot; tap for details</p>
      </button>

      {/* Save Button */}
      <button
        onClick={() => onSave()}
        className="px-3 py-2 border border-blue-600 rounded-lg text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Save
      </button>

      {/* Accept Button */}
      <button
        onClick={onAccept}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Accept
      </button>
    </div>
  );
};

export default MobileBottomBar;
