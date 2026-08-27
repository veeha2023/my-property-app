// src/components/QuoteModals.jsx
import React from 'react';
import { Info, CheckCircle } from 'lucide-react';

// ponytail: shared shell instead of two near-identical modals; no portal/focus-trap
// because no other modal in this app uses one either.
const Modal = ({ isOpen, onBackdropClick, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onBackdropClick}
        aria-hidden="true"
      />
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export const QuoteDisclaimerModal = ({ isOpen, baseCurrency = 'NZD', onAccept }) => (
  // No backdrop click and no X: this is an acknowledgement, the OK button is the only exit.
  <Modal isOpen={isOpen}>
    <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
      <Info className="text-blue-600 shrink-0" size={24} />
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Before you begin</h2>
    </div>

    <div className="px-6 py-5">
      <p className="text-sm sm:text-base text-gray-800 leading-relaxed mb-4">
        This itinerary is a <strong className="text-gray-900">proposal, not a confirmed
        booking</strong> — nothing has been held or reserved for you yet.
      </p>

      <ul className="space-y-3 text-sm sm:text-base text-gray-700 list-disc pl-5 marker:text-gray-400">
        <li>
          <strong className="text-gray-900">Prices and availability are subject to
          change</strong> until your booking is confirmed and a deposit is received. All
          items are quoted subject to availability at the time of booking.
        </li>
        <li>
          Rates can move with <strong className="text-gray-900">currency fluctuations,
          supplier and hotel increases, taxes, government levies and fuel
          surcharges.</strong>
        </li>
        <li>
          <strong className="text-gray-900">Flight fares and seats are not guaranteed
          until tickets are issued.</strong>
        </li>
        <li>
          Amounts shown in currencies other than <strong className="text-gray-900">{baseCurrency}</strong> are
          indicative conversions only. Your booking will be invoiced in {baseCurrency}.
        </li>
        <li>
          <strong className="text-gray-900">We will re-confirm the final price with you
          before anything is booked.</strong> If it has changed, you are free to decline
          at no cost.
        </li>
      </ul>
    </div>

    <div className="px-6 pb-6">
      <button
        onClick={onAccept}
        autoFocus
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        OK, I understand
      </button>
    </div>
  </Modal>
);

export const QuoteAcceptedModal = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onBackdropClick={onClose}>
    <div className="px-6 py-8 text-center">
      <CheckCircle className="text-green-600 mx-auto mb-4" size={48} />
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Thank you!</h2>
      <p className="text-sm sm:text-base text-gray-800 leading-relaxed mb-3">
        Great — thank you for taking the step to finalise your dream trip.
      </p>
      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
        Your selections have been sent to our operations team. We'll confirm availability
        and come back to you shortly with any price changes.
      </p>
    </div>

    <div className="px-6 pb-6">
      <button
        onClick={onClose}
        autoFocus
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Close
      </button>
    </div>
  </Modal>
);
