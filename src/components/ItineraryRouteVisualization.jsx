import React from 'react';
import { MapPin, ArrowRight, Calendar } from 'lucide-react';

const ItineraryRouteVisualization = ({ locations, startDate, endDate, totalNights }) => {
  const hasDateRange = startDate && endDate;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
      <div className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-4">
        Your Itinerary at a Glance
      </div>

      {/* Route visualization */}
      {locations.length === 0 ? (
        <p className="text-gray-500 text-sm py-2">No locations selected yet. Browse the Property tab to make selections!</p>
      ) : (
        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap overflow-x-auto pb-2">
          {locations.map((location, idx) => (
            <React.Fragment key={idx}>
              {/* Location dot with label */}
              <div className="flex flex-col items-center shrink-0">
                <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-md">
                  <MapPin size={20} />
                </div>
                <span className="text-xs font-semibold text-gray-700 mt-2 max-w-[80px] text-center leading-tight">
                  {location}
                </span>
              </div>
              {/* Arrow between locations (not after last) */}
              {idx < locations.length - 1 && (
                <ArrowRight className="text-gray-400 shrink-0" size={20} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Date range display */}
      {hasDateRange && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-3 font-medium">
          <Calendar size={16} className="text-blue-500 shrink-0" />
          <span>
            {startDate} &ndash; {endDate}
            {totalNights > 0 && (
              <span> &middot; {totalNights} {totalNights === 1 ? 'night' : 'nights'}</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};

export default ItineraryRouteVisualization;
