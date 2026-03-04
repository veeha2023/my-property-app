import React from 'react';
import { MapPin, Calendar } from 'lucide-react';

const ItineraryRouteVisualization = ({ locations, startDate, endDate, totalNights }) => {
  const hasDateRange = startDate && endDate;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 sm:p-6 border border-blue-200">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
        Your Itinerary at a Glance
      </div>

      {/* Route visualization */}
      {locations.length === 0 ? (
        <p className="text-gray-500 text-sm py-2">No locations selected yet. Browse the Property tab to make selections!</p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2.5">
          {locations.map((location, idx) => (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-1.5 bg-white/70 rounded-full pl-1 pr-3 py-1 border border-blue-200/60">
                <div className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center shrink-0">
                  <MapPin size={14} />
                </div>
                <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                  {location}
                </span>
              </div>
              {idx < locations.length - 1 && (
                <span className="text-gray-300 text-xs font-medium select-none">&rsaquo;</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Date range display */}
      {hasDateRange && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-4 pt-3 border-t border-blue-200/50 font-medium">
          <Calendar size={15} className="text-blue-500 shrink-0" />
          <span>
            {startDate} &ndash; {endDate}
            {totalNights > 0 && (
              <span className="text-gray-500"> &middot; {totalNights} {totalNights === 1 ? 'night' : 'nights'}</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};

export default ItineraryRouteVisualization;
