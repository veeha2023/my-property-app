// src/components/LoadingSkeleton.jsx
import React from 'react';

const LoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center mb-4 md:mb-0">
            {/* Logo placeholder */}
            <div className="h-14 w-32 rounded-lg bg-gray-200 animate-pulse mr-4"></div>
            <div className="text-left space-y-2">
              <div className="h-6 w-48 bg-gray-200 animate-pulse rounded-lg"></div>
              <div className="h-4 w-36 bg-gray-200 animate-pulse rounded-lg"></div>
              <div className="h-4 w-40 bg-gray-200 animate-pulse rounded-lg"></div>
            </div>
          </div>
          {/* Price area placeholder */}
          <div className="flex flex-col items-end space-y-2">
            <div className="h-8 w-40 bg-gray-200 animate-pulse rounded-lg"></div>
            <div className="h-4 w-28 bg-gray-200 animate-pulse rounded-lg"></div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-24 rounded-full bg-gray-200 animate-pulse flex-shrink-0"></div>
          ))}
        </div>

        {/* Content Area — 3 card skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
              {/* Image placeholder — aspect-[4/3] */}
              <div className="aspect-[4/3] bg-gray-200 animate-pulse rounded-t-xl"></div>
              {/* Text lines */}
              <div className="p-4 space-y-2">
                <div className="h-4 w-full bg-gray-200 animate-pulse rounded-lg"></div>
                <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded-lg"></div>
                <div className="h-3 w-1/2 bg-gray-200 animate-pulse rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default LoadingSkeleton;
