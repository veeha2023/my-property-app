// src/pages/ClientView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient.js'; // Import Supabase client

import {
  Calendar, MapPin, Check, X, ChevronLeft, ChevronRight, Maximize2,
  BedDouble, Bath, Image // Include Image for home image icon
} from 'lucide-react';

const ClientView = () => {
  const { clientId } = useParams(); // Get the client ID from the URL
  const [clientProperties, setClientProperties] = useState([]);
  const [clientName, setClientName] = useState('Client Selection');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customLogoUrl, setCustomLogoUrl] = useState(null);

  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [expandedImage, setExpandedImage] = useState(null);
  const [expandedImagePropertyId, setExpandedImagePropertyId] = useState(null);

  const accentColor = '#FFD700';
  const savingsColor = '#10B981';
  const extraColor = '#EF4444';

  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId) {
        setError("No client ID provided in the URL.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Fetch data from Supabase 'clients' table
        const { data, error } = await supabase
          .from('clients')
          .select('client_name, client_properties, custom_logo_url')
          .eq('id', clientId)
          .single(); // Use .single() to expect one row

        if (error) {
          if (error.code === 'PGRST116') { // Specific code for no rows found
             setError("Client selection not found.");
          } else {
             console.error("Supabase fetch error:", error);
             setError("Failed to load client selection: " + error.message);
          }
        } else if (data) {
          setClientProperties(data.client_properties || []);
          setClientName(data.client_name || `Selection for ${clientId}`);
          setCustomLogoUrl(data.custom_logo_url || null); // Load custom logo
          // Initialize currentImageIndex for each property based on homeImageIndex
          const initialImageIndices = {};
          (data.client_properties || []).forEach(prop => {
            initialImageIndices[prop.id] = prop.homeImageIndex || 0;
          });
          setCurrentImageIndex(initialImageIndices);

        } else {
          setError("Client selection not found."); // Should be covered by error.code, but as fallback
        }
      } catch (err) {
        console.error("Unexpected error fetching client data:", err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [clientId]); // Re-fetch if clientId changes

  // Helper functions (copied from PropertyForm, but without admin parts)
  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn + 'T00:00:00');
    const end = new Date(checkOut + 'T00:00:00');
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    });
  };

  const groupPropertiesByLocation = () => {
    const grouped = {};
    (clientProperties || []).forEach(property => { 
      if (!grouped[property.location]) {
        grouped[property.location] = [];
      }
      grouped[property.location].push(property);
    });
    return grouped;
  };

  const getSelectedProperty = (location) => {
    return (clientProperties || []).find(prop => prop.location === location && prop.selected); 
  };

  const totalChange = (clientProperties || []) 
    .filter(prop => prop.selected)
    .reduce((total, prop) => total + parseFloat(prop.price || 0), 0);
  const totalChangeColorStyle = { color: totalChange >= 0 ? extraColor : savingsColor };

  const nextImage = (propertyId) => {
    const property = (clientProperties || []).find(p => p.id === propertyId); 
    if (!property || property.images.length <= 1) return;

    setCurrentImageIndex(prev => {
      const currentIdx = prev[propertyId] !== undefined ? prev[propertyId] : property.homeImageIndex;
      const nextIdx = (currentIdx + 1) % property.images.length;
      return { ...prev, [propertyId]: nextIdx };
    });
  };

  const prevImage = (propertyId) => {
    const property = (clientProperties || []).find(p => p.id === propertyId); 
    if (!property || property.images.length <= 1) return;

    setCurrentImageIndex(prev => {
      const currentIdx = prev[propertyId] !== undefined ? prev[propertyId] : property.homeImageIndex;
      const prevIdx = (currentIdx - 1 + property.images.length) % property.images.length;
      return { ...prev, [propertyId]: prevIdx };
    });
  };

  const openExpandedImage = (propertyId, imageIndex) => {
    const property = (clientProperties || []).find(p => p.id === propertyId); 
    if (property && property.images.length > 0) {
      setExpandedImage(property.images[imageIndex]);
      setExpandedImagePropertyId(propertyId);
      setCurrentImageIndex(prev => ({ ...prev, [propertyId]: imageIndex }));
    }
  };

  const nextExpandedImage = useCallback(() => {
    if (!expandedImagePropertyId) return;
    const property = (clientProperties || []).find(p => p.id === expandedImagePropertyId); 
    if (!property || property.images.length <= 1) return;

    setCurrentImageIndex(prev => {
      const currentIdx = prev[expandedImagePropertyId] !== undefined ? prev[expandedImagePropertyId] : property.homeImageIndex;
      const nextIdx = (currentIdx + 1) % property.images.length;
      setExpandedImage(property.images[nextIdx]);
      return { ...prev, [expandedImagePropertyId]: nextIdx };
    });
  }, [expandedImagePropertyId, clientProperties]);

  const prevExpandedImage = useCallback(() => {
    if (!expandedImagePropertyId) return;
    const property = (clientProperties || []).find(p => p.id === expandedImagePropertyId); 
    if (!property || property.images.length <= 1) return;

    setCurrentImageIndex(prev => {
      const currentIdx = prev[expandedImagePropertyId] !== undefined ? prev[expandedImagePropertyId] : property.homeImageIndex;
      const prevIdx = (currentIdx - 1 + property.images.length) % property.images.length;
      setExpandedImage(property.images[prevIdx]);
      return { ...prev, [expandedImagePropertyId]: prevIdx };
    });
  }, [expandedImagePropertyId, clientProperties]);

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Luxury': return 'bg-purple-600 text-white';
      case 'Super Deluxe': return 'bg-blue-600 text-white';
      case 'Deluxe': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-century-gothic text-xl">Loading client selection...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center font-century-gothic text-xl text-red-600">Error: {error}</div>;

  const groupedProperties = groupPropertiesByLocation();

  return (
    <div className="min-h-screen bg-gray-50 font-['Century_Gothic']">
      <style>{`
        .font-century-gothic {
          font-family: 'Century Gothic', sans-serif;
        }
        .text-extra-color { color: ${extraColor}; }
        .text-savings-color { color: ${savingsColor}; }
        .selected-border {
            border-color: ${accentColor};
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.7);
            border-width: 5px;
            border-radius: 1rem;
        }
      `}</style>

      {expandedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative w-[90vw] h-[90vh] max-w-6xl max-h-[calc(100vh-80px)] bg-black flex items-center justify-center rounded-xl shadow-lg">
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 z-10"
              aria-label="Close image"
            >
              <X size={24} />
            </button>
            <img
              src={expandedImage}
              alt="Expanded view"
              className="max-w-full max-h-full object-contain rounded-xl"
            />
            {(clientProperties || []).find(p => p.id === expandedImagePropertyId)?.images.length > 1 && ( 
              <>
                <button
                  onClick={prevExpandedImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-3 text-gray-800 hover:bg-opacity-100 shadow-lg transition-all"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextExpandedImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-3 text-gray-800 hover:bg-opacity-100 shadow-lg transition-all"
                  aria-label="Next image"
                >
                  <ChevronRight size={24} />
                </button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {(clientProperties || []).find(p => p.id === expandedImagePropertyId)?.images.map((img, idx) => ( 
                    <div
                      key={idx}
                      className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-200 ${
                        idx === (currentImageIndex[expandedImagePropertyId] !== undefined ? currentImageIndex[expandedImagePropertyId] : (clientProperties || []).find(p => p.id === expandedImagePropertyId)?.homeImageIndex) ? 'bg-white scale-125' : 'bg-white bg-opacity-60' 
                      }`}
                      onClick={() => openExpandedImage(expandedImagePropertyId, idx)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white rounded-xl shadow-md p-4 md:p-6">
          <div className="flex items-center mb-4 md:mb-0">
            {customLogoUrl ? (
              <img src={customLogoUrl} alt="Company Logo" className="h-14 max-h-32 w-auto max-w-full object-contain rounded-lg mr-4" />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-xs mr-4">Logo</div>
            )}
            <div className="text-left">
              <h1 className="text-4xl font-extrabold text-gray-900 font-century-gothic mb-1">Veeha Travels</h1>
              <p className="text-xl font-bold text-gray-900 font-century-gothic">Your Curated Property Selection</p>
              <p className="text-lg text-gray-700 mt-2">Viewing: {clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`text-right p-3 rounded-lg border ${totalChange >= 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              <p className="text-xs text-gray-600">Total Price Change</p>
              <p className={`text-2xl font-bold font-century-gothic`} style={totalChangeColorStyle}>
                {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          {Object.entries(groupedProperties).map(([location, locationProperties]) => (
            <div key={location} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="p-5 border-b bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div className="mb-2 md:mb-0">
                    <h2 className="text-2xl font-bold text-gray-900 font-century-gothic text-left">
                      {location}
                    </h2>
                    <p className="text-sm text-gray-600">
                      <Calendar size={14} className="inline mr-1 text-gray-500" />
                      {formatDate(locationProperties[0].checkIn)} - {formatDate(locationProperties[0].checkOut)} · {calculateNights(locationProperties[0].checkIn, locationProperties[0].checkOut)} nights
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm text-gray-600">Selected Property:</p>
                    <p className="font-semibold text-gray-900 text-base">
                      {getSelectedProperty(location)?.name || 'None'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                  {locationProperties.map((property) => (
                    <div
                      key={property.id}
                      className={`relative group bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden transform hover:scale-102 transition-all duration-300 cursor-pointer
                        ${property.selected ? 'selected-border' : ''}`}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
                        <img
                          src={property.images[currentImageIndex[property.id] !== undefined ? currentImageIndex[property.id] : property.homeImageIndex] || "https://placehold.co/800x600/E0E0E0/333333?text=No+Image"}
                          alt={property.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onClick={(e) => {
                            if (!e.target.closest('button')) {
                              e.stopPropagation();
                              openExpandedImage(property.id, currentImageIndex[property.id] !== undefined ? currentImageIndex[property.id] : property.homeImageIndex);
                            }
                          }}
                          onError={(e) => { e.target.src = "https://placehold.co/800x600/E0E0E0/333333?text=Image+Error"; }}
                        />

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openExpandedImage(property.id, currentImageIndex[property.id] !== undefined ? currentImageIndex[property.id] : property.homeImageIndex);
                          }}
                          className="absolute top-3 right-3 bg-black bg-opacity-40 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                          aria-label="Expand image"
                        >
                          <Maximize2 size={16} />
                        </button>

                        {property.selected && (
                          <div className="absolute top-3 left-3 rounded-full p-2 shadow-md"
                            style={{ backgroundColor: accentColor, color: '#333' }}
                          >
                            <Check size={16} />
                          </div>
                        )}

                        <div className="absolute bottom-3 left-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getCategoryColor(property.category)}`}>
                            {property.category}
                          </span>
                        </div>

                        {property.images.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                prevImage(property.id);
                              }}
                              className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-100 shadow-md"
                              aria-label="Previous image"
                            >
                              <ChevronLeft size={18} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                nextImage(property.id);
                              }}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-100 shadow-md"
                              aria-label="Next image"
                            >
                              <ChevronRight size={18} />
                            </button>

                            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1.5">
                              {property.images.slice(0, 3).map((_, index) => (
                                <div
                                  key={index}
                                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                    index === (currentImageIndex[property.id] !== undefined ? currentImageIndex[property.id] : property.homeImageIndex) ? 'bg-white scale-125' : 'bg-white bg-opacity-60'
                                  }`}
                                />
                              ))}
                              {property.images.length > 3 && (
                                <div className="w-2 h-2 rounded-full bg-white bg-opacity-60" title={`${property.images.length - 3} more photos`} />
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="p-4 space-y-2">
                        <h3 className="font-semibold text-lg text-gray-900 leading-tight font-century-gothic">
                          {property.name}
                        </h3>

                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin size={16} className="mr-1 text-gray-500" />
                          <span>{property.location}</span>
                        </div>

                        <div className="flex items-center text-sm text-gray-600 gap-3">
                          {property.bedrooms > 0 && (
                            <div className="flex items-center">
                              <BedDouble size={16} className="mr-1 text-gray-500" />
                              <span>{property.bedrooms} Bed{property.bedrooms > 1 ? 's' : ''}</span>
                            </div>
                          )}
                          {property.bathrooms > 0 && (
                            <div className="flex items-center">
                              <Bath size={16} className="mr-1 text-gray-500" />
                              <span>{property.bathrooms} Bath{property.bathrooms > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-base text-gray-700 font-medium">
                            {calculateNights(property.checkIn, property.checkOut)} nights
                          </span>
                          <div className="text-right">
                            <span className="font-bold text-xl text-gray-900" style={{ color: parseFloat(property.price) >= 0 ? extraColor : savingsColor }}>
                              {property.currency}{Math.abs(parseFloat(property.price)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-2xl shadow-xl p-6 font-century-gothic border border-gray-100 text-left">
          <h2 className="text-2xl font-bold mb-5 text-gray-800">Your Selection Summary</h2>
          {(clientProperties || []).filter(prop => prop.selected).length === 0 ? ( 
            <p className="text-gray-500 text-center py-8 text-lg">No properties selected yet. Start choosing!</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedProperties).map(([location, locationProperties]) => {
                const selectedProperty = getSelectedProperty(location);
                if (!selectedProperty) return null;

                const priceText = parseFloat(selectedProperty.price);
                const priceColorStyle = { color: priceText >= 0 ? extraColor : savingsColor };

                return (
                  <div key={location} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                      <img
                        src={selectedProperty.images[selectedProperty.homeImageIndex] || "https://placehold.co/60x60/E0E0E0/333333?text=No+Image"}
                        alt={selectedProperty.name}
                        className="w-16 h-16 rounded-lg object-cover shadow-sm flex-shrink-0"
                        onError={(e) => { e.target.src = "https://placehold.co/60x60/E0E0E0/333333?text=Image+Error"; }}
                      />
                      <div className="text-left">
                        <h4 className="font-semibold text-gray-900 text-base">{location}</h4>
                        <p className="text-sm text-gray-700 font-medium">{selectedProperty.name}</p>
                        <p className="text-xs text-gray-500">
                          <Calendar size={12} className="inline mr-1" />
                          {calculateNights(selectedProperty.checkIn, selectedProperty.checkOut)} nights
                        </p>
                        <div className="flex items-center text-xs text-gray-500 gap-2 mt-1">
                          {selectedProperty.bedrooms > 0 && (
                            <div className="flex items-center">
                              <BedDouble size={12} className="mr-0.5" />
                              <span>{selectedProperty.bedrooms}</span>
                            </div>
                          )}
                          {selectedProperty.bathrooms > 0 && (
                            <div className="flex items-center">
                              <Bath size={12} className="mr-0.5" />
                              <span>{selectedProperty.bathrooms}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right w-full sm:w-auto">
                      <span className="font-bold text-xl text-gray-900" style={priceColorStyle}>
                        {selectedProperty.currency}{Math.abs(priceText).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total Price Change:</span>
                  <span className={`text-3xl font-extrabold`} style={totalChangeColorStyle}>
                    {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientView;
