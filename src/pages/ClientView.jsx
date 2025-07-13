// src/pages/ClientView.jsx - Version 4.2 (Activities Sorting)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';

import {
  Calendar, MapPin, Check, X, ChevronLeft, ChevronRight, Maximize2,
  BedDouble, Bath, Image, Building, Activity, Plane, Car, ClipboardList,
  Clock, Users, DollarSign, ChevronsRight
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

// A new component for the tab content placeholders
const PlaceholderContent = ({ title }) => (
  <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-lg">
    <h3 className="text-2xl font-bold">{title}</h3>
    <p className="mt-2">Options for this section will be displayed here once added by your agent.</p>
  </div>
);

const ClientView = () => {
  // --- STATE MANAGEMENT ---
  const { clientId } = useParams();
  const location = useLocation();
  const [clientData, setClientData] = useState(null); // Holds the new data object {properties, activities, etc.}
  const [clientName, setClientName] = useState('Client Selection');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [globalLogoUrl, setGlobalLogoUrl] = useState(null);
  const [activeTab, setActiveTab] = useState('summary'); // Tracks the selected tab

  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [expandedImage, setExpandedImage] = useState(null);
  const [expandedImagePropertyId, setExpandedImagePropertyId] = useState(null);
  
  const accentColor = '#FFD700';
  const savingsColor = '#10B981'; // For negative price changes (savings)
  const extraColor = '#EF4444'; // For positive price changes (extra cost)

  // --- UTILITY FUNCTIONS ---
  const getCurrencySymbol = (currencyCode) => {
    switch (currencyCode) {
      case 'NZD': return 'NZ$';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'INR': return '₹';
      default: return currencyCode;
    }
  };
  
  // Sort itineraries (properties grouped by location) by check-in date
  const sortItinerariesByDate = (itins) => {
    if (!itins || !Array.isArray(itins)) return [];
    return itins.sort((a, b) => {
        const dateA = a.checkIn ? parseISO(a.checkIn).getTime() : 0;
        const dateB = b.checkIn ? parseISO(b.checkIn).getTime() : 0;
        return dateA - dateB;
    });
  };

  // Parses a currency string into a number, handling various formats
  const parseCurrencyToNumber = useCallback((currencyString) => {
    if (typeof currencyString === 'number') return currencyString;
    if (typeof currencyString !== 'string') return 0;
    const numericString = currencyString.replace(/[^\d.-]/g, ''); // Remove non-numeric, non-dot, non-hyphen chars
    const parsed = parseFloat(numericString);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  // Calculates the number of nights between two dates
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

  // Formats a date string into 'dd MMM yy'
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

  // Formats a time string into 'hh:mm AM/PM'
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(date);
    } catch { return 'Invalid Time'; }
  };

  // Calculates the final price for an activity based on pax, price per pax, and adjustment
  const calculateFinalActivityPrice = useCallback((activity) => {
    const pax = parseInt(activity.pax, 10) || 0;
    const pricePerPax = parseFloat(activity.price_per_pax) || 0;
    const adjustment = parseFloat(activity.price_adjustment) || 0;
    return (pax * pricePerPax) + adjustment;
  }, []);

  // Determines the color for price display (green for savings, red for extra cost)
  const getPriceColor = (price) => {
    if (price < 0) return savingsColor;
    if (price > 0) return extraColor;
    return '#333'; // Neutral color for zero
  };

  // --- DATA FETCHING AND SAVING ---
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
        // Call the Supabase RPC function to get client data
        const { data: responseData, error: rpcError } = await supabase.rpc('get_client_data_with_token', {
            p_client_id: clientId,
            p_token: token
        });

        if (rpcError) throw rpcError;
        if (!responseData) throw new Error("Invalid or expired share link.");

        // The 'data' key now holds our object with properties, activities, etc.
        const baseData = { properties: [], activities: [], flights: [], cars: [] };
        const fullClientData = { ...baseData, ...responseData.data };

        // Ensure properties and activities prices are parsed to numbers
        fullClientData.properties = fullClientData.properties.map(p => ({
            ...p,
            price: parseCurrencyToNumber(p.price)
        }));
        fullClientData.activities = fullClientData.activities.map(a => ({
            ...a,
            price_per_pax: parseCurrencyToNumber(a.price_per_pax),
            price_adjustment: parseCurrencyToNumber(a.price_adjustment)
        }));

        setClientData(fullClientData);
        setClientName(responseData.clientName || 'Client Selection');
        setGlobalLogoUrl(responseData.globalLogoUrl);

    } catch (err) {
        console.error("Error during data fetch:", err);
        setError(`Failed to load data. Please check the link. Error: ${err.message}`);
    } finally {
        setLoading(false);
    }
  }, [clientId, location.search, parseCurrencyToNumber]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  // Saves the client's selections back to the database
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
      // The entire clientData object is saved
      const dataToSave = { ...clientData };
      
      const { data: success, error: rpcError } = await supabase.rpc('update_client_data_with_token', {
          p_client_id: clientId,
          p_token: token,
          new_properties: dataToSave // The RPC parameter name is still new_properties, but it expects the full JSON object
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
  }, [clientId, location.search, clientData]);

  // --- DATA TRANSFORMATION & SELECTION LOGIC ---

  // Groups properties by location for display
  const groupedProperties = useMemo(() => {
    if (!clientData?.properties) return {};
    return clientData.properties.reduce((acc, prop) => {
        if (!prop.location) return acc;
        if (!acc[prop.location]) {
            acc[prop.location] = {
                id: prop.location, // Using location as ID for itinerary leg
                location: prop.location,
                checkIn: prop.checkIn,
                checkOut: prop.checkOut,
                properties: []
            };
        }
        if (!prop.isPlaceholder) { // Only include actual properties, not placeholders
             acc[prop.location].properties.push({
                ...prop,
                price: parseCurrencyToNumber(prop.price)
             });
        }
        return acc;
    }, {});
  }, [clientData, parseCurrencyToNumber]);

  // Derives a sorted list of itineraries (locations with properties)
  const itineraries = useMemo(() => sortItinerariesByDate(Object.values(groupedProperties)), [groupedProperties]);

  // Group activities by location for rendering and sort them
  const groupedActivities = useMemo(() => {
    if (!clientData?.activities) return {};
    const grouped = clientData.activities.reduce((acc, activity) => {
      if (!activity.location) return acc;
      if (!acc[activity.location]) {
        acc[activity.location] = [];
      }
      acc[activity.location].push(activity);
      return acc;
    }, {});

    // Sort activities within each location group by date and time
    for (const locationKey in grouped) {
      grouped[locationKey].sort((a, b) => {
        // Sort by date first
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
        // If dates are the same, sort by time
        const timeA = a.time ? parseInt(a.time.replace(':', ''), 10) : 0;
        const timeB = b.time ? parseInt(b.time.replace(':', ''), 10) : 0;
        return timeA - timeB;
      });
    }
    return grouped;
  }, [clientData]);

  // Gets the currently selected property for a given itinerary
  const getSelectedProperty = useCallback((itineraryId) => {
    const itinerary = itineraries.find(it => it.id === itineraryId);
    return itinerary?.properties?.find(prop => prop.selected);
  }, [itineraries]);

  // Toggles the selection of a property, deselecting others in the same itinerary
  const toggleSelection = useCallback((itineraryId, propertyId) => {
    setClientData(prevData => {
        const newProperties = prevData.properties.map(prop => {
            if (prop.location === itineraryId) { // Check if property belongs to the current itinerary leg
                return { ...prop, selected: prop.id === propertyId ? !prop.selected : false };
            }
            return prop;
        });
        return { ...prevData, properties: newProperties };
    });
  }, []);

  // Toggles the selection of an activity, deselecting others in the same location
  const toggleActivitySelection = useCallback((activityId) => {
    setClientData(prevData => {
        const newActivities = prevData.activities.map(act => {
            const activityLocation = act.location; // Assuming activities have a location property
            const targetActivity = prevData.activities.find(a => a.id === activityId);

            if (targetActivity && activityLocation === targetActivity.location) {
                // If it's the target activity, toggle its selection. Otherwise, deselect other activities in the same location.
                return act.id === activityId ? { ...act, selected: !act.selected } : { ...act, selected: false };
            }
            return act; // Return unchanged if not in the same location
        });
        return { ...prevData, activities: newActivities };
    });
  }, []);

  // Calculates the total price change from all selected properties and activities
  const totalChangeValue = useMemo(() => {
    let total = 0;
    if (clientData?.properties) {
        total += clientData.properties.reduce((sum, prop) => {
            return sum + (prop.selected ? parseCurrencyToNumber(prop.price) : 0);
        }, 0);
    }
    if (clientData?.activities) {
        total += clientData.activities.reduce((sum, act) => {
            return sum + (act.selected ? calculateFinalActivityPrice(act) : 0);
        }, 0);
    }
    return total;
  }, [clientData, parseCurrencyToNumber, calculateFinalActivityPrice]);

  const totalChangeColorStyle = { color: getPriceColor(totalChangeValue) };

  // --- IMAGE GALLERY FUNCTIONS ---
  const nextImage = (propertyId) => {
    setCurrentImageIndex(prev => {
        const property = clientData?.properties?.find(p => p.id === propertyId);
        if (!property || !property.images || property.images.length === 0) return prev;
        const currentIdx = prev[propertyId] !== undefined ? prev[propertyId] : (property.homeImageIndex || 0);
        const nextIdx = (currentIdx + 1) % property.images.length;
        return { ...prev, [propertyId]: nextIdx };
    });
  };

  const prevImage = (propertyId) => {
      setCurrentImageIndex(prev => {
        const property = clientData?.properties?.find(p => p.id === propertyId);
        if (!property || !property.images || property.images.length === 0) return prev;
        const currentIdx = prev[propertyId] !== undefined ? prev[propertyId] : (property.homeImageIndex || 0);
        const prevIdx = (currentIdx - 1 + property.images.length) % property.images.length;
        return { ...prev, [propertyId]: prevIdx };
    });
  };

  const openExpandedImage = (propertyId, imageIndex) => {
    const propertyToExpand = clientData?.properties?.find(p => p.id === propertyId);
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
      return clientData?.properties?.find(p => p.id === propId) || null;
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
  }, [expandedImagePropertyId, clientData]);

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
  }, [expandedImagePropertyId, clientData]);

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

  // --- RENDER LOGIC ---
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
        .selected-activity-card {
            border-color: ${accentColor};
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.7);
            border-width: 4px;
        }
      `}</style>

      {/* Expanded Image Modal */}
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

      {/* Header Section */}
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
              <p className="text-xl font-bold text-gray-900">Your Curated Selections</p>
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
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button onClick={() => setActiveTab('summary')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base flex items-center ${activeTab === 'summary' ? `border-yellow-500 text-yellow-600` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                    <ClipboardList size={18} className="mr-2" /> Summary
                </button>
                <button onClick={() => setActiveTab('property')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base flex items-center ${activeTab === 'property' ? `border-yellow-500 text-yellow-600` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                    <Building size={18} className="mr-2" /> Property
                </button>
                <button onClick={() => setActiveTab('activities')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base flex items-center ${activeTab === 'activities' ? `border-yellow-500 text-yellow-600` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                    <Activity size={18} className="mr-2" /> Activities
                </button>
                <button onClick={() => setActiveTab('flights')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base flex items-center ${activeTab === 'flights' ? `border-yellow-500 text-yellow-600` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                    <Plane size={18} className="mr-2" /> Flights
                </button>
                <button onClick={() => setActiveTab('car')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base flex items-center ${activeTab === 'car' ? `border-yellow-500 text-yellow-600` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                    <Car size={18} className="mr-2" /> Car
                </button>
            </nav>
        </div>

        {/* Conditional Content Rendering based on activeTab */}
        {activeTab === 'summary' && (
            <div className="mt-12 bg-white rounded-2xl shadow-xl p-6 font-['Century_Gothic'] border border-gray-100 text-left">
              <h2 className="text-2xl font-bold mb-5 text-gray-800">Your Selection Summary</h2>
              {itineraries.every(it => !getSelectedProperty(it.id)) && clientData?.activities.every(act => !act.selected) ? (
                <p className="text-gray-500 text-center py-8 text-lg">No properties or activities selected yet. Start choosing!</p>
              ) : (
                <div className="space-y-4">
                  {/* Selected Properties Summary */}
                  {itineraries.map((itinerary) => {
                    const selectedProperty = getSelectedProperty(itinerary.id);
                    if (!selectedProperty) return null;
                    const priceText = parseCurrencyToNumber(selectedProperty.price);
                    const priceColorStyle = { color: getPriceColor(priceText) };
                    return (
                      <div key={`summary-prop-${itinerary.id}`} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm border">
                        <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                          <img src={selectedProperty.images?.[selectedProperty.homeImageIndex || 0] || "https://placehold.co/60x60/E0E0E0/333333?text=No+Image"} alt={selectedProperty.name} className="w-16 h-16 rounded-lg object-cover shadow-sm flex-shrink-0" onError={(e) => { e.target.src = "https://placehold.co/60x60/E0E0E0/333333?text=Image+Error"; }}/>
                          <div className="text-left">
                            <h4 className="font-semibold text-gray-900 text-base">{itinerary.location} (Property)</h4>
                            <p className="text-sm text-gray-700 font-medium">{selectedProperty.name}</p>
                          </div>
                        </div>
                        <div className="text-right w-full sm:w-auto">
                          <span className="font-bold text-xl" style={priceColorStyle}>{getCurrencySymbol(selectedProperty.currency)}{priceText >= 0 ? '+' : ''}{Math.abs(priceText).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Selected Activities Summary */}
                  {/* Iterate over sorted activities for summary */}
                  {Object.values(groupedActivities).flat().filter(act => act.selected).map((activity) => {
                    const finalPrice = calculateFinalActivityPrice(activity);
                    const priceColorStyle = { color: getPriceColor(finalPrice) };
                    return (
                      <div key={`summary-act-${activity.id}`} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm border">
                        <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                          <img src={activity.images?.[0] || "https://placehold.co/60x60/E0E0E0/333333?text=No+Image"} alt={activity.name} className="w-16 h-16 rounded-lg object-cover shadow-sm flex-shrink-0" onError={(e) => { e.target.src = "https://placehold.co/60x60/E0E0E0/333333?text=Image+Error"; }}/>
                          <div className="text-left">
                            <h4 className="font-semibold text-gray-900 text-base">{activity.location} (Activity)</h4>
                            <p className="text-sm text-gray-700 font-medium">{activity.name}</p>
                          </div>
                        </div>
                        <div className="text-right w-full sm:w-auto">
                          <span className="font-bold text-xl" style={priceColorStyle}>{getCurrencySymbol(activity.currency)}{finalPrice >= 0 ? '+' : ''}{Math.abs(finalPrice).toFixed(2)}</span>
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
        )}

        {activeTab === 'property' && (
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
                          const priceColorStyle = { color: getPriceColor(priceValue) };
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
        )}

        {activeTab === 'activities' && (
            <div className="space-y-10">
                {Object.entries(groupedActivities).length === 0 ? (
                    <PlaceholderContent title="Activities" />
                ) : (
                    Object.entries(groupedActivities).map(([location, activitiesInLocation]) => (
                        <div key={location} className="p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
                            <h3 className="text-2xl font-bold text-gray-800 mb-4">{location} Activities</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {activitiesInLocation.map(activity => {
                                    const finalPrice = calculateFinalActivityPrice(activity);
                                    const priceColorStyle = { color: getPriceColor(finalPrice) };
                                    return (
                                        <div 
                                            key={activity.id} 
                                            className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-300 cursor-pointer group overflow-hidden ${activity.selected ? 'selected-activity-card' : 'border-gray-200'}`}
                                            onClick={() => toggleActivitySelection(activity.id)}
                                        >
                                            <div className="relative aspect-video">
                                                {activity.images && activity.images.length > 0 ? (
                                                    <img src={activity.images[0]} alt={activity.name} className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://placehold.co/800x450/E0E0E0/333333?text=Image+Error"; }}/>
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                                                        <Image size={40} />
                                                    </div>
                                                )}
                                                {activity.selected && (
                                                    <div className="absolute top-3 left-3 bg-white rounded-full p-1 shadow-lg">
                                                        <Check size={24} className="text-green-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4 flex flex-col justify-between flex-grow">
                                                <div>
                                                    <h4 className="font-bold text-lg text-gray-800 truncate mb-2">{activity.name}</h4>
                                                    <div className="space-y-1 text-sm text-gray-600">
                                                        <div className="flex items-center"><Calendar size={16} className="mr-2 text-gray-400" /> <span>{formatDate(activity.date)}</span></div>
                                                        <div className="flex items-center"><Clock size={16} className="mr-2 text-gray-400" /> <span>{formatTime(activity.time)}</span></div>
                                                        <div className="flex items-center"><ChevronsRight size={16} className="mr-2 text-gray-400" /> <span>{activity.duration} hours</span></div>
                                                        <div className="flex items-center"><Users size={16} className="mr-2 text-gray-400" /> <span>{activity.pax} Pax</span></div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 text-right">
                                                    <span className={`text-2xl font-bold`} style={priceColorStyle}>
                                                        {finalPrice < 0 ? `-` : `+`}{getCurrencySymbol(activity.currency)}{Math.abs(finalPrice).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}

        {activeTab === 'flights' && <PlaceholderContent title="Flights" />}
        {activeTab === 'car' && <PlaceholderContent title="Car Rentals" />}

        {/* Save Selections Button */}
        <div className="mt-6 mb-12">
          <button onClick={handleSaveSelection} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" disabled={loading}>{loading ? 'Saving...' : 'Confirm My Selections'}</button>
        </div>
      </div>
    </div>
  );
};

export default ClientView;
