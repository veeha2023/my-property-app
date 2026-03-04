import React from 'react';
import { MapPin, Plane, Car, CheckCircle, Plus } from 'lucide-react';

const StatItem = ({ icon: Icon, color, value, label }) => (
  <div className="flex items-center gap-2.5 min-w-0">
    <div className={`${color} rounded-lg w-9 h-9 flex items-center justify-center shrink-0`}>
      <Icon size={18} className="text-white" />
    </div>
    <div className="min-w-0">
      <div className="text-lg font-bold text-gray-800 leading-tight">{value}</div>
      <div className="text-xs text-gray-500 leading-tight">{label}</div>
    </div>
  </div>
);

const QuickStats = ({
  locationCount,
  flightCount,
  vehicleCount,
  includedActivityCount,
  optionalActivityCount
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
        Quick Summary
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatItem
          icon={MapPin}
          color="bg-blue-600"
          value={locationCount}
          label={locationCount === 1 ? 'location' : 'locations'}
        />
        <StatItem
          icon={Plane}
          color="bg-indigo-600"
          value={flightCount}
          label={flightCount === 1 ? 'flight' : 'flights'}
        />
        <StatItem
          icon={Car}
          color="bg-purple-600"
          value={vehicleCount}
          label={vehicleCount === 1 ? 'vehicle' : 'vehicles'}
        />
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="bg-green-600 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
            <CheckCircle size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-gray-800 leading-tight">
              {includedActivityCount}
              {optionalActivityCount > 0 && (
                <span className="text-blue-600 text-sm font-semibold ml-1">+{optionalActivityCount}</span>
              )}
            </div>
            <div className="text-xs text-gray-500 leading-tight">
              {optionalActivityCount > 0
                ? `included + ${optionalActivityCount} optional`
                : includedActivityCount === 1 ? 'activity' : 'activities'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStats;
