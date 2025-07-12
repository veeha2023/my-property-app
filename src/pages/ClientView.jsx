// src/pages/ClientView.jsx - Version 2.8 (Error Handling Fix)
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';

import {
  Calendar, MapPin, Check, X, ChevronLeft, ChevronRight, Maximize2,
  BedDouble, Bath, Image
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

const ClientView = () => {
  const { clientId } = useParams();
  const location = useLocation();
  const [itineraries, setItineraries] = useState([]);
  const [clientName, setClientName] = useState('Client Selection');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [globalLogoUrl, setGlobalLogoUrl] = useState(null);

  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [expandedImage, setExpandedImage] = useState(null);
  const [expandedImagePropertyId, setExpandedImagePropertyId] = useState(null);
  
  const accentColor = '#FFD700';
  const savingsColor = '#10B981';
  const extraColor = '#EF4444';

  const getCurrencySymbol = (currencyCode) => {
    switch (currencyCode) {
      case 'NZD': return 'NZ$';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'INR': return '₹';
      default: return currencyCode;
    }
  };
  
  const sortItinerariesByDate = (itins) => {
    if (!Array.isArray(itins)) return [];
    return itins.sort((a, b) => {
        const dateA = a.checkIn ? parseISO(a.checkIn).getTime() : 0;
        const dateB = b.checkIn ? parseISO(b.checkIn).getTime() : 0;
        return dateA - dateB;
    });
  };

  const parseCurrencyToNumber = useCallback((currencyString) => {
    if (typeof currencyString === 'number') return currencyString;
    if (typeof currencyString !== 'string') return 0;
    const numericString = currencyString.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(numericString);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  const fetchClientData = useCallback(async () => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');

    if (!clientId || !token) {
        setError("Client ID or share token is missing from the URL.");
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);

    try {
        const { data: responseData, error: rpcError } = await supabase.rpc('get_client_data_with_token', {
            p_client_id: clientId,
            p_token: token
        });

        if (rpcError) {
            // This is the key change: throw the actual error from the database
            throw rpcError;
        }
        if (!responseData) {
            // This case should ideally not be hit if the RPC raises an exception, but it's good for robustness
            throw new Error("No data returned. The link may be invalid or expired.");
        }

        const { properties, clientName, globalLogoUrl } = responseData;
        
        // Robustly normalise the `properties` payload coming from Supabase.
        // It can legitimately arrive as:
        //   1. A proper array (preferred)
        //   2. A JSON-encoded string of that array (legacy rows)
        //   3. Null / undefined
        // Anything other than case 1 is coerced into an array with safe fall-backs so that
        // the rest of the component never breaks or renders an empty screen.

        let propertiesArray = [];
        if (Array.isArray(properties)) {
          propertiesArray = properties;
        } else if (typeof properties === 'string') {
          try {
            const parsed = JSON.parse(properties);
            if (Array.isArray(parsed)) {
              propertiesArray = parsed;
            }
          } catch (parseErr) {
            console.error('Failed to JSON.parse(properties):', parseErr);
          }
        }

        const itinerariesMap = propertiesArray.reduce((acc, prop) => {
            if (!prop.location) return acc;
            if (!acc[prop.location]) {
                acc[prop.location] = {
                    id: prop.location,
                    location: prop.location,
                    checkIn: prop.checkIn,
                    checkOut: prop.checkOut,
                    properties: []
                };
            }
            if (!prop.isPlaceholder) {
                 acc[prop.location].properties.push({
                    ...prop,
                    price: parseCurrencyToNumber(prop.price)
                 });
            }
            return acc;
        }, {});

        const processedItineraries = sortItinerariesByDate(Object.values(itinerariesMap));
        setItineraries(processedItineraries);
        setClientName(clientName || 'Client Selection');
        setGlobalLogoUrl(globalLogoUrl);

    } catch (err) {
        console.error("Error during data fetch:", err);
        // This will now display the specific error message, e.g., "Invalid or expired share link."
        setError(`Failed to load data: ${err.message}`);
    } finally {
        setLoading(false);
    }
  }, [clientId, location.search, parseCurrencyToNumber]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  // ... All other functions (handleSaveSelection, calculateNights, etc.) and the JSX render remain exactly the same.
  // The only change is in the fetchClientData function's error handling.
  const handleSaveSelection = useCallback(async () => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');

    if (!clientId || !token) {
      setError('Client ID or share token is missing. Cannot save.');
      return;
    }

    setLoading(true);
    setMessage('');
    setError(null);

    try {
      const propertiesToSave = itineraries.flatMap(itinerary => {
          const hasProperties = itinerary.properties && itinerary.properties.length > 0;
          if (hasProperties) {
              return itinerary.properties;
          } else {
              return [{
                  id: `itinerary-placeholder-${itinerary.id}-${Date.now()}`,
                  name: 'Itinerary Placeholder',
                  location: itinerary.location,
                  checkIn: itinerary.checkIn,
                  checkOut: itinerary.checkOut,
                  isPlaceholder: true
              }];
          }
      });

      const propertiesJson = JSON.stringify(propertiesToSave);
      
      const { data: success, error: rpcError } = await supabase.rpc('update_client_data_with_token', {
          p_client_id: clientId,
          p_token: token,
          new_properties: propertiesJson
      });

      if (rpcError) throw rpcError;
      if (!success) throw new Error("Update failed. The link may be invalid or expired.");
      
      setMessage('Your selection has been successfully saved!');

    } catch (err) {
      console.error("Error saving client selection:", err);
      setError("Error saving your selection: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId, location.search, itineraries]);


  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    try {
        const start = parseISO(checkIn);
        const end = parseISO(checkOut);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        return differenceInDays(end, start);
    } catch {
        return 0;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, 'dd MMM yy');
    } catch (e) {
      return 'Error';
    }
  };

  const getSelectedProperty = useCallback((itineraryId) => {
    const itinerary = itineraries.find(it => it.id === itineraryId);
    return itinerary?.properties?.find(prop => prop.selected);
  }, [itineraries]);

  const totalChangeValue = itineraries.reduce((total, itinerary) => {
    const selectedProp = getSelectedProperty(itinerary.id);
    return total + (selectedProp ? parseCurrencyToNumber(selectedProp.price) : 0);
  }, 0);
  const totalChangeColorStyle = { color: totalChangeValue >= 0 ? extraColor : savingsColor };

  const nextImage = (propertyId) => {
    setCurrentImageIndex(prev => {
        let property;
        itineraries.some(it => property = it.properties.find(p => p.id === propertyId));
        if (!property || !property.images || property.images.length === 0) return prev;
        
        const currentIdx = prev[propertyId] !== undefined ? prev[propertyId] : (property.homeImageIndex || 0);
        const nextIdx = (currentIdx + 1) % property.images.length;
        return { ...prev, [propertyId]: nextIdx };
    });
  };

  const prevImage = (propertyId) => {
      setCurrentImageIndex(prev => {
        let property;
        itineraries.some(it => property = it.properties.find(p => p.id === propertyId));
        if (!property || !property.images || property.images.length === 0) return prev;

        const currentIdx = prev[propertyId] !== undefined ? prev[propertyId] : (property.homeImageIndex || 0);
        const prevIdx = (currentIdx - 1 + property.images.length) % property.images.length;
        return { ...prev, [propertyId]: prevIdx };
    });
  };

  const openExpandedImage = (propertyId, imageIndex) => {
    let propertyToExpand;
    itineraries.some(it => propertyToExpand = it.properties?.find(p => p.id === propertyId));
    
    if (propertyToExpand?.images?.[imageIndex]) {
      setExpandedImage(propertyToExpand.images[imageIndex]);
      setExpandedImagePropertyId(propertyId);
      setCurrentImageIndex(prev => ({ ...prev, [propertyId]: imageIndex }));
    }
  };

  const closeExpandedImage = useCallback(() => {
    setExpandedImage(null);
    setExpandedImagePropertyId(null);
  }, []);

  const findPropertyForExpandedView = (propId) => {
      for (const itinerary of itineraries) {
          const prop = itinerary.properties?.find(p => p.id === propId);
          if (prop) return prop;
      }
      return null;
  }

  const nextExpandedImage = useCallback(() => {
    if (!expandedImagePropertyId) return;
    const property = findPropertyForExpandedView(expandedImagePropertyId);
    if (!property || !property.images || property.images.length <= 1) return;

    setCurrentImageIndex(prev => {
      const currentIdx = prev[expandedImagePropertyId] !== undefined ? prev[expandedImagePropertyId] : (property.homeImageIndex || 0);
      const nextIdx = (currentIdx + 1) % property.images.length;
      setExpandedImage(property.images[nextIdx]);
      return { ...prev, [expandedImagePropertyId]: nextIdx };
    });
  }, [expandedImagePropertyId, itineraries]);

  const prevExpandedImage = useCallback(() => {
    if (!expandedImagePropertyId) return;
    const property = findPropertyForExpandedView(expandedImagePropertyId);
    if (!property || !property.images || property.images.length <= 1) return;

    setCurrentImageIndex(prev => {
      const currentIdx = prev[expandedImagePropertyId] !== undefined ? prev[expandedImagePropertyId] : (property.homeImageIndex || 0);
      const prevIdx = (currentIdx - 1 + property.images.length) % property.images.length;
      setExpandedImage(property.images[prevIdx]);
      return { ...prev, [expandedImagePropertyId]: prevIdx };
    });
  }, [expandedImagePropertyId, itineraries]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (expandedImage) {
        if (event.key === 'ArrowRight') nextExpandedImage();
        else if (event.key === 'ArrowLeft') prevExpandedImage();
        else if (event.key === 'Escape') closeExpandedImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedImage, nextExpandedImage, prevExpandedImage, closeExpandedImage]);

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Luxury': return 'bg-purple-600 text-white';
      case 'Super Deluxe': return 'bg-blue-600 text-white';
      case 'Deluxe': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const toggleSelection = useCallback((itineraryId, propertyId) => {
    setItineraries(prevItineraries => prevItineraries.map(itinerary => {
      if (itinerary.id === itineraryId) {
        return {
          ...itinerary,
          properties: (itinerary.properties || []).map(prop => ({
            ...prop,
            selected: prop.id === propertyId ? !prop.selected : false
          }))
        };
      }
      return itinerary;
    }));
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-['Century_Gothic'] text-xl">Loading client selection...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center font-['Century_Gothic'] text-xl text-red-600 p-8 text-center">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Century_Gothic']">
      <style>{`
        .font-century-gothic { font-family: 'Century Gothic', sans-serif; }
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
            <button onClick={closeExpandedImage} className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 z-10" aria-label="Close"><X size={24} /></button>
            <img src={expandedImage} alt="Expanded view" className="max-w-full max-h-full object-contain rounded-xl"/>
            {expandedImagePropertyId && findPropertyForExpandedView(expandedImagePropertyId)?.images?.length > 1 && (
              <>
                <button onClick={prevExpandedImage} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-3 text-gray-800 hover:bg-opacity-100 shadow-lg" aria-label="Previous"><ChevronLeft size={24} /></button>
                <button onClick={nextExpandedImage} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-3 text-gray-800 hover:bg-opacity-100 shadow-lg" aria-label="Next"><ChevronRight size={24} /></button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white rounded-xl shadow-md p-4 md:p-6">
          <div className="flex items-center mb-4 md:mb-0">
            {globalLogoUrl ? (
              <img src={globalLogoUrl} alt="Company Logo" className="h-14 max-h-32 w-auto max-w-full object-contain rounded-lg mr-4" />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-xs mr-4">Logo</div>
            )}
            <div className="text-left">
              <h1 className="text-4xl font-extrabold text-gray-900 mb-1">Veeha Travels</h1>
              <p className="text-xl font-bold text-gray-900">Your Curated Property Selection</p>
              <p className="text-lg text-gray-700 mt-2">Viewing: {clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`text-right p-3 rounded-lg border ${totalChangeValue >= 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              <p className="text-xs text-gray-600">Total Price Change</p>
              <p className={`text-2xl font-bold`} style={totalChangeColorStyle}>
                {getCurrencySymbol('NZD')}{totalChangeValue >= 0 ? '+' : ''}{totalChangeValue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {message && <p className="mb-4 text-center text-sm text-blue-600 bg-blue-100 p-3 rounded-lg">{message}</p>}
        
        <div className="space-y-10">
          {itineraries.map((itinerary) => (
            <div key={itinerary.id} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="p-5 border-b bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div className="mb-2 md:mb-0">
                    <h2 className="text-2xl font-bold text-gray-900 text-left">{itinerary.location}</h2>
                    <p className="text-sm text-gray-600">
                      <Calendar size={14} className="inline mr-1 text-gray-500" />
                      {itinerary.checkIn && itinerary.checkOut ? `${formatDate(itinerary.checkIn)} - ${formatDate(itinerary.checkOut)} · ${calculateNights(itinerary.checkIn, itinerary.checkOut)} nights` : 'Dates N/A'}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm text-gray-600">Selected Property:</p>
                    <p className="font-semibold text-gray-900 text-base">{getSelectedProperty(itinerary.id)?.name || 'None'}</p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(itinerary.properties || []).length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500"><p>No properties for this itinerary.</p></div>
                  ) : (
                    itinerary.properties.map((property) => {
                      const priceValue = parseCurrencyToNumber(property.price);
                      const priceColorStyle = { color: priceValue >= 0 ? extraColor : savingsColor };
                      return (
                        <div key={property.id} className={`relative group bg-white rounded-xl shadow-lg border-2 overflow-hidden transform hover:scale-102 transition-all duration-300 cursor-pointer ${property.selected ? 'selected-border' : 'border-gray-200'}`} onClick={() => toggleSelection(itinerary.id, property.id)}>
                          <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
                            <img src={property.images?.[currentImageIndex[property.id] || property.homeImageIndex || 0] || "https://placehold.co/800x600/E0E0E0/333333?text=No+Image"} alt={property.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { e.target.src = "https://placehold.co/800x600/E0E0E0/333333?text=Image+Error"; }}/>
                            {property.selected && <div className="absolute top-3 left-3 rounded-full p-2 shadow-md" style={{ backgroundColor: accentColor, color: '#333' }}><Check size={16} /></div>}
                          </div>
                          <div className="p-4 space-y-2">
                            <h3 className="font-semibold text-lg text-gray-900 leading-tight">{property.name}</h3>
                            <div className="flex items-center text-sm text-gray-600 gap-3">
                              {(property.bedrooms > 0) && <div className="flex items-center"><BedDouble size={16} className="mr-1 text-gray-500" /><span>{property.bedrooms} Bed{property.bedrooms > 1 ? 's' : ''}</span></div>}
                              {property.bathrooms > 0 && <div className="flex items-center"><Bath size={16} className="mr-1 text-gray-500" /><span>{property.bathrooms} Bath{property.bathrooms > 1 ? 's' : ''}</span></div>}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-base text-gray-700 font-medium">{calculateNights(property.checkIn, property.checkOut)} nights</span>
                                <div className="text-right">
                                    <span className="font-bold text-xl text-gray-900" style={priceColorStyle}>{getCurrencySymbol(property.currency)}{priceValue >= 0 ? '+' : ''}{Math.abs(priceValue).toFixed(2)}</span>
                                </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-2xl shadow-xl p-6 font-['Century_Gothic'] border border-gray-100 text-left">
          <h2 className="text-2xl font-bold mb-5 text-gray-800">Your Selection Summary</h2>
          {itineraries.every(it => !getSelectedProperty(it.id)) ? (
            <p className="text-gray-500 text-center py-8 text-lg">No properties selected yet. Start choosing!</p>
          ) : (
            <div className="space-y-4">
              {itineraries.map((itinerary) => {
                const selectedProperty = getSelectedProperty(itinerary.id);
                if (!selectedProperty) return null;
                const priceText = parseCurrencyToNumber(selectedProperty.price);
                const priceColorStyle = { color: priceText >= 0 ? extraColor : savingsColor };
                return (
                  <div key={itinerary.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm border">
                    <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                      <img src={selectedProperty.images?.[selectedProperty.homeImageIndex || 0] || "https://placehold.co/60x60/E0E0E0/333333?text=No+Image"} alt={selectedProperty.name} className="w-16 h-16 rounded-lg object-cover shadow-sm flex-shrink-0" onError={(e) => { e.target.src = "https://placehold.co/60x60/E0E0E0/333333?text=Image+Error"; }}/>
                      <div className="text-left">
                        <h4 className="font-semibold text-gray-900 text-base">{itinerary.location}</h4>
                        <p className="text-sm text-gray-700 font-medium">{selectedProperty.name}</p>
                      </div>
                    </div>
                    <div className="text-right w-full sm:w-auto">
                      <span className="font-bold text-xl" style={priceColorStyle}>{getCurrencySymbol(selectedProperty.currency)}{priceText >= 0 ? '+' : ''}{Math.abs(priceText).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total Price Change:</span>
                  <span className={`text-3xl font-extrabold`} style={totalChangeColorStyle}>{getCurrencySymbol('NZD')}{totalChangeValue >= 0 ? '+' : ''}{totalChangeValue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 mb-12">
          <button onClick={handleSaveSelection} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" disabled={loading}>{loading ? 'Saving...' : 'Confirm My Selection'}</button>
        </div>
      </div>
    </div>
  );
};

export default ClientView;
