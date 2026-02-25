import React from 'react';
import { MapPin, Plane, Car, CheckCircle, Plus } from 'lucide-react';

const QuickStats = ({
  locationCount,
  flightCount,
  vehicleCount,
  includedActivityCount,
  optionalActivityCount
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-4">
        Quick Summary
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Location count */}
        <div className="flex items-center gap-2">
          <MapPin className="text-blue-600 shrink-0" size={20} />
          <div>
            <div className="text-xl font-bold text-gray-800">{locationCount}</div>
            <div className="text-xs text-gray-600">{locationCount === 1 ? 'location' : 'locations'}</div>
          </div>
        </div>

        {/* Flight count */}
        <div className="flex items-center gap-2">
          <Plane className="text-indigo-600 shrink-0" size={20} />
          <div>
            <div className="text-xl font-bold text-gray-800">{flightCount}</div>
            <div className="text-xs text-gray-600">{flightCount === 1 ? 'flight' : 'flights'}</div>
          </div>
        </div>

        {/* Vehicle count */}
        <div className="flex items-center gap-2">
          <Car className="text-purple-600 shrink-0" size={20} />
          <div>
            <div className="text-xl font-bold text-gray-800">{vehicleCount}</div>
            <div className="text-xs text-gray-600">{vehicleCount === 1 ? 'vehicle' : 'vehicles'}</div>
          </div>
        </div>

        {/* Activity counts (spans 2 cols on mobile for emphasis) */}
        <div className="col-span-2 lg:col-span-1 flex items-center gap-3 lg:gap-2">
          <div className="flex items-center gap-1">
            <CheckCircle className="text-green-600 shrink-0" size={20} />
            <div>
              <div className="text-xl font-bold text-gray-800">{includedActivityCount}</div>
              <div className="text-xs text-gray-600">included</div>
            </div>
          </div>
          <div className="text-gray-300 font-bold">&middot;</div>
          <div className="flex items-center gap-1">
            <Plus className="text-blue-600 shrink-0" size={20} />
            <div>
              <div className="text-xl font-bold text-gray-800">{optionalActivityCount}</div>
              <div className="text-xs text-gray-600">optional added</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStats;
