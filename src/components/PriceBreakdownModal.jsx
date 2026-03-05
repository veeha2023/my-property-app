// src/components/PriceBreakdownModal.jsx
import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { applyDiscount, hasDiscount } from '../utils/discountUtils';

const PriceBreakdownModal = ({
  isOpen,
  onClose,
  baseQuote,
  clientData,
  displayPrice,
  finalQuote: finalQuoteProp,
  parseCurrencyToNumber
  // selectedCurrency intentionally removed — displayPrice handles conversion internally
}) => {
  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Calculate all totals using useMemo for performance
  const calculations = useMemo(() => {
    const properties = clientData?.properties || [];
    const activities = clientData?.activities || [];
    const transportation = clientData?.transportation || [];
    const flights = clientData?.flights || [];

    // Count included activities (only those still selected)
    const includedActivityCount = activities.filter(a => a.included_in_base && a.selected !== false).length;

    // Removed included activities (deselected by client)
    const removedIncludedActivities = activities.filter(a => a.included_in_base && a.selected === false);
    const removedIncludedTotal = removedIncludedActivities.reduce((sum, a) => {
      return sum - (parseCurrencyToNumber(a.base_price) || 0);
    }, 0);

    // Property total
    const propertyTotal = properties
      .filter(p => p.selected)
      .reduce((sum, property) => {
        const delta = parseCurrencyToNumber(property.price);
        return sum + delta;
      }, 0);

    // Optional activities total (not included in base but selected)
    const optionalActivities = activities.filter(a => !a.included_in_base && a.selected);
    const optionalActivitiesTotal = optionalActivities.reduce((sum, activity) => {
      const costPerPax = parseCurrencyToNumber(activity.cost_per_pax);
      const flatPrice = parseCurrencyToNumber(activity.flat_price);
      const pax = activity.pax || 0;
      const perPersonTotal = costPerPax * pax;
      const rawTotal = perPersonTotal + flatPrice;
      const activityTotal = applyDiscount(rawTotal, activity.discount_type, activity.discount_value);
      return sum + activityTotal;
    }, 0);

    // Transport and flights totals
    const transportTotal = transportation
      .filter(t => t.selected)
      .reduce((sum, item) => sum + parseCurrencyToNumber(item.price), 0);

    const flightTotal = flights
      .filter(f => f.selected)
      .reduce((sum, flight) => {
        return sum + (parseCurrencyToNumber(flight.price) || 0);
      }, 0);

    const transportFlightTotal = transportTotal + flightTotal;
    const transportAndFlightsHaveChanges = transportFlightTotal !== 0;

    // Final quote
    const finalQuote = baseQuote + propertyTotal + optionalActivitiesTotal + transportFlightTotal + removedIncludedTotal;

    return {
      includedActivityCount,
      removedIncludedActivities,
      removedIncludedTotal,
      propertyTotal,
      optionalActivities,
      optionalActivitiesTotal,
      transportFlightTotal,
      transportAndFlightsHaveChanges,
      finalQuote,
      properties: properties.filter(p => p.selected && parseCurrencyToNumber(p.price) !== 0),
      transportation: transportation.filter(t => t.selected && parseCurrencyToNumber(t.price) !== 0),
      flights: flights.filter(f => f.selected && parseCurrencyToNumber(f.price) !== 0)
    };
  }, [clientData, baseQuote, parseCurrencyToNumber]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-gray-900">YOUR TRIP BREAKDOWN</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close breakdown"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Base Package Section */}
            <div className="pb-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">BASE PACKAGE</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Includes {calculations.includedActivityCount} activities, accommodation, flights, transport
                  </p>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {displayPrice(baseQuote)}
                </div>
              </div>
            </div>

            {/* Included Activities Removed Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-base">INCLUDED ACTIVITIES REMOVED</h3>
              {calculations.removedIncludedActivities.length > 0 ? (
                <>
                  {calculations.removedIncludedActivities.map(activity => {
                    const basePrice = parseCurrencyToNumber(activity.base_price) || 0;
                    return (
                      <div key={activity.id} className="flex justify-between items-start text-sm ml-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-2">
                            <span className="text-rose-500 mt-0.5">−</span>
                            <div>
                              <div className="font-medium text-gray-900">{activity.name}</div>
                              <div className="text-gray-600 text-xs">Removed from package</div>
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold text-green-600 ml-4">
                          −{displayPrice(basePrice)}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 font-semibold">
                    <span className="text-gray-700">Removed Activities Total</span>
                    <span className="text-green-600">−{displayPrice(Math.abs(calculations.removedIncludedTotal))}</span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-600 ml-4">All included activities kept</div>
              )}
            </div>

            {/* Property Changes Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-base">PROPERTY CHANGES</h3>
              {calculations.properties.length > 0 ? (
                <>
                  {calculations.properties.map(property => {
                    const delta = parseCurrencyToNumber(property.price);
                    return (
                      <div key={property.id} className="flex justify-between items-start text-sm ml-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-2">
                            <span className="text-green-600 mt-0.5">✓</span>
                            <div>
                              <div className="font-medium text-gray-900">{property.name}</div>
                              <div className="text-gray-600 text-xs">
                                {delta < 0 ? `Saves ${displayPrice(Math.abs(delta))} vs package option` :
                                 delta > 0 ? `${displayPrice(delta)} upgrade` :
                                 'Included in package'}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`font-semibold ml-4 ${
                          delta < 0 ? 'text-green-600' :
                          delta > 0 ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {delta !== 0 ? (delta > 0 ? '+' : '') + displayPrice(Math.abs(delta)) : '$0'}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 font-semibold">
                    <span className="text-gray-700">Property Total</span>
                    <span className={`${
                      calculations.propertyTotal < 0 ? 'text-green-600' :
                      calculations.propertyTotal > 0 ? 'text-red-600' :
                      'text-gray-700'
                    }`}>
                      {calculations.propertyTotal !== 0
                        ? (calculations.propertyTotal > 0 ? '+' : '') + displayPrice(Math.abs(calculations.propertyTotal))
                        : '$0'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-600 ml-4">Package options selected</div>
              )}
            </div>

            {/* Optional Activities Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-base">OPTIONAL ACTIVITIES ADDED</h3>
              {calculations.optionalActivities.length > 0 ? (
                <>
                  {calculations.optionalActivities.map(activity => {
                    const costPerPax = parseCurrencyToNumber(activity.cost_per_pax);
                    const flatPrice = parseCurrencyToNumber(activity.flat_price);
                    const pax = activity.pax || 0;
                    const perPersonTotal = costPerPax * pax;
                    const rawTotal = perPersonTotal + flatPrice;
                    const isDiscounted = hasDiscount(activity);
                    const activityTotal = applyDiscount(rawTotal, activity.discount_type, activity.discount_value);

                    return (
                      <div key={activity.id} className="flex justify-between items-start text-sm ml-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-2">
                            <span className="text-green-600 mt-0.5">✓</span>
                            <div>
                              <div className="font-medium text-gray-900">{activity.name}</div>
                              {costPerPax > 0 && (
                                <div className="text-gray-600 text-xs">
                                  {displayPrice(costPerPax)}/person × {pax}
                                  {flatPrice > 0 && ` + ${displayPrice(flatPrice)} fee`}
                                </div>
                              )}
                              {costPerPax === 0 && flatPrice > 0 && (
                                <div className="text-gray-600 text-xs">Flat rate</div>
                              )}
                              {isDiscounted && (
                                <div className="text-green-600 text-xs">
                                  {activity.discount_type === 'percentage' ? `${activity.discount_value}% off` : `${displayPrice(activity.discount_value)} off`}
                                  {' — saves '}
                                  {displayPrice(rawTotal - activityTotal)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold text-red-600 ml-4 text-right">
                          {isDiscounted && (
                            <div className="text-xs text-red-400 line-through">{displayPrice(rawTotal)}</div>
                          )}
                          +{displayPrice(activityTotal)}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 font-semibold">
                    <span className="text-gray-700">Optional Activities Total</span>
                    <span className="text-red-600">+{displayPrice(calculations.optionalActivitiesTotal)}</span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-600 ml-4">No optional activities added</div>
              )}
            </div>

            {/* Transport & Flights Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-base">TRANSPORT & FLIGHTS</h3>
              {calculations.transportAndFlightsHaveChanges ? (
                <>
                  {calculations.transportation.map(item => {
                    const delta = parseCurrencyToNumber(item.price);
                    return (
                      <div key={item.id} className="flex justify-between items-start text-sm ml-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-2">
                            <span className="text-green-600 mt-0.5">✓</span>
                            <div>
                              <div className="font-medium text-gray-900">{item.name || 'Transport'}</div>
                            </div>
                          </div>
                        </div>
                        <div className={`font-semibold ml-4 ${
                          delta < 0 ? 'text-green-600' :
                          delta > 0 ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {delta !== 0 ? (delta > 0 ? '+' : '') + displayPrice(Math.abs(delta)) : '$0'}
                        </div>
                      </div>
                    );
                  })}
                  {calculations.flights.map(flight => {
                    const priceUsed = parseCurrencyToNumber(flight.price) || 0;

                    return (
                      <div key={flight.id} className="flex justify-between items-start text-sm ml-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-2">
                            <span className="text-green-600 mt-0.5">✓</span>
                            <div>
                              <div className="font-medium text-gray-900">{flight.airline || flight.name || 'Flight'} {flight.flightNumber && `(${flight.flightNumber})`}</div>
                              <div className="text-gray-600 text-xs">
                                {flight.from} → {flight.to}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`font-semibold ml-4 ${
                          priceUsed < 0 ? 'text-green-600' :
                          priceUsed > 0 ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {priceUsed !== 0 ? (priceUsed > 0 ? '+' : '') + displayPrice(Math.abs(priceUsed)) : '$0'}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 font-semibold">
                    <span className="text-gray-700">Transport & Flights Total</span>
                    <span className={`${
                      calculations.transportFlightTotal !== 0
                        ? (calculations.transportFlightTotal < 0 ? 'text-green-600' : 'text-red-600')
                        : 'text-gray-700'
                    }`}>
                      {calculations.transportFlightTotal !== 0
                        ? (calculations.transportFlightTotal > 0 ? '+' : '') + displayPrice(Math.abs(calculations.transportFlightTotal))
                        : '$0'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-600 ml-4">Package options selected</div>
              )}
            </div>

            {/* Final Total Section */}
            <div className="pt-6 border-t-2 border-gray-300">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">FINAL PRICE</h3>
                <div className="text-2xl font-bold text-blue-700">
                  {displayPrice(finalQuoteProp)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceBreakdownModal;
