// src/components/PrintableItinerary.jsx
// Screen-hidden, print-only A4 document for the finalised client itinerary.
// Renders SELECTED items only (mirrors ClientView's isFinalized path), stacked:
// cover → trip overview → properties → activities → flights → transportation → costing.
// All price/badge/date wording is reused from the same helpers ClientView uses, so the
// PDF never drifts from the web copy. This component only filters + lays out for print.
import React from 'react';
import { Star, Coffee, BedDouble, Bath, MapPin, Plane, Briefcase, Instagram, Calendar, Clock, Users, ShieldCheck, MessageCircle } from 'lucide-react';
import { formatContextualLabel, formatActivityLabel } from '../utils/priceLabels.js';
import { hasDiscount, applyDiscount } from '../utils/discountUtils';
import { getActivityRawPrice, formatPaxLabel, getActivityRates, getActivityPax, getActivityBasePax } from '../utils/currencyUtils.js';
import PriceBreakdownModal from './PriceBreakdownModal.jsx';

const PLACEHOLDER = 'https://placehold.co/800x600/E0E0E0/999999?text=No+Image';

// Renders a formatContextualLabel result the same way the web tabs do (badge vs price+suffix).
const ContextPrice = ({ label }) =>
  label.isBadge ? (
    <span className={label.className}>{label.text}</span>
  ) : (
    <span className={label.className}>
      {label.price || label.text}
      {label.suffix ? <span className="text-gray-500 font-normal text-xs ml-1">{label.suffix}</span> : null}
    </span>
  );

const SectionTitle = ({ children }) => (
  <h2 className="text-base font-bold uppercase tracking-wide text-gray-900 border-b-2 border-gray-800 pb-1 mb-3">
    {children}
  </h2>
);

const PrintableItinerary = ({
  clientData,
  b2b,
  globalLogoUrl,
  clientName,
  baseQuote,
  finalQuote,
  itineraries = [],
  sortedActivityGroups = [],
  sortedTransportationGroups = [],
  groupedFlights = {},
  itineraryStays = [],
  dateRange = {},
  totalNights = 0,
  uniqueLocations = [],
  helpers = {},
}) => {
  const {
    displayPrice,
    getActivityContextLabel,
    getActivityMathBreakdown,
    formatDate,
    formatTime,
    calculateNights,
    parseCurrencyToNumber,
    calculateFinalFlightPrice,
    calculateDuration,
  } = helpers;

  if (!clientData) return null;

  const businessName = b2b?.enabled ? (b2b.businessName || 'Travel Quote') : 'Veeha Travels';

  // --- Selected-only collections (identical filters to the web's isFinalized path) ---
  const propertyStays = itineraries
    .map((it) => ({ ...it, properties: it.properties.filter((p) => p.selected && !p.isPlaceholder) }))
    .filter((it) => it.properties.length > 0);

  const activityGroups = sortedActivityGroups
    .map((g) => ({ ...g, activities: g.activities.filter((a) => a.selected !== false) }))
    .filter((g) => g.activities.length > 0);

  const transportGroups = sortedTransportationGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.selected) }))
    .filter((g) => g.items.length > 0);

  const flightTypes = [
    { key: 'domestic', label: 'Domestic Flight' },
    { key: 'international', label: 'International Flight' },
  ]
    .map((t) => ({ ...t, items: (groupedFlights[t.key] || []).filter((f) => f.selected) }))
    .filter((t) => t.items.length > 0);

  const counts = {
    properties: propertyStays.reduce((n, it) => n + it.properties.length, 0),
    activities: activityGroups.reduce((n, g) => n + g.activities.length, 0),
    flights: flightTypes.reduce((n, t) => n + t.items.length, 0),
    transport: transportGroups.reduce((n, g) => n + g.items.length, 0),
  };

  const propImg = (p) => p.images?.[p.homeImageIndex || 0] || PLACEHOLDER;
  const plural = (n, one, many) => (n === 1 ? one : many);

  return (
    <div className="print-only bg-white text-gray-900 text-left">
      <div className="p-6">

        {/* ---------- Cover / header band ---------- */}
        <header className="print-avoid-break flex items-center gap-4 pb-4 mb-6 border-b-4 border-gray-900">
          {b2b?.enabled ? (
            b2b?.logo ? (
              <div className="shrink-0 h-20 w-20 rounded-xl bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center p-1.5">
                <img src={b2b.logo} alt={businessName} loading="eager" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="shrink-0 h-20 w-20 rounded-xl bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white flex items-center justify-center text-4xl font-bold">
                {businessName?.trim().charAt(0).toUpperCase() || '?'}
              </div>
            )
          ) : globalLogoUrl ? (
            <div className="shrink-0 border border-gray-200 rounded-lg p-2 bg-white flex items-center justify-center h-20">
              <img src={globalLogoUrl} alt={businessName} loading="eager" className="max-h-full w-auto object-contain" />
            </div>
          ) : null}
          <div className="flex-1">
            <div className="text-2xl font-extrabold leading-tight">{businessName}</div>
            <div className="text-sm text-gray-700 mt-1">Viewing: <span className="font-semibold">{clientName || 'Guest'}</span></div>
            {(dateRange.startDate || totalNights > 0) && (
              <div className="text-sm text-gray-600 mt-0.5">
                {totalNights > 0 ? `${totalNights} nights` : ''}
                {dateRange.startDate && dateRange.endDate ? ` · ${dateRange.startDate} – ${dateRange.endDate}` : ''}
              </div>
            )}
          </div>
        </header>

        {/* ---------- Trip overview ---------- */}
        <section className="print-avoid-break mb-8">
          <SectionTitle>Trip Overview</SectionTitle>
          {uniqueLocations.length > 0 && (
            <div className="text-sm font-semibold text-gray-800 mb-3">{uniqueLocations.join('  →  ')}</div>
          )}
          {itineraryStays.length > 0 && (
            <table className="w-full text-sm border-collapse mb-3">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-300">
                  <th className="py-1 pr-2 font-semibold">Location</th>
                  <th className="py-1 px-2 font-semibold">Check-in</th>
                  <th className="py-1 px-2 font-semibold">Check-out</th>
                  <th className="py-1 pl-2 font-semibold text-right">Nights</th>
                </tr>
              </thead>
              <tbody>
                {itineraryStays.map((s, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-2 font-medium">{s.location}</td>
                    <td className="py-1 px-2">{s.checkIn}</td>
                    <td className="py-1 px-2">{s.checkOut}</td>
                    <td className="py-1 pl-2 text-right">{s.nights}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
            <span><b className="text-gray-900">{counts.properties}</b> {plural(counts.properties, 'property', 'properties')}</span>
            <span><b className="text-gray-900">{counts.activities}</b> {plural(counts.activities, 'activity', 'activities')}</span>
            <span><b className="text-gray-900">{counts.flights}</b> {plural(counts.flights, 'flight', 'flights')}</span>
            <span><b className="text-gray-900">{counts.transport}</b> {plural(counts.transport, 'transfer', 'transfers')}</span>
          </div>
        </section>

        {/* ---------- Properties ---------- */}
        {propertyStays.length > 0 && (
          <section className="mb-8">
            <SectionTitle>Accommodation</SectionTitle>
            <div className="space-y-4">
              {propertyStays.map((it) => (
                <div key={it.id} className="print-avoid-break">
                  <div className="text-sm font-bold text-gray-800 mb-2">
                    {it.location}
                    <span className="font-normal text-gray-500">
                      {' · '}{formatDate(it.checkIn)} – {formatDate(it.checkOut)} · {calculateNights(it.checkIn, it.checkOut)} nights
                    </span>
                  </div>
                  {it.properties.map((p) => {
                    const label = formatContextualLabel(parseCurrencyToNumber(p.price), (a) => displayPrice(a, p.currency), 'property');
                    return (
                      <div key={p.id} className="flex gap-4 border border-gray-200 rounded-lg p-3 mb-2 print-avoid-break">
                        <img src={propImg(p)} alt={p.name} loading="eager"
                          className="h-24 w-32 object-cover rounded-md shrink-0 bg-gray-100" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-bold text-gray-900 leading-tight">{p.name}</h3>
                              {p.room_type && <div className="text-xs text-gray-600">{p.room_type}</div>}
                            </div>
                            <div className="text-right shrink-0"><ContextPrice label={label} /></div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-700 mt-2">
                            {p.bedrooms > 0 && <span className="inline-flex items-center gap-1"><BedDouble size={13} />{p.bedrooms} Bed{p.bedrooms > 1 ? 's' : ''}</span>}
                            {p.bathrooms > 0 && <span className="inline-flex items-center gap-1"><Bath size={13} />{p.bathrooms} Bath{p.bathrooms > 1 ? 's' : ''}</span>}
                            {p.recommended && <span className="inline-flex items-center gap-1 text-amber-600 font-semibold"><Star size={13} />Agent's Pick</span>}
                            {p.breakfast && <span className="inline-flex items-center gap-1 text-emerald-700"><Coffee size={13} />Breakfast included</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------- Activities ---------- */}
        {activityGroups.length > 0 && (
          <section className="mb-8">
            <SectionTitle>Activities & Experiences</SectionTitle>
            <div className="space-y-4">
              {activityGroups.map((g) => (
                <div key={g.location} className="print-avoid-break">
                  <div className="text-sm font-bold text-gray-800 mb-2">{g.location}</div>
                  {g.activities.map((a) => {
                    const ctx = getActivityContextLabel(a);
                    const math = getActivityMathBreakdown(a);
                    const rates = getActivityRates(a);
                    const pax = getActivityPax(a);
                    const showPax = (rates.adult > 0 || rates.child > 0) && (pax.adults > 0 || pax.children > 0);
                    const isIncluded = a.included_in_base !== false;
                    const bPax = getActivityBasePax(a);
                    const paxChanged = a.selected !== false && (bPax.adults + bPax.children) > 0 && (pax.adults !== bPax.adults || pax.children !== bPax.children);
                    // Mirror the web: hide the context line for included activities with no pax change (avoids "Included" pill + redundant caption)
                    const showCtx = ctx?.text && !(isIncluded && !paxChanged);
                    const discounted = hasDiscount(a);
                    const rawTotal = getActivityRawPrice(a);
                    const discTotal = discounted ? applyDiscount(rawTotal, a.discount_type, a.discount_value) : rawTotal;
                    const label = formatActivityLabel(a, (amt) => displayPrice(amt, a.currency), parseCurrencyToNumber);
                    return (
                      <div key={a.id} className="flex gap-4 border border-gray-200 rounded-lg p-3 mb-2 print-avoid-break">
                        <img src={a.images?.[0] || PLACEHOLDER} alt={a.name} loading="eager"
                          className="h-24 w-32 object-cover rounded-md shrink-0 bg-gray-100" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-gray-900 leading-tight">{a.name}</h3>
                                {isIncluded
                                  ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Included</span>
                                  : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Optional</span>}
                                {discounted && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  {a.discount_type === 'percentage' ? `Save ${a.discount_value}%` : `Save ${displayPrice(a.discount_value, a.currency)}`}
                                </span>}
                              </div>
                              {showCtx && <div className={`text-xs mt-0.5 italic ${ctx.color}`}>{ctx.text}</div>}
                            </div>
                            <div className="text-right shrink-0">
                              {discounted ? (
                                <div>
                                  <div className="text-xs text-gray-400 line-through">{displayPrice(rawTotal, a.currency)}</div>
                                  <div className="font-semibold text-amber-600">{displayPrice(discTotal, a.currency)}</div>
                                </div>
                              ) : label.text === 'Included' ? null : (
                                <span className={label.className}>{label.price || label.text}
                                  {label.suffix ? <span className="text-gray-500 font-normal text-xs ml-1">{label.suffix}</span> : null}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700 mt-1.5">
                            {a.date && <span className="inline-flex items-center gap-1"><Calendar size={13} className="text-gray-400" />{formatDate(a.date)}</span>}
                            {a.time && <span className="inline-flex items-center gap-1"><Clock size={13} className="text-gray-400" />{formatTime(a.time)}</span>}
                            {a.duration && <span className="inline-flex items-center gap-1"><Clock size={13} className="text-gray-400" />{a.duration} hours</span>}
                            {showPax && <span className="inline-flex items-center gap-1 font-medium"><Users size={13} className="text-gray-400" />{formatPaxLabel(a)}</span>}
                          </div>
                          {math?.lines?.length > 0 && (
                            <div className="text-[11px] text-gray-500 mt-1 font-mono leading-snug">
                              {math.lines.map((ln, i) => (
                                <div key={i} className={i === math.lines.length - 1 ? 'font-semibold text-gray-700' : ''}>{ln}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------- Flights ---------- */}
        {flightTypes.length > 0 && (
          <section className="mb-8">
            <SectionTitle>Flights</SectionTitle>
            <div className="space-y-4">
              {flightTypes.map((t) => (
                <div key={t.key} className="print-avoid-break">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800 mb-2"><Plane size={14} />{t.label}</div>
                  {t.items.map((item) => {
                    const cp = calculateFinalFlightPrice(item);
                    const included = item.included_in_base !== false;
                    const label = included ? null : formatContextualLabel(cp, (a) => displayPrice(a, item.currency), 'flight');
                    return (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3 mb-2 print-avoid-break">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {item.airlineLogoUrl && <img src={item.airlineLogoUrl} alt={`${item.airline} logo`} loading="eager" className="h-8 w-auto object-contain" />}
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 leading-tight">{item.airline}</div>
                              <div className="text-xs text-gray-500">{item.flightNumber}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {included
                              ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Included in package</span>
                              : <ContextPrice label={label} />}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-sm mt-2 text-gray-800">
                          <div>
                            <div className="font-semibold">{formatTime(item.departureTime)}</div>
                            <div className="text-xs text-gray-600">{item.from}</div>
                            <div className="text-[11px] text-gray-500">{formatDate(item.departureDate)}</div>
                          </div>
                          <div className="text-center text-[11px] text-gray-500 flex-1">
                            <div>{calculateDuration(item.departureDate, item.departureTime, item.arrivalDate, item.arrivalTime)}</div>
                            <div className="border-t border-gray-300 my-0.5" />
                            <div>Direct</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatTime(item.arrivalTime)}</div>
                            <div className="text-xs text-gray-600">{item.to}</div>
                            <div className="text-[11px] text-gray-500">{formatDate(item.arrivalDate)}</div>
                          </div>
                        </div>
                        {item.baggage && (
                          <div className="flex flex-wrap gap-x-4 text-[11px] text-gray-600 mt-2 pt-2 border-t border-gray-100">
                            <span className="inline-flex items-center gap-1"><Briefcase size={12} />Check-in: {item.baggage.checkInKgs}kg ({item.baggage.checkInPieces} pc)</span>
                            <span className="inline-flex items-center gap-1"><Briefcase size={12} />Cabin: {item.baggage.cabinKgs}kg ({item.baggage.cabinPieces} pc)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------- Transportation ---------- */}
        {transportGroups.length > 0 && (
          <section className="mb-8">
            <SectionTitle>Transport & Transfers</SectionTitle>
            <div className="space-y-4">
              {transportGroups.map((g) => (
                <div key={g.pickupPoint} className="print-avoid-break">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800 mb-2"><MapPin size={14} />{g.pickupPoint}</div>
                  {g.items.map((item) => {
                    const label = formatContextualLabel(parseCurrencyToNumber(item.price), (a) => displayPrice(a, item.currency), 'transport');
                    return (
                      <div key={item.id} className="flex gap-4 border border-gray-200 rounded-lg p-3 mb-2 print-avoid-break">
                        <img src={item.images?.[0] || PLACEHOLDER} alt={item.name} loading="eager"
                          className="h-20 w-28 object-cover rounded-md shrink-0 bg-gray-100" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-bold text-gray-900 leading-tight">{item.name}</h3>
                              {(item.type || item.carType) && <div className="text-xs text-gray-600">{item.type || item.carType}</div>}
                            </div>
                            <div className="text-right shrink-0"><ContextPrice label={label} /></div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-700 mt-1.5">
                            {(item.pickupLocation || item.boardingFrom || item.pickupFrom) && (
                              <div className="flex items-start gap-1.5"><MapPin size={13} className="mt-0.5 text-gray-400 shrink-0" /><span><strong>Pickup:</strong> {[item.pickupLocation || item.boardingFrom || item.pickupFrom, item.location].filter(Boolean).join(' · ')}</span></div>
                            )}
                            {(item.pickupDate || item.boardingDate) && (
                              <div className="flex items-start gap-1.5"><Calendar size={13} className="mt-0.5 text-gray-400 shrink-0" /><span><strong>On:</strong> {formatDate(item.pickupDate || item.boardingDate)} at {formatTime(item.pickupTime || item.boardingTime)}</span></div>
                            )}
                            {(item.dropoffLocation || item.departingTo || item.dropoffTo) && (
                              <div className="flex items-start gap-1.5"><MapPin size={13} className="mt-0.5 text-gray-400 shrink-0" /><span><strong>Drop-off:</strong> {item.dropoffLocation || item.departingTo || item.dropoffTo}</span></div>
                            )}
                            {(item.dropoffDate || item.departingDate) && (
                              <div className="flex items-start gap-1.5"><Calendar size={13} className="mt-0.5 text-gray-400 shrink-0" /><span><strong>On:</strong> {formatDate(item.dropoffDate || item.departingDate)} at {formatTime(item.dropoffTime || item.departingTime)}</span></div>
                            )}
                            {item.transportType === 'car' && (
                              <div className="flex items-start gap-1.5"><ShieldCheck size={13} className="mt-0.5 text-gray-400 shrink-0" /><span><strong>Insurance:</strong> {item.insurance} (Excess: {displayPrice(item.excessAmount || 0, item.currency)})</span></div>
                            )}
                            {item.transportType === 'car' && item.driversIncluded && (
                              <div className="flex items-start gap-1.5"><Users size={13} className="mt-0.5 text-gray-400 shrink-0" /><span><strong>Drivers:</strong> {item.driversIncluded}</span></div>
                            )}
                            {(item.transportType === 'ferry' || item.transportType === 'bus') && item.duration && (
                              <div className="flex items-start gap-1.5"><Clock size={13} className="mt-0.5 text-gray-400 shrink-0" /><span><strong>Duration:</strong> {item.duration}</span></div>
                            )}
                            {(item.transportType === 'ferry' || item.transportType === 'bus') && item.baggageAllowance && (
                              <div className="flex items-start gap-1.5"><Briefcase size={13} className="mt-0.5 text-gray-400 shrink-0" /><span><strong>Baggage:</strong> {item.baggageAllowance}</span></div>
                            )}
                            {item.transportType === 'driver' && item.duration && (
                              <div className="flex items-start gap-1.5"><Clock size={13} className="mt-0.5 text-gray-400 shrink-0" /><span><strong>Duration:</strong> {item.duration}</span></div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------- Detailed costing (reuses the modal body — single source of truth) ---------- */}
        <section className="print-break-before mb-6">
          <SectionTitle>Detailed Costing</SectionTitle>
          <div className="border border-gray-200 rounded-lg">
            <PriceBreakdownModal
              inline
              baseQuote={baseQuote}
              clientData={clientData}
              displayPrice={displayPrice}
              finalQuote={finalQuote}
              parseCurrencyToNumber={parseCurrencyToNumber}
            />
          </div>
        </section>

        {/* ---------- Contact footer ---------- */}
        {b2b?.enabled && (b2b.instagram || b2b.whatsapp) && (
          <footer className="print-avoid-break flex flex-wrap items-center gap-4 border-t border-gray-300 pt-3 mt-6 text-xs text-gray-600">
            <span className="font-semibold text-gray-800">Get in touch:</span>
            {b2b.instagram && <span className="inline-flex items-center gap-1"><Instagram size={13} className="text-gray-500" />{b2b.instagram}</span>}
            {b2b.whatsapp && <span className="inline-flex items-center gap-1"><MessageCircle size={13} className="text-gray-500" />{b2b.whatsapp}</span>}
          </footer>
        )}
      </div>
    </div>
  );
};

export default PrintableItinerary;
