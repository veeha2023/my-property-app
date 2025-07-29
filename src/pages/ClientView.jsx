// src/pages/ClientView.jsx - Version 5.21 (Dynamic Currency)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';

import {
  Calendar, MapPin, Check, X, ChevronLeft, ChevronRight, Maximize2,
  BedDouble, Bath, Image, Building, Activity, Plane, Car, ClipboardList,
  Clock, Users, DollarSign, ChevronsRight, ShieldCheck, CheckCircle, Ship, Bus, Briefcase,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

const PlaceholderContent = ({ title }) => (
  <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-lg">
    <h3 className="text-2xl font-bold">{title}</h3>
    <p className="mt-2">Options for this section will be displayed here once added by your agent.</p>
  </div>
);

const ClientView = () => {
  const { clientId } = useParams();
  const location = useLocation();
  const [clientData, setClientData] = useState(null);
  const [clientName, setClientName] = useState('Client Selection');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [globalLogoUrl, setGlobalLogoUrl] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [expandedImage, setExpandedImage] = useState(null);
  const [expandedImagePropertyId, setExpandedImagePropertyId] = useState(null);
  
  const [collapsedSections, setCollapsedSections] = useState({});
  
  const accentColor = '#FFD700';
  const savingsColor = '#10B981';
  const extraColor = '#EF4444';

  // State for touch swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const [swipeTranslate, setSwipeTranslate] = useState({});

  const flightTypes = {
    domestic: { label: 'Domestic Flight', icon: <Plane /> },
    international: { label: 'International Flight', icon: <Plane /> },
  };

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
    if (!itins || !Array.isArray(itins)) return [];
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

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    try {
        const start = parseISO(checkIn);
        const end = parseISO(checkOut);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        return differenceInDays(end, start);
    } catch { return 0; }
  };

  const parseDateString = (dateString) => {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    const parts = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (parts) {
      const day = parts[1].padStart(2, '0');
      const month = parts[2].padStart(2, '0');
      const year = parts[3];
      return `${year}-${month}-${day}`;
    }
    return dateString;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const parsedDateStr = parseDateString(dateString);
      const date = new Date(parsedDateStr + 'T00:00:00');
      if (isNaN(date.getTime())) return 'Invalid Date';
      return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    } catch (e) { return 'Error'; }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(date);
    } catch { return 'Invalid Time'; }
  };
  
  const calculateDuration = (departureDate, departureTime, arrivalDate, arrivalTime) => {
    if (!departureDate || !departureTime || !arrivalDate || !arrivalTime) {
      return '';
    }
    try {
      const start = new Date(`${departureDate}T${departureTime}`);
      const end = new Date(`${arrivalDate}T${arrivalTime}`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

      let diff = end.getTime() - start.getTime();
      if (diff < 0) diff = 0;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      return `${hours}h ${minutes}m`;
    } catch (e) {
      return '';
    }
  };


  const calculateFinalActivityPrice = useCallback((activity) => {
    const priceSelected = parseFloat(activity.price_if_selected) || 0;
    const priceNotSelected = parseFloat(activity.price_if_not_selected) || 0;
    return activity.selected ? priceSelected : priceNotSelected;
  }, []);

  const calculateFinalFlightPrice = useCallback((flight) => {
    const priceSelected = parseFloat(flight.price_if_selected) || 0;
    const priceNotSelected = parseFloat(flight.price_if_not_selected) || 0;
    return flight.selected ? priceSelected : priceNotSelected;
  }, []);

  const getPriceColor = (price) => {
    if (price < 0) return savingsColor;
    if (price > 0) return extraColor;
    return '#333';
  };

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
        const { data: responseData, error: rpcError } = await supabase.rpc('get_client_data_with_token', { p_client_id: clientId, p_token: token });
        if (rpcError) throw rpcError;
        if (!responseData) throw new Error("Invalid or expired share link.");

        const baseData = { properties: [], activities: [], flights: [], transportation: [], quote: 0, currency: 'NZD' };
        const fullClientData = { ...baseData, ...responseData.data };

        fullClientData.properties = fullClientData.properties.map(p => ({ ...p, price: parseCurrencyToNumber(p.price) }));
        fullClientData.activities = fullClientData.activities.map(a => ({ ...a, price_if_selected: parseCurrencyToNumber(a.price_if_selected), price_if_not_selected: parseCurrencyToNumber(a.price_if_not_selected) }));
        fullClientData.transportation = (fullClientData.transportation || []).map(t => ({ ...t, price: parseCurrencyToNumber(t.price), excessAmount: parseCurrencyToNumber(t.excessAmount) }));
        fullClientData.flights = (fullClientData.flights || []).map(f => ({ ...f, price_if_selected: parseCurrencyToNumber(f.price_if_selected), price_if_not_selected: parseCurrencyToNumber(f.price_if_not_selected) }));

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

  useEffect(() => { fetchClientData(); }, [fetchClientData]);

  const handleSaveSelection = useCallback(async () => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    if (!clientId || !token) { setError('Client ID or share token is missing. Cannot save.'); return; }
    setLoading(true);
    setMessage('');
    setError(null);
    try {
      const dataToSave = { ...clientData };
      const { data: success, error: rpcError } = await supabase.rpc('update_client_data_with_token', { p_client_id: clientId, p_token: token, new_properties: dataToSave });
      if (rpcError) throw rpcError;
      if (!success) throw new Error("Update failed. The link may be invalid or expired.");
      setMessage('Your selection has been successfully saved!');
    } catch (err) {
      console.error("Error saving client selection:", err);
      setError("Error saving your selection: " + err.message);
    } finally { setLoading(false); }
  }, [clientId, location.search, clientData]);

  const groupedProperties = useMemo(() => {
    if (!clientData?.properties) return {};
    const acc = clientData.properties.reduce((acc, prop) => {
        if (!prop.location) return acc;
        if (!acc[prop.location]) {
            acc[prop.location] = { id: prop.location, location: prop.location, checkIn: prop.checkIn, checkOut: prop.checkOut, properties: [] };
        }
        if (!prop.isPlaceholder) { acc[prop.location].properties.push({ ...prop, price: parseCurrencyToNumber(prop.price) }); }
        return acc;
    }, {});
    
    Object.values(acc).forEach(group => {
        group.properties.sort((a, b) => a.price - b.price);
    });

    return acc;
  }, [clientData, parseCurrencyToNumber]);

  const itineraries = useMemo(() => sortItinerariesByDate(Object.values(groupedProperties)), [groupedProperties]);

  const sortedActivityGroups = useMemo(() => {
    if (!clientData?.activities) return [];
    
    const groupedByLocation = (clientData.activities || []).reduce((acc, activity) => {
      const location = activity.location || 'Uncategorized';
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(activity);
      return acc;
    }, {});

    const locationGroups = Object.keys(groupedByLocation).map(location => {
      const groupActivities = groupedByLocation[location];
      
      groupActivities.sort((a, b) => {
        const dateA = new Date(parseDateString(a.date) + 'T' + (a.time || '00:00'));
        const dateB = new Date(parseDateString(b.date) + 'T' + (b.time || '00:00'));
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateA.getTime() - dateB.getTime();
      });

      const earliestActivity = groupActivities[0];
      const sortDate = earliestActivity ? new Date(parseDateString(earliestActivity.date) + 'T' + (earliestActivity.time || '00:00')) : new Date(0);

      return {
        location,
        activities: groupActivities,
        sortDate: isNaN(sortDate.getTime()) ? new Date(0) : sortDate,
      };
    });

    locationGroups.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
    
    return locationGroups;
  }, [clientData?.activities]);

  const sortedTransportation = useMemo(() => {
    if (!clientData?.transportation || clientData.transportation.length === 0) return [];
    
    return [...clientData.transportation].sort((a, b) => {
      const getDate = (item) => item.pickupDate || item.boardingDate || item.date;
      const getTime = (item) => item.pickupTime || item.boardingTime || item.time || '00:00';

      const dateTimeA = new Date(`${parseDateString(getDate(a))}T${getTime(a)}`);
      const dateTimeB = new Date(`${parseDateString(getDate(b))}T${getTime(b)}`);

      if (isNaN(dateTimeA.getTime())) return 1;
      if (isNaN(dateTimeB.getTime())) return -1;

      return dateTimeA.getTime() - dateTimeB.getTime();
    });
  }, [clientData?.transportation]);
  
  const groupedFlights = useMemo(() => {
    if (!clientData?.flights) return {};
    const groups = { domestic: [], international: [] };
    (clientData.flights || []).forEach(flight => {
        if (groups[flight.flightType]) {
            groups[flight.flightType].push(flight);
        }
    });
    return groups;
  }, [clientData]);

  const getSelectedProperty = useCallback((itineraryId) => {
    const itinerary = itineraries.find(it => it.id === itineraryId);
    return itinerary?.properties?.find(prop => prop.selected);
  }, [itineraries]);

  const toggleSelection = useCallback((itineraryId, propertyId) => {
    setClientData(prevData => {
        const newProperties = prevData.properties.map(prop => {
            if (prop.location === itineraryId) { return { ...prop, selected: prop.id === propertyId ? !prop.selected : false }; }
            return prop;
        });
        return { ...prevData, properties: newProperties };
    });
  }, []);

  const toggleActivitySelection = useCallback((activityId) => {
    setClientData(prevData => {
      const newActivities = prevData.activities.map(act => {
        if (act.id === activityId) {
          return { ...act, selected: !act.selected };
        }
        return act;
      });
      return { ...prevData, activities: newActivities };
    });
  }, []);

  const toggleTransportationSelection = useCallback((itemId) => {
    setClientData(prevData => {
      const newTransportation = (prevData.transportation || []).map(item => {
        if (item.id === itemId) {
          return { ...item, selected: !item.selected };
        }
        return item;
      });
      return { ...prevData, transportation: newTransportation };
    });
  }, []);

  const toggleFlightSelection = useCallback((flightId) => {
    setClientData(prevData => {
      const flightToToggle = (prevData.flights || []).find(f => f.id === flightId);
      if (!flightToToggle) return prevData;

      const newFlights = (prevData.flights || []).map(f => {
        if (f.flightType === flightToToggle.flightType) {
          return { ...f, selected: f.id === flightId ? !f.selected : false };
        }
        return f;
      });
      return { ...prevData, flights: newFlights };
    });
  }, []);

  const toggleSection = (location) => {
    setCollapsedSections(prev => ({ ...prev, [location]: !prev[location] }));
  };

  const totalChangeValue = useMemo(() => {
    let total = 0;
    if (clientData?.properties) {
        total += clientData.properties.reduce((sum, prop) => sum + (prop.selected ? parseCurrencyToNumber(prop.price) : 0), 0);
    }
    if (clientData?.activities) {
        total += clientData.activities.reduce((sum, act) => sum + calculateFinalActivityPrice(act), 0);
    }
    if (clientData?.transportation) {
        total += clientData.transportation.reduce((sum, item) => sum + (item.selected ? parseCurrencyToNumber(item.price) : 0), 0);
    }
    if (clientData?.flights) {
        total += clientData.flights.reduce((sum, item) => sum + calculateFinalFlightPrice(item), 0);
    }
    return total;
  }, [clientData, parseCurrencyToNumber, calculateFinalActivityPrice, calculateFinalFlightPrice]);

  const baseQuote = useMemo(() => clientData?.quote || 0, [clientData]);
  const finalQuote = baseQuote + totalChangeValue;
  const totalChangeColorStyle = { color: getPriceColor(totalChangeValue) };
  const currencySymbol = getCurrencySymbol(clientData?.currency || 'NZD');

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

  const closeExpandedImage = useCallback(() => { setExpandedImage(null); setExpandedImagePropertyId(null); }, []);
  const findPropertyForExpandedView = (propId) => clientData?.properties?.find(p => p.id === propId) || null;

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

  // Swipe handlers for image carousels
  const handleTouchStart = (e) => {
    touchEndX.current = 0; // Reset end position
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e, propertyId) => {
    touchEndX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    // Limit translation to a fraction of the swipe distance for a subtle effect
    setSwipeTranslate(prev => ({ ...prev, [propertyId]: -diff / 4 }));
  };

  const handleTouchEnd = (propertyId) => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) { // Threshold for a swipe
      if (diff > 0) {
        // Swiped left
        nextImage(propertyId);
      } else {
        // Swiped right
        prevImage(propertyId);
      }
    }
    // Reset translation smoothly
    setSwipeTranslate(prev => ({ ...prev, [propertyId]: 0 }));
  };

  const handleExpandedTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 50) {
      nextExpandedImage();
    }
    if (touchStartX.current - touchEndX.current < -50) {
      prevExpandedImage();
    }
  };

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

  if (loading) return <div className="min-h-screen flex items-center justify-center font-sans text-xl">Loading client selection...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center font-sans text-xl text-red-600 p-8 text-center">{error}</div>;

  const selectedProperties = clientData?.properties?.filter(p => p.selected && !p.isPlaceholder) || [];
  const selectedActivities = clientData?.activities?.filter(a => a.selected) || [];
  const selectedTransportation = clientData?.transportation?.filter(t => t.selected) || [];
  const selectedFlights = clientData?.flights?.filter(f => f.selected) || [];
  const hasSelections = selectedProperties.length > 0 || selectedActivities.length > 0 || selectedTransportation.length > 0 || selectedFlights.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <style>{`
        .selected-border, .selected-activity-card, .selected-transport-row, .selected-flight-row {
            border-color: ${accentColor};
            box-shadow: 0 0 12px 1px rgba(255, 215, 0, 0.8);
            border-width: 3px;
        }
        .selected-border, .selected-activity-card {
            border-radius: 1rem;
        }
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>

      {expandedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleExpandedTouchEnd}>
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
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 bg-white rounded-xl shadow-md p-4 md:p-6">
          <div className="flex items-center mb-4 md:mb-0">
            {globalLogoUrl ? ( <img src={globalLogoUrl} alt="Company Logo" className="h-14 max-h-32 w-auto max-w-full object-contain rounded-lg mr-4" /> ) : ( <div className="h-14 w-14 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-xs mr-4">Logo</div> )}
            <div className="text-left">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-1">Veeha Travels</h1>
              <p className="text-lg md:text-xl font-bold text-gray-900">Your Curated Selections</p>
              <p className="text-base md:text-lg text-gray-700 mt-2">Viewing: {clientName}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto mt-4 md:mt-0 md:grid md:grid-cols-3 md:gap-4">
              <div className="text-center p-2 md:p-3 rounded-lg bg-gray-100">
                  <p className="text-xs text-gray-600">Base Quote</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-800">{currencySymbol}{baseQuote.toFixed(2)}</p>
              </div>
              <div className="text-center p-2 md:p-3 rounded-lg bg-gray-100">
                  <p className="text-xs text-gray-600">Selections</p>
                  <p className="text-xl md:text-2xl font-bold" style={totalChangeColorStyle}>{totalChangeValue >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(totalChangeValue).toFixed(2)}</p>
              </div>
              <div className="text-center p-2 md:p-3 rounded-lg bg-blue-100 border border-blue-200">
                  <p className="text-xs text-blue-800">Final Quote</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-800">{currencySymbol}{finalQuote.toFixed(2)}</p>
              </div>
          </div>
        </div>

        {message && <p className="mb-4 text-center text-sm text-blue-600 bg-blue-100 p-3 rounded-lg">{message}</p>}
        
        <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-2 sm:space-x-8 overflow-x-auto hide-scrollbar" aria-label="Tabs">
                <button onClick={() => setActiveTab('summary')} className={`whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm sm:text-base flex items-center ${activeTab === 'summary' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}> <ClipboardList size={18} className="mr-2" /> Summary </button>
                <button onClick={() => setActiveTab('property')} className={`whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm sm:text-base flex items-center ${activeTab === 'property' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}> <Building size={18} className="mr-2" /> Property </button>
                <button onClick={() => setActiveTab('activities')} className={`whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm sm:text-base flex items-center ${activeTab === 'activities' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}> <Activity size={18} className="mr-2" /> Activities </button>
                <button onClick={() => setActiveTab('flights')} className={`whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm sm:text-base flex items-center ${activeTab === 'flights' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}> <Plane size={18} className="mr-2" /> Flights </button>
                <button onClick={() => setActiveTab('transportation')} className={`whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm sm:text-base flex items-center ${activeTab === 'transportation' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}> <Car size={18} className="mr-2" /> Transportation </button>
            </nav>
        </div>

        {activeTab === 'summary' && (
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 font-sans border border-gray-100 text-left">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Your Selection Summary</h2>
              {!hasSelections ? (
                <p className="text-gray-500 text-center py-10 text-lg">You haven't made any selections yet. Click on the other tabs to view your options!</p>
              ) : (
                <div className="space-y-8">
                  {selectedProperties.length > 0 && (
                    <div onClick={() => setActiveTab('property')} className="cursor-pointer group">
                      <h3 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-3 text-gray-700 group-hover:text-yellow-500 transition-colors"><Building /> Properties</h3>
                      <div className="space-y-4">
                        {selectedProperties.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg shadow-sm border group-hover:border-yellow-400 transition-colors">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <img src={item.images?.[item.homeImageIndex || 0] || "https://placehold.co/80x80/E0E0E0/333333?text=No+Image"} alt={item.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover shadow-sm"/>
                              <div>
                                <p className="font-bold text-gray-800 text-sm sm:text-base">{item.name}</p>
                                <p className="text-xs sm:text-sm text-gray-600">{item.location}</p>
                              </div>
                            </div>
                            <p className="font-bold text-base sm:text-lg" style={{color: getPriceColor(item.price)}}>{`${item.price >= 0 ? '+' : '-'}${getCurrencySymbol(item.currency)}${Math.abs(item.price).toFixed(2)}`}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedFlights.length > 0 && (
                    <div onClick={() => setActiveTab('flights')} className="cursor-pointer group">
                      <h3 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-3 text-gray-700 group-hover:text-yellow-500 transition-colors"><Plane /> Flights</h3>
                      <div className="space-y-4">
                        {selectedFlights.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg shadow-sm border group-hover:border-yellow-400 transition-colors">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <img src={item.airlineLogoUrl || 'https://placehold.co/100x30/E0E0E0/333333?text=Logo'} alt={item.airline} className="h-8 sm:h-10 object-contain"/>
                              <div>
                                <p className="font-bold text-gray-800 text-sm sm:text-base">{item.airline} ({item.flightNumber})</p>
                                <p className="text-xs sm:text-sm text-gray-600">{item.from} to {item.to}</p>
                              </div>
                            </div>
                            <p className="font-bold text-base sm:text-lg" style={{color: getPriceColor(calculateFinalFlightPrice(item))}}>{`${calculateFinalFlightPrice(item) >= 0 ? '+' : '-'}${getCurrencySymbol(item.currency)}${Math.abs(calculateFinalFlightPrice(item)).toFixed(2)}`}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedActivities.length > 0 && (
                    <div onClick={() => setActiveTab('activities')} className="cursor-pointer group">
                      <h3 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-3 text-gray-700 group-hover:text-yellow-500 transition-colors"><Activity /> Activities</h3>
                      <div className="space-y-4">
                        {selectedActivities.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg shadow-sm border group-hover:border-yellow-400 transition-colors">
                            <div className="flex items-center gap-4">
                              <img src={item.images?.[0] || "https://placehold.co/80x80/E0E0E0/333333?text=No+Image"} alt={item.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover shadow-sm"/>
                              <div>
                                <p className="font-bold text-gray-800 text-sm sm:text-base">{item.name}</p>
                                <p className="text-xs sm:text-sm text-gray-600">{item.location}</p>
                              </div>
                            </div>
                            <p className="font-bold text-base sm:text-lg" style={{color: getPriceColor(calculateFinalActivityPrice(item))}}>{`${calculateFinalActivityPrice(item) >= 0 ? '+' : '-'}${getCurrencySymbol(item.currency)}${Math.abs(calculateFinalActivityPrice(item)).toFixed(2)}`}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedTransportation.length > 0 && (
                    <div onClick={() => setActiveTab('transportation')} className="cursor-pointer group">
                      <h3 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-3 text-gray-700 group-hover:text-yellow-500 transition-colors"><Car /> Transportation</h3>
                      <div className="space-y-4">
                        {selectedTransportation.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg shadow-sm border group-hover:border-yellow-400 transition-colors">
                            <div className="flex items-center gap-4">
                              <img src={item.images?.[0] || "https://placehold.co/80x80/E0E0E0/333333?text=No+Image"} alt={item.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover shadow-sm"/>
                              <div>
                                <p className="font-bold text-gray-800 text-sm sm:text-base">{item.name}</p>
                                <p className="text-xs sm:text-sm text-gray-600 capitalize">{item.transportType}</p>
                              </div>
                            </div>
                            <p className="font-bold text-base sm:text-lg" style={{color: getPriceColor(item.price)}}>{`${item.price >= 0 ? '+' : '-'}${getCurrencySymbol(item.currency)}${Math.abs(item.price).toFixed(2)}`}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
        )}

        {activeTab === 'property' && (
            <div className="space-y-10">
              {itineraries.filter(it => it.properties.length > 0).map((itinerary) => {
                const isCollapsed = collapsedSections[itinerary.id];
                return (
                  <div key={itinerary.id} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div 
                      className={`p-4 sm:p-5 border-b cursor-pointer transition-colors duration-300 ${isCollapsed ? 'bg-gray-50 hover:bg-gray-100' : 'bg-yellow-100'}`}
                      onClick={() => toggleSection(itinerary.id)}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div className="mb-2 md:mb-0">
                          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-left flex items-center">
                            {itinerary.location}
                            {isCollapsed ? <ChevronDown className="ml-2" size={20} /> : <ChevronUp className="ml-2" size={20} />}
                          </h2>
                          <p className="text-sm text-gray-600"> <Calendar size={14} className="inline mr-1 text-gray-500" /> {itinerary.checkIn && itinerary.checkOut ? `${formatDate(itinerary.checkIn)} - ${formatDate(itinerary.checkOut)} · ${calculateNights(itinerary.checkIn, itinerary.checkOut)} nights` : 'Dates N/A'} </p>
                        </div>
                        <div className="text-left md:text-right mt-2 md:mt-0">
                          <p className="text-sm text-gray-600">Selected Property:</p>
                          <p className="font-semibold text-gray-900 text-base">{getSelectedProperty(itinerary.id)?.name || 'None'}</p>
                        </div>
                      </div>
                    </div>
                    {!isCollapsed && (
                      <div className="p-4 sm:p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {(itinerary.properties || []).length === 0 ? ( <div className="col-span-full text-center py-8 text-gray-500"><p>No properties for this itinerary.</p></div> ) : (
                            itinerary.properties.map((property) => {
                              const priceValue = parseCurrencyToNumber(property.price);
                              const priceColorStyle = { color: getPriceColor(priceValue) };
                              const imageStyle = {
                                transform: `translateX(${swipeTranslate[property.id] || 0}px)`,
                                transition: swipeTranslate[property.id] === 0 ? 'transform 0.3s ease-out' : 'none',
                              };
                              return (
                                <div key={property.id} className={`relative group bg-white rounded-xl shadow-lg border-2 overflow-hidden transform hover:scale-102 transition-all duration-300 cursor-pointer ${property.selected ? 'selected-border' : 'border-gray-200'}`} onClick={() => toggleSelection(itinerary.id, property.id)}>
                                  <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl" onTouchStart={handleTouchStart} onTouchMove={(e) => handleTouchMove(e, property.id)} onTouchEnd={() => handleTouchEnd(property.id)}>
                                    <img src={property.images?.[currentImageIndex[property.id] || property.homeImageIndex || 0] || "https://placehold.co/800x600/E0E0E0/333333?text=No+Image"} alt={property.name} className="w-full h-full object-cover group-hover:scale-105" style={imageStyle} onError={(e) => { e.target.src = "https://placehold.co/800x600/E0E0E0/333333?text=Image+Error"; }}/>
                                    {property.selected && <div className="absolute top-3 left-3 rounded-full p-2 shadow-md" style={{ backgroundColor: accentColor, color: '#333' }}><Check size={16} /></div>}
                                    {property.images && property.images.length > 1 && (
                                      <>
                                        <button onClick={(e) => { e.stopPropagation(); prevImage(property.id); }} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity opacity-0 group-hover:opacity-100"><ChevronLeft size={20} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); nextImage(property.id); }} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity opacity-0 group-hover:opacity-100"><ChevronRight size={20} /></button>
                                      </>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); openExpandedImage(property.id, currentImageIndex[property.id] || property.homeImageIndex || 0); }} className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity opacity-0 group-hover:opacity-100" title="Expand Image"><Maximize2 size={16} /></button>
                                  </div>
                                  <div className="p-4 space-y-2">
                                    <h3 className="font-semibold text-lg text-gray-900 leading-tight">{property.name}</h3>
                                    <p className="text-gray-600 text-sm mb-3 min-h-[40px]">{property.description}</p>
                                    <div className="flex items-center text-sm text-gray-600 gap-3">
                                      {(property.bedrooms > 0) && <div className="flex items-center"><BedDouble size={16} className="mr-1 text-gray-500" /><span>{property.bedrooms} Bed{property.bedrooms > 1 ? 's' : ''}</span></div>}
                                      {property.bathrooms > 0 && <div className="flex items-center"><Bath size={16} className="mr-1 text-gray-500" /><span>{property.bathrooms} Bath{property.bathrooms > 1 ? 's' : ''}</span></div>}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-base text-gray-700 font-medium">{calculateNights(property.checkIn, property.checkOut)} nights</span>
                                        <div className="text-right"> <span className="font-bold text-xl" style={priceColorStyle}>{`${priceValue < 0 ? '-' : '+'}${getCurrencySymbol(property.currency)}${Math.abs(priceValue).toFixed(2)}`}</span> </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {itineraries.filter(it => it.properties.length > 0).length === 0 && <PlaceholderContent title="Properties" />}
            </div>
        )}

        {activeTab === 'activities' && (
            <div className="space-y-10">
                {sortedActivityGroups.map(({ location, activities: activitiesInLocation }) => (
                    <div key={location} className="p-4 sm:p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">{location} Activities</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activitiesInLocation.map(activity => {
                                const finalPrice = calculateFinalActivityPrice(activity);
                                const priceColorStyle = { color: getPriceColor(finalPrice) };
                                return (
                                    <div key={activity.id} className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-300 cursor-pointer group overflow-hidden ${activity.selected ? 'selected-activity-card' : 'border-gray-200'}`} onClick={() => toggleActivitySelection(activity.id)}>
                                        <div className="relative aspect-video">
                                            {activity.images && activity.images.length > 0 ? ( <img src={activity.images[0]} alt={activity.name} className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://placehold.co/800x450/E0E0E0/333333?text=Image+Error"; }}/> ) : ( <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400"> <Image size={40} /> </div> )}
                                            {activity.selected && ( <div className="absolute top-3 left-3 bg-white rounded-full p-1 shadow-lg"> <Check size={24} className="text-green-500" /> </div> )}
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
                                            <div className="mt-4 text-right"> <span className="text-2xl font-bold" style={priceColorStyle}> {`${finalPrice < 0 ? `-` : `+`}${getCurrencySymbol(activity.currency)}${Math.abs(finalPrice).toFixed(2)}`} </span> </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
                {sortedActivityGroups.length === 0 && <PlaceholderContent title="Activities" />}
            </div>
        )}

        {activeTab === 'transportation' && (
            <div className="space-y-10">
                {sortedTransportation.length === 0 ? ( <PlaceholderContent title="Transportation" /> ) : (
                    <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3"><Car /> All Transportation</h3>
                        <div className="space-y-6">
                            {sortedTransportation.map(item => {
                                const price = parseCurrencyToNumber(item.price);
                                const priceColorStyle = { color: getPriceColor(price) };
                                return (
                                    <div key={item.id} className={`relative p-4 sm:p-6 rounded-lg border-2 transition-all duration-300 cursor-pointer flex flex-col lg:flex-row items-start lg:items-center gap-6 w-full ${item.selected ? 'selected-transport-row' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`} onClick={() => toggleTransportationSelection(item.id)}>
                                        {item.selected && (
                                            <div className="absolute top-4 left-4 rounded-full p-2 shadow-md z-10" style={{ backgroundColor: accentColor, color: '#333' }}>
                                                <Check size={18} />
                                            </div>
                                        )}
                                        <img src={item.images?.[0] || 'https://placehold.co/200x120/E0E0E0/333333?text=No+Image'} alt={item.name} className="w-full lg:w-48 h-auto object-cover rounded-md shadow-md flex-shrink-0" />
                                        <div className="flex-grow">
                                            <h4 className="font-bold text-lg sm:text-xl text-gray-800">{item.name}</h4>
                                            <p className="text-md text-gray-500 mb-4">{item.type || item.carType}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-700">
                                                <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-500" /> <strong>Pickup:</strong> &nbsp;{item.pickupLocation || item.boardingFrom || item.pickupFrom} ({item.location})</div>
                                                <div className="flex items-center"><Calendar size={14} className="mr-2 text-gray-500" /> <strong>On:</strong> &nbsp;{formatDate(item.pickupDate || item.boardingDate)} at {formatTime(item.pickupTime || item.boardingTime)}</div>
                                                <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-500" /> <strong>Drop-off:</strong> &nbsp;{item.dropoffLocation || item.departingTo || item.dropoffTo}</div>
                                                { (item.dropoffDate || item.departingDate) && <div className="flex items-center"><Calendar size={14} className="mr-2 text-gray-500" /> <strong>On:</strong> &nbsp;{formatDate(item.dropoffDate || item.departingDate)} at {formatTime(item.dropoffTime || item.departingTime)}</div>}
                                                {item.transportType === 'car' && <div className="flex items-center"><ShieldCheck size={14} className="mr-2 text-gray-500" /> <strong>Insurance:</strong> &nbsp;{item.insurance} (Excess: {getCurrencySymbol(item.currency)}{item.excessAmount || '0'})</div>}
                                                {item.transportType === 'car' && <div className="flex items-center"><Users size={14} className="mr-2 text-gray-500" /> <strong>Drivers:</strong> &nbsp;{item.driversIncluded}</div>}
                                                {(item.transportType === 'ferry' || item.transportType === 'bus') && <div className="flex items-center"><strong>Duration:</strong> &nbsp;{item.duration}</div>}
                                                {(item.transportType === 'ferry' || item.transportType === 'bus') && <div className="flex items-center"><strong>Baggage:</strong> &nbsp;{item.baggageAllowance}</div>}
                                                {item.transportType === 'driver' && <div className="flex items-center"><strong>Duration:</strong> &nbsp;{item.duration}</div>}
                                            </div>
                                        </div>
                                        <div className="w-full lg:w-auto text-right mt-4 lg:mt-0 lg:ml-auto flex-shrink-0">
                                            <span className="text-2xl sm:text-3xl font-bold whitespace-nowrap" style={priceColorStyle}>
                                                {`${price < 0 ? '-' : '+'}${getCurrencySymbol(item.currency)}${Math.abs(price).toFixed(2)}`}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'flights' && (
            <div className="space-y-12">
                {Object.keys(groupedFlights).every(key => groupedFlights[key].length === 0) ? ( <PlaceholderContent title="Flights" /> ) : (
                    Object.entries(groupedFlights).map(([type, itemsInType]) => {
                        if (itemsInType.length === 0) return null;
                        const typeInfo = flightTypes[type] || { label: type, icon: <Plane /> };
                        return (
                            <div key={type} className="p-4 sm:p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">{typeInfo.icon} {typeInfo.label}</h3>
                                <div className="space-y-4">
                                    {itemsInType.map(item => {
                                        const currentPrice = calculateFinalFlightPrice(item);
                                        const priceColorStyle = { color: getPriceColor(currentPrice) };
                                        const duration = calculateDuration(item.departureDate, item.departureTime, item.arrivalDate, item.arrivalTime);
                                        return (
                                            <div 
                                                key={item.id} 
                                                className={`relative p-4 sm:p-6 rounded-lg border-2 transition-all duration-300 cursor-pointer w-full ${item.selected ? 'selected-flight-row' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}
                                                onClick={() => toggleFlightSelection(item.id)}
                                            >
                                                <div className="flex flex-col w-full">
                                                    <div className="flex flex-col sm:flex-row justify-between items-center w-full">
                                                        {item.selected && (
                                                            <div className="absolute top-1/2 -translate-y-1/2 left-4 sm:left-6 rounded-full p-1 shadow-md bg-white z-10">
                                                                <CheckCircle size={24} className="text-green-500" />
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-4 sm:gap-6 flex-1 pl-10 sm:pl-12">
                                                            <img src={item.airlineLogoUrl || 'https://placehold.co/140x50/E0E0E0/333333?text=Logo'} alt={`${item.airline} logo`} className="h-12 sm:h-16 w-auto object-contain"/>
                                                            <div className="text-sm">
                                                                <p className="font-bold text-gray-800 text-base sm:text-lg">{item.airline}</p>
                                                                <p className="text-gray-500">{item.flightNumber}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-center flex-grow-[2] text-center my-4 sm:my-0">
                                                            <div className="text-right">
                                                                <p className="text-2xl sm:text-3xl font-bold">{formatTime(item.departureTime)}</p>
                                                                <p className="text-lg sm:text-xl font-semibold text-gray-700">{item.from}</p>
                                                                <p className="text-xs text-gray-500">{formatDate(item.departureDate)}</p>
                                                            </div>
                                                            <div className="mx-4 sm:mx-8 text-center">
                                                                <p className="text-sm text-gray-500">{duration}</p>
                                                                <div className="w-20 sm:w-32 h-px bg-gray-300 relative my-1">
                                                                    <Plane size={16} className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gray-50 px-1 text-gray-500"/>
                                                                </div>
                                                                <p className="text-xs text-green-600 font-semibold">Direct</p>
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-2xl sm:text-3xl font-bold">{formatTime(item.arrivalTime)}</p>
                                                                <p className="text-lg sm:text-xl font-semibold text-gray-700">{item.to}</p>
                                                                <p className="text-xs text-gray-500">{formatDate(item.arrivalDate)}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-end flex-1 gap-6">
                                                            <div className="text-right">
                                                                <span className="text-2xl sm:text-3xl font-bold whitespace-nowrap" style={priceColorStyle}>
                                                                    {`${currentPrice < 0 ? '-' : '+'}${getCurrencySymbol(item.currency)}${Math.abs(currentPrice).toFixed(2)}`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="w-full mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-8 text-sm text-gray-600">
                                                        <p className="font-semibold text-gray-500">Baggage Allowance:</p>
                                                        <div className="flex items-center"><Briefcase size={14} className="mr-2 text-gray-500" /> Check-in: {item.baggage.checkInKgs}kg ({item.baggage.checkInPieces} pc)</div>
                                                        <div className="flex items-center"><Briefcase size={14} className="mr-2 text-gray-500" /> Cabin: {item.baggage.cabinKgs}kg ({item.baggage.cabinPieces} pc)</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        )}

        <div className="mt-6 mb-12">
          <button onClick={handleSaveSelection} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" disabled={loading}>{loading ? 'Saving...' : 'Confirm My Selections'}</button>
        </div>
      </div>
    </div>
  );
};

export default ClientView;
