import React from 'react';
import { MapPin, Plane, Car, Activity } from 'lucide-react';

const StatItem = ({ icon: Icon, color, value, label }) => (
  <div className="flex items-center gap-2.5 min-w-0">
    <div className={`${color} rounded-lg w-9 h-9 flex items-center justify-center shrink-0`}>
      <Icon size={18} className="text-white" />
    </div>
    <div className="min-w-0 text-left">
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
  optionalActivityCount // kept for backward compat
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
        <StatItem
          icon={Activity}
          color="bg-green-600"
          value={includedActivityCount + optionalActivityCount}
          label={(includedActivityCount + optionalActivityCount) === 1 ? 'activity' : 'activities'}
        />
      </div>
    </div>
  );
};

export default QuickStats;
