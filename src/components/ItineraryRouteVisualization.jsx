import React from 'react';
import { MapPin, CalendarDays, Moon, ArrowRight, Sparkles } from 'lucide-react';

const ItineraryRouteVisualization = ({ stays = [], startDate, endDate, totalNights }) => {
  const hasDateRange = startDate && endDate;
  const hasStays = stays.length > 0;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 sm:p-6 border border-blue-200 shadow-sm">
      {/* Soft aurora accent */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-blue-200/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600/10 text-blue-700">
            <Sparkles size={14} />
          </div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.14em]">
            Your Itinerary at a Glance
          </h3>
        </div>

        {!hasStays ? (
          <div className="rounded-xl bg-white/60 border border-white/80 px-4 py-5 text-sm text-gray-500">
            No locations selected yet. Browse the <span className="font-semibold text-gray-700">Property</span> tab to make selections.
          </div>
        ) : (
          <>
            {/* Desktop / tablet — refined table */}
            <div className="hidden sm:block rounded-xl bg-white/70 backdrop-blur-sm border border-white shadow-sm overflow-hidden">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.12em] bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
                    <th className="px-4 py-3 border-b border-blue-100">Location</th>
                    <th className="px-4 py-3 border-b border-blue-100 whitespace-nowrap">Check In</th>
                    <th className="px-4 py-3 border-b border-blue-100 whitespace-nowrap">Check Out</th>
                    <th className="px-4 py-3 border-b border-blue-100 text-right whitespace-nowrap">Nights</th>
                  </tr>
                </thead>
                <tbody>
                  {stays.map((stay, idx) => (
                    <tr
                      key={idx}
                      className="group transition-colors duration-200 hover:bg-blue-50/60"
                    >
                      <td className={`px-4 py-3.5 ${idx < stays.length - 1 ? 'border-b border-blue-100/70' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm ring-2 ring-white">
                              <MapPin size={14} strokeWidth={2.5} />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-white text-[10px] font-bold text-blue-700 rounded-full w-4 h-4 flex items-center justify-center shadow-sm ring-1 ring-blue-100">
                              {idx + 1}
                            </div>
                          </div>
                          <span className="font-semibold text-gray-800 text-sm">{stay.location}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3.5 text-sm text-gray-700 whitespace-nowrap tabular-nums ${idx < stays.length - 1 ? 'border-b border-blue-100/70' : ''}`}>
                        {stay.checkIn}
                      </td>
                      <td className={`px-4 py-3.5 text-sm text-gray-700 whitespace-nowrap tabular-nums ${idx < stays.length - 1 ? 'border-b border-blue-100/70' : ''}`}>
                        {stay.checkOut}
                      </td>
                      <td className={`px-4 py-3.5 text-right whitespace-nowrap ${idx < stays.length - 1 ? 'border-b border-blue-100/70' : ''}`}>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100/80 text-blue-700 text-xs font-semibold">
                          <Moon size={11} strokeWidth={2.5} />
                          {stay.nights}
                          <span className="hidden md:inline font-medium text-blue-600/80">
                            {stay.nights === 1 ? 'night' : 'nights'}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile — stacked stay cards */}
            <ol className="sm:hidden space-y-2.5">
              {stays.map((stay, idx) => (
                <li
                  key={idx}
                  className="rounded-xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-3.5 transition-colors duration-200 active:bg-blue-50/80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-sm ring-2 ring-white">
                          <MapPin size={15} strokeWidth={2.5} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-white text-[10px] font-bold text-blue-700 rounded-full w-4 h-4 flex items-center justify-center shadow-sm ring-1 ring-blue-100">
                          {idx + 1}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stop {idx + 1}</div>
                        <div className="font-semibold text-gray-800 text-sm truncate">{stay.location}</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100/80 text-blue-700 text-xs font-semibold shrink-0">
                      <Moon size={11} strokeWidth={2.5} />
                      {stay.nights} {stay.nights === 1 ? 'night' : 'nights'}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-blue-100/70 flex items-center gap-2 text-xs">
                    <div className="flex-1">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Check in</div>
                      <div className="text-gray-700 font-medium tabular-nums">{stay.checkIn}</div>
                    </div>
                    <ArrowRight size={14} className="text-blue-400 shrink-0" />
                    <div className="flex-1 text-right">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Check out</div>
                      <div className="text-gray-700 font-medium tabular-nums">{stay.checkOut}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}

        {hasDateRange && (
          <div className="mt-4 pt-4 border-t border-blue-200/60">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/80 text-blue-600 ring-1 ring-blue-200 shadow-sm shrink-0">
                  <CalendarDays size={15} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Trip dates</div>
                  <div className="text-sm font-semibold text-gray-800 tabular-nums">
                    {startDate} <span className="text-gray-400 font-normal">&rarr;</span> {endDate}
                  </div>
                </div>
              </div>
              {totalNights > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold shadow-sm">
                  <Moon size={12} strokeWidth={2.5} />
                  {totalNights} {totalNights === 1 ? 'night' : 'nights'} total
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItineraryRouteVisualization;
