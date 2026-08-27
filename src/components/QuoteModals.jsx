// src/components/QuoteModals.jsx
import React from 'react';
import { Info, CheckCircle } from 'lucide-react';

// ponytail: shared shell instead of two near-identical modals; no portal/focus-trap
// because no other modal in this app uses one either.
// text-left is deliberate — .App in App.css centres everything (CRA default).
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
          className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto text-left"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const Point = ({ lead, children }) => (
  <li className="flex gap-3">
    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-[0.55rem]" aria-hidden="true" />
    <p className="text-base text-gray-600 leading-relaxed">
      <strong className="font-semibold text-gray-900">{lead}</strong>{' '}
      {children}
    </p>
  </li>
);

export const QuoteDisclaimerModal = ({ isOpen, baseCurrency = 'NZD', onAccept }) => (
  // No backdrop click and no X: this is an acknowledgement, the OK button is the only exit.
  <Modal isOpen={isOpen}>
    <div className="p-6 sm:p-7">
      <div className="flex items-center gap-2.5 mb-4">
        <Info className="text-blue-600 shrink-0" size={20} />
        <h2 className="text-lg font-bold text-gray-900">Before you begin</h2>
      </div>

      <p className="text-base text-gray-900 leading-relaxed mb-5">
        This itinerary is a proposal — nothing has been booked or held for you yet.
      </p>

      <ul className="space-y-3.5 mb-5">
        <Point lead="Prices can still change.">
          They&rsquo;re confirmed once you book and pay a deposit.
        </Point>
        <Point lead="Nothing is reserved yet.">
          Availability is checked at the time of booking.
        </Point>
        <Point lead="You approve the final price.">
          If it changes, we&rsquo;ll come back to you and you can decline at no cost.
        </Point>
      </ul>

      <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
        Rates move with currency, supplier and airline pricing, taxes and surcharges.
        Flight fares and seats are not guaranteed until tickets are issued. Amounts shown
        in currencies other than {baseCurrency} are indicative conversions &mdash; your
        booking is invoiced in {baseCurrency}.
      </p>
    </div>

    <div className="px-6 sm:px-7 pb-6 sm:pb-7">
      <button
        onClick={onAccept}
        autoFocus
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Got it
      </button>
    </div>
  </Modal>
);

export const QuoteAcceptedModal = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onBackdropClick={onClose}>
    <div className="p-6 sm:p-7 text-center">
      <CheckCircle className="text-green-600 mx-auto mb-4" size={44} />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h2>
      <p className="text-base text-gray-600 leading-relaxed">
        Your selections are with our operations team. We&rsquo;ll confirm availability and
        come back to you shortly with any price changes.
      </p>
    </div>

    <div className="px-6 sm:px-7 pb-6 sm:pb-7">
      <button
        onClick={onClose}
        autoFocus
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Close
      </button>
    </div>
  </Modal>
);
