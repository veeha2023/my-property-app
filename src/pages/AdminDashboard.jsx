// src/pages/AdminDashboard.jsx - Version 7.31 (Dynamic Currency Fix)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient.js';
import PropertyForm from '../components/PropertyForm.jsx';
import ActivityForm from '../components/ActivityForm.jsx';
import TransportationForm from '../components/TransportationForm.jsx';
import FlightForm from '../components/FlightForm.jsx';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Edit, Trash2, Eye, ExternalLink, ChevronLeft, ChevronRight, X, MapPin, Share2, Building, Activity, Plane, Car, ClipboardList, Calendar, Ship, Bus, Briefcase, Copy } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';

const AdminSummaryView = ({ clientData, setActiveTab, currency }) => {
    const getCurrencySymbol = (currencyCode) => {
        const symbols = { NZD: 'NZ$', USD: '$', EUR: '€', INR: '₹' };
        return symbols[currencyCode] || currencyCode || 'NZ$';
    };

    const getPriceColor = (price) => {
        if (price < 0) return 'text-green-600';
        if (price > 0) return 'text-red-600';
        return 'text-gray-900';
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

    const selectedProperties = useMemo(() => clientData?.properties?.filter(p => p.selected && !p.isPlaceholder) || [], [clientData]);
    const selectedActivities = useMemo(() => clientData?.activities?.filter(a => a.selected) || [], [clientData]);
    const selectedTransportation = useMemo(() => clientData?.transportation?.filter(t => t.selected) || [], [clientData]);
    const selectedFlights = useMemo(() => clientData?.flights?.filter(f => f.selected) || [], [clientData]);

    const hasSelections = selectedProperties.length > 0 || selectedActivities.length > 0 || selectedTransportation.length > 0 || selectedFlights.length > 0;

    const totalChange = useMemo(() => {
        let total = 0;
        total += selectedProperties.reduce((sum, prop) => sum + (prop.price || 0), 0);
        total += (clientData?.activities || []).reduce((sum, act) => sum + calculateFinalActivityPrice(act), 0);
        total += selectedTransportation.reduce((sum, item) => sum + (item.price || 0), 0);
        total += (clientData?.flights || []).reduce((sum, item) => sum + calculateFinalFlightPrice(item), 0);
        return total;
    }, [clientData, selectedProperties, selectedTransportation, calculateFinalActivityPrice, calculateFinalFlightPrice]);

    const baseQuote = useMemo(() => clientData?.quote || 0, [clientData]);
    const finalQuote = baseQuote + totalChange;
    const currencySymbol = getCurrencySymbol(currency);

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">Client Selection Summary</h2>
                <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
                    <div className="text-center p-3 rounded-lg bg-gray-100">
                        <p className="text-xs text-gray-600">Base Quote</p>
                        <p className="text-2xl font-bold text-gray-800">{currencySymbol}{baseQuote.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-100">
                        <p className="text-xs text-gray-600">Selections</p>
                        <p className={`text-2xl font-bold ${getPriceColor(totalChange)}`}>{totalChange >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(totalChange).toFixed(2)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-100 border border-blue-200">
                        <p className="text-xs text-blue-800">Final Quote</p>
                        <p className="text-2xl font-bold text-blue-800">{currencySymbol}{finalQuote.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {!hasSelections ? (
                <p className="text-gray-500 text-center py-10 text-lg">The client has not made any selections yet.</p>
            ) : (
                <div className="space-y-8">
                    {selectedProperties.length > 0 && (
                        <div onClick={() => setActiveTab('property')} className="cursor-pointer group">
                            <h3 className="text-2xl font-semibold mb-4 flex items-center gap-3 text-gray-700 group-hover:text-yellow-500 transition-colors"><Building /> Properties</h3>
                            <div className="space-y-4">
                                {selectedProperties.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm border group-hover:border-yellow-400 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <img src={item.images?.[item.homeImageIndex || 0] || "https://placehold.co/80x80/E0E0E0/333333?text=No+Image"} alt={item.name} className="w-20 h-20 rounded-lg object-cover shadow-sm"/>
                                            <div>
                                                <p className="font-bold text-gray-800">{item.name}</p>
                                                <p className="text-sm text-gray-600">{item.location}</p>
                                            </div>
                                        </div>
                                        <p className={`font-bold text-lg ${getPriceColor(item.price)}`}>{`${item.price >= 0 ? '+' : '-'}${getCurrencySymbol(item.currency)}${Math.abs(item.price).toFixed(2)}`}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {selectedFlights.length > 0 && (
                        <div onClick={() => setActiveTab('flights')} className="cursor-pointer group">
                            <h3 className="text-2xl font-semibold mb-4 flex items-center gap-3 text-gray-700 group-hover:text-yellow-500 transition-colors"><Plane /> Flights</h3>
                            <div className="space-y-4">
                                {selectedFlights.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm border group-hover:border-yellow-400 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <img src={item.airlineLogoUrl || 'https://placehold.co/100x30/E0E0E0/333333?text=Logo'} alt={item.airline} className="h-10 object-contain"/>
                                            <div>
                                                <p className="font-bold text-gray-800">{item.airline} ({item.flightNumber})</p>
                                                <p className="text-sm text-gray-600">{item.from} to {item.to}</p>
                                            </div>
                                        </div>
                                        <p className={`font-bold text-lg ${getPriceColor(calculateFinalFlightPrice(item))}`}>{`${calculateFinalFlightPrice(item) >= 0 ? '+' : '-'}${getCurrencySymbol(item.currency)}${Math.abs(calculateFinalFlightPrice(item)).toFixed(2)}`}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {selectedActivities.length > 0 && (
                        <div onClick={() => setActiveTab('activities')} className="cursor-pointer group">
                            <h3 className="text-2xl font-semibold mb-4 flex items-center gap-3 text-gray-700 group-hover:text-yellow-500 transition-colors"><Activity /> Activities</h3>
                            <div className="space-y-4">
                                {selectedActivities.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm border group-hover:border-yellow-400 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <img src={item.images?.[0] || "https://placehold.co/80x80/E0E0E0/333333?text=No+Image"} alt={item.name} className="w-20 h-20 rounded-lg object-cover shadow-sm"/>
                                            <div>
                                                <p className="font-bold text-gray-800">{item.name}</p>
                                                <p className="text-sm text-gray-600">{item.location}</p>
                                            </div>
                                        </div>
                                        <p className={`font-bold text-lg ${getPriceColor(calculateFinalActivityPrice(item))}`}>{`${calculateFinalActivityPrice(item) >= 0 ? '+' : '-'}${getCurrencySymbol(item.currency)}${Math.abs(calculateFinalActivityPrice(item)).toFixed(2)}`}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {selectedTransportation.length > 0 && (
                        <div onClick={() => setActiveTab('transportation')} className="cursor-pointer group">
                            <h3 className="text-2xl font-semibold mb-4 flex items-center gap-3 text-gray-700 group-hover:text-yellow-500 transition-colors"><Car /> Transportation</h3>
                            <div className="space-y-4">
                                {selectedTransportation.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm border group-hover:border-yellow-400 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <img src={item.images?.[0] || "https://placehold.co/80x80/E0E0E0/333333?text=No+Image"} alt={item.name} className="w-20 h-20 rounded-lg object-cover shadow-sm"/>
                                            <div>
                                                <p className="font-bold text-gray-800">{item.name}</p>
                                                <p className="text-sm text-gray-600 capitalize">{item.transportType}</p>
                                            </div>
                                        </div>
                                        <p className={`font-bold text-lg ${getPriceColor(item.price)}`}>{`${item.price >= 0 ? '+' : '-'}${getCurrencySymbol(item.currency)}${Math.abs(item.price).toFixed(2)}`}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              )}
        </div>
    );
};

const AdminDashboard = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [editingClientName, setEditingClientName] = useState('');
  const [editingClientQuote, setEditingClientQuote] = useState(0);
  const [editingClientCurrency, setEditingClientCurrency] = useState('NZD');
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [globalLogoUrl, setGlobalLogoUrl] = useState(null);
  const [newGlobalLogoFile, setNewGlobalLogoFile] = useState(null);
  const [companyName, setCompanyName] = useState('Veeha Travels');
  const [activeTab, setActiveTab] = useState('clients');
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [showItineraryListModal, setShowItineraryListModal] = useState(false);
  const [newItinerary, setNewItinerary] = useState({ location: '', checkIn: '', checkOut: '' });
  const [activeClientTab, setActiveClientTab] = useState('summary');
  const [clientData, setClientData] = useState(null);
  const [editingItineraryLeg, setEditingItineraryLeg] = useState(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [itineraryToDelete, setItineraryToDelete] = useState(null);
  const [originalEditingLegLocation, setOriginalEditingLegLocation] = useState('');
  const [originalEditingLegCheckIn, setOriginalEditingLegCheckIn] = useState('');
  const [originalEditingLegCheckOut, setOriginalEditingLegCheckOut] = useState('');
  const GLOBAL_SETTINGS_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  useEffect(() => {
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setLoading(false);
        if (!session) {
            navigate('/login');
        }
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (!session) {
            navigate('/login');
        }
    });

    return () => authListener.subscription.unsubscribe();
  }, [navigate]);

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, 'dd MMM yy');
    } catch (e) {
      return 'Error';
    }
  };

  const sortPropertiesByDate = (properties) => {
    if (!properties || !Array.isArray(properties)) return [];
    return [...properties].sort((a, b) => {
      const dateA = new Date(a.checkIn);
      const dateB = new Date(b.checkIn);
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateA - dateB;
    });
  };

  const sortActivitiesByDateTime = (activities) => {
    if (!activities || !Array.isArray(activities)) return [];
    return [...activities].sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time || '00:00'}`);
      const dateTimeB = new Date(`${b.date}T${b.time || '00:00'}`);
      if (isNaN(dateTimeA.getTime())) return 1;
      if (isNaN(dateTimeB.getTime())) return -1;
      return dateTimeA.getTime() - dateTimeB.getTime();
    });
  };

  const sortTransportationByDate = (transportation) => {
    if (!transportation || !Array.isArray(transportation)) return [];
    return [...transportation].sort((a, b) => {
        const dateA = new Date(a.pickupDate || a.boardingDate);
        const dateB = new Date(b.pickupDate || b.boardingDate);
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateA - dateB;
    });
  };

  const sortFlightsByDate = (flights) => {
    if (!flights || !Array.isArray(flights)) return [];
    return [...flights].sort((a, b) => {
        const dateA = new Date(a.departureDate);
        const dateB = new Date(b.departureDate);
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateA - dateB;
    });
  };

  const initializeClientData = (clientPropertiesData) => {
    const baseData = {
      properties: [],
      activities: [],
      flights: [],
      transportation: [],
      quote: 0,
      currency: 'NZD',
    };

    const data = typeof clientPropertiesData === 'object' && clientPropertiesData !== null ? clientPropertiesData : {};
    const existingProperties = Array.isArray(data.properties) ? data.properties : [];
    const existingActivities = (data.activities || []).map(a => ({ ...a, price_if_selected: parseFloat(a.price_if_selected) || 0, price_if_not_selected: parseFloat(a.price_if_not_selected) || 0 }));
    const existingTransportation = Array.isArray(data.transportation) ? data.transportation : [];
    const existingFlights = (data.flights || []).map(f => ({ ...f, price_if_selected: parseFloat(f.price_if_selected) || 0, price_if_not_selected: parseFloat(f.price_if_not_selected) || 0 }));

    const allLocations = new Set();
    existingProperties.forEach(p => { if (p.location) allLocations.add(p.location.trim()); });
    existingActivities.forEach(a => { if (a.location) allLocations.add(a.location.trim()); });
    existingTransportation.forEach(t => { 
        if (t.pickupLocation) allLocations.add(t.pickupLocation.trim());
        if (t.boardingFrom) allLocations.add(t.boardingFrom.trim());
    });


    const placeholderMap = new Map();
    existingProperties.filter(p => p.isPlaceholder).forEach(p => { if (p.location) placeholderMap.set(p.location.trim(), p); });

    const generatedPlaceholders = Array.from(allLocations).map(location => {
      const existingPlaceholder = placeholderMap.get(location);
      if (existingPlaceholder) return existingPlaceholder;
      
      const relatedProperty = existingProperties.find(p => p.location?.trim() === location && !p.isPlaceholder);
      const relatedActivity = existingActivities.find(a => a.location?.trim() === location);
      const relatedTransportation = existingTransportation.find(t => (t.pickupLocation?.trim() === location || t.boardingFrom?.trim() === location));
      
      return {
        id: `itinerary-placeholder-${Date.now()}-${location.replace(/\s/g, '')}`,
        name: 'Itinerary Placeholder',
        location: location,
        checkIn: relatedProperty?.checkIn || relatedActivity?.date || relatedTransportation?.pickupDate || relatedTransportation?.boardingDate || '',
        checkOut: relatedProperty?.checkOut || relatedActivity?.date || relatedTransportation?.dropoffDate || relatedTransportation?.departingDate || '',
        price: 0, currency: 'NZD', images: [], bedrooms: 0, bathrooms: 0, selected: false, isPlaceholder: true,
      };
    });

    const finalProperties = [...existingProperties.filter(p => !p.isPlaceholder), ...generatedPlaceholders];

    return {
      ...baseData,
      ...data,
      properties: sortPropertiesByDate(finalProperties),
      activities: sortActivitiesByDateTime(existingActivities),
      transportation: sortTransportationByDate(existingTransportation),
      flights: sortFlightsByDate(existingFlights),
      quote: data.quote || 0,
      currency: data.currency || 'NZD',
    };
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    let parsedClientProperties = null;
    try {
      if (typeof client.client_properties === 'string') {
        parsedClientProperties = JSON.parse(client.client_properties);
      } else {
        parsedClientProperties = client.client_properties;
      }
    } catch (e) {
      console.error("Error parsing client_properties:", e);
      parsedClientProperties = null;
    }
    
    const fullClientData = initializeClientData(parsedClientProperties);
    setClientData(fullClientData);

    setEditingClientName(client.client_name);
    setEditingClientQuote(fullClientData.quote);
    setEditingClientCurrency(fullClientData.currency);
    setActiveClientTab('summary');
    setMessage(`Editing details for ${client.client_name}`);
    setError(null);
  };

  const handleSaveClientData = async () => {
    if (!selectedClient || !clientData) {
      setMessage('No client selected to save data.');
      return;
    }
    setLoading(true);
    setMessage('');
    setError(null);

    const dataToSave = {
        ...clientData,
        properties: sortPropertiesByDate(clientData.properties),
        activities: sortActivitiesByDateTime(clientData.activities),
        transportation: sortTransportationByDate(clientData.transportation),
        flights: sortFlightsByDate(clientData.flights),
    };
    const dataJson = JSON.stringify(dataToSave);

    console.log("Saving client data:", dataToSave);

    const { error: updateError } = await supabase
      .from('clients')
      .update({ client_properties: dataJson, last_updated: new Date().toISOString() })
      .eq('id', selectedClient.id);

    if (updateError) {
      console.error('Error saving client data:', updateError.message);
      setError('Error saving client data: ' + updateError.message);
    } else {
      setMessage('Client data saved successfully!');
      fetchClients(); 
    }
    setLoading(false);
  };

  const handleUpdateProperties = (updatedProperties) => {
    setClientData(prevData => ({ ...prevData, properties: updatedProperties }));
  };

  const handleUpdateActivities = (updatedActivities) => {
    setClientData(prevData => ({ ...prevData, activities: updatedActivities }));
  };
  
  const handleUpdateTransportation = (updatedTransportation) => {
    setClientData(prevData => ({ ...prevData, transportation: updatedTransportation }));
  };

  const handleUpdateFlights = (updatedFlights) => {
    setClientData(prevData => ({ ...prevData, flights: updatedFlights }));
  };

  const handleSaveItinerary = async () => {
      if (!selectedClient || !newItinerary.location || !newItinerary.checkIn || !newItinerary.checkOut) {
          setError("Please fill in all itinerary fields.");
          return;
      }

      const placeholderProperty = {
          id: `itinerary-placeholder-${Date.now()}`,
          name: 'Itinerary Placeholder',
          location: newItinerary.location.trim(),
          checkIn: newItinerary.checkIn,
          checkOut: newItinerary.checkOut,
          price: 0, currency: 'NZD', images: [], bedrooms: 0, bathrooms: 0, selected: false, isPlaceholder: true,
      };
      
      const updatedProperties = [...(clientData?.properties || []), placeholderProperty];
      setClientData(prevData => ({ ...prevData, properties: updatedProperties }));

      setShowItineraryModal(false);
      setNewItinerary({ location: '', checkIn: '', checkOut: '' });
      setMessage('Itinerary added. Remember to click "Save All Client Changes" to persist.');
      setError(null);
      await handleSaveClientData();
  };

  const handleEditItineraryLeg = (leg) => {
    setEditingItineraryLeg({ ...leg });
    setOriginalEditingLegLocation(leg.location.trim());
    setOriginalEditingLegCheckIn(leg.checkIn);
    setOriginalEditingLegCheckOut(leg.checkOut);
    setShowItineraryListModal(false);
    setShowItineraryModal(true);
  };

  const handleUpdateEditedItinerary = async () => {
    if (!selectedClient || !editingItineraryLeg) return;
    if (!editingItineraryLeg.location || !editingItineraryLeg.checkIn || !editingItineraryLeg.checkOut) {
        setError("Please fill in all itinerary fields.");
        return;
    }

    setLoading(true);
    setMessage('');
    setError(null);

    try {
        const newLocation = editingItineraryLeg.location.trim();
        const newCheckIn = editingItineraryLeg.checkIn;
        const newCheckOut = editingItineraryLeg.checkOut;

        const updatedPropertiesIncludingPlaceholder = clientData.properties.map(prop =>
            prop.id === editingItineraryLeg.id ? { ...editingItineraryLeg, location: newLocation, isPlaceholder: true } : prop
        );

        const updatedAssociatedProperties = updatedPropertiesIncludingPlaceholder.map(prop => {
            if (!prop.isPlaceholder && prop.location?.trim() === originalEditingLegLocation) {
                return { ...prop, location: newLocation, checkIn: newCheckIn, checkOut: newCheckOut };
            }
            return prop;
        });

        const updatedActivities = clientData.activities.map(act => {
            if (act.location?.trim() === originalEditingLegLocation) {
                return { ...act, location: newLocation, date: newCheckIn };
            }
            return act;
        });

        const updatedTransportation = clientData.transportation.map(t => {
            if (t.pickupLocation?.trim() === originalEditingLegLocation || t.boardingFrom?.trim() === originalEditingLegLocation) {
                return { ...t, pickupLocation: newLocation, boardingFrom: newLocation, pickupDate: newCheckIn, boardingDate: newCheckIn, dropoffDate: newCheckOut, departingDate: newCheckOut };
            }
            return t;
        });

        setClientData(prevData => ({
            ...prevData,
            properties: updatedAssociatedProperties,
            activities: updatedActivities,
            transportation: updatedTransportation,
        }));

        setEditingItineraryLeg(null);
        setOriginalEditingLegLocation('');
        setOriginalEditingLegCheckIn('');
        setOriginalEditingLegCheckOut('');
        setShowItineraryModal(false);
        setMessage('Itinerary updated. Remember to click "Save All Client Changes" to persist.');
        await handleSaveClientData();
    } catch (err) {
        console.error("Error updating itinerary leg:", err);
        setError("Error updating itinerary leg: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  const confirmDeleteItineraryLeg = (leg) => {
    setItineraryToDelete(leg);
    setShowConfirmDeleteModal(true);
  };

  const handleDeleteItineraryLeg = async () => {
    if (!itineraryToDelete || !selectedClient || !clientData) return;

    setLoading(true);
    setMessage('');
    setError(null);

    try {
        const legIdToDelete = itineraryToDelete.id;
        const legLocationToDelete = itineraryToDelete.location.trim();

        const updatedProperties = clientData.properties.filter(prop => prop.id !== legIdToDelete);
        const finalProperties = updatedProperties.filter(prop => prop.location?.trim() !== legLocationToDelete);
        const finalActivities = clientData.activities.filter(act => act.location?.trim() !== legLocationToDelete);
        const finalTransportation = clientData.transportation.filter(t => t.pickupLocation?.trim() !== legLocationToDelete && t.boardingFrom?.trim() !== legLocationToDelete);

        setClientData(prevData => ({
            ...prevData,
            properties: finalProperties,
            activities: finalActivities,
            transportation: finalTransportation,
        }));

        setShowConfirmDeleteModal(false);
        setShowItineraryListModal(false);
        setItineraryToDelete(null);
        setMessage('Itinerary leg and associated data deleted successfully! Remember to click "Save All Client Changes" to persist.');
        await handleSaveClientData();
    } catch (err) {
        console.error("Error deleting itinerary leg:", err);
        setError("Error deleting itinerary leg: " + err.message);
    } finally {
        setLoading(false);
    }
  };


  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!session) { setError("You must be logged in to add a client."); return; }
    if (!newClientName.trim()) { setError("Client name cannot be empty."); return; }
    setLoading(true);
    setMessage('');
    setError(null);

    const newClientId = uuidv4();
    const initialClientData = { properties: [], activities: [], flights: [], transportation: [], quote: 0, currency: 'NZD' };

    const { error: insertError } = await supabase
      .from('clients')
      .insert([{ id: newClientId, client_name: newClientName, client_properties: initialClientData, user_id: session.user.id, last_updated: new Date().toISOString() }])
      .select();

    if (insertError) {
      console.error('Error adding client:', insertError.message);
      setError('Error adding client: ' + insertError.message);
    } else {
      setMessage('Client added successfully!');
      setNewClientName('');
      setIsAddingClient(false);
      fetchClients();
    }
    setLoading(false);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const fetchGlobalSettings = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase.from('clients').select('client_name, custom_logo_url').eq('id', GLOBAL_SETTINGS_ID).single();
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      else if (data) { setCompanyName(data.client_name || 'Veeha Travels'); setGlobalLogoUrl(data.custom_logo_url || null); }
    } catch (err) { console.error("Unexpected error fetching global settings:", err.message); }
  }, []);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setClients(data || []);
    } catch (err) {
      console.error("Error fetching clients:", err.message);
      setError("Failed to load clients: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
        fetchClients();
        fetchGlobalSettings();
    }
  }, [session, fetchClients, fetchGlobalSettings]);

  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
        console.error('Error logging out:', signOutError.message);
        setError(signOutError.message);
    }
    setLoading(false);
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      setLoading(true);
      setMessage('');
      setError(null);
      const { error: deleteError } = await supabase.from('clients').delete().eq('id', clientId);
      if (deleteError) {
        console.error('Error deleting client:', deleteError.message);
        setError('Error deleting client: ' + deleteError.message);
      } else {
        setMessage('Client deleted successfully!');
        setSelectedClient(null);
        setClientData(null);
        fetchClients();
      }
      setLoading(false);
    }
  };

  const handleOpenEditClientModal = useCallback((client) => {
    setSelectedClient(client);
    setEditingClientName(client.client_name);
    const currentData = initializeClientData(client.client_properties);
    setEditingClientQuote(currentData.quote);
    setEditingClientCurrency(currentData.currency || 'NZD');
    if (client.share_token) {
        setShareLink(`${window.location.origin}/client/${client.id}?token=${client.share_token}`);
    } else {
        setShareLink('');
    }
    setShowEditClientModal(true);
  }, []);

  const handleUpdateClientDetails = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    setLoading(true);
    setMessage('');
    setError(null);
    try {
        const updatedClientData = {
            ...clientData,
            quote: parseFloat(editingClientQuote) || 0,
            currency: editingClientCurrency,
        };
        const { error: updateClientError } = await supabase
            .from('clients')
            .update({ 
                client_name: editingClientName, 
                client_properties: updatedClientData,
                last_updated: new Date().toISOString() 
            })
            .eq('id', selectedClient.id);

        if (updateClientError) throw updateClientError;
        
        setClientData(updatedClientData);
        setMessage('Client details updated successfully!');
        setShowEditClientModal(false);
        fetchClients();
    } catch (err) {
        console.error('Error updating client details:', err.message);
        setError('Error updating client details: ' + err.message);
    } finally { setLoading(false); }
  };
  
    const getOrGenerateShareLink = async (client) => {
        let { data: existingToken, error: fetchError } = await supabase
            .from('client_share_tokens')
            .select('token')
            .eq('client_id', client.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            setError(`Could not check for existing share link: ${fetchError.message}`);
            return null;
        }

        if (existingToken) {
            return `${window.location.origin}/client/${client.id}?token=${existingToken.token}`;
        }

        setLoading(true);
        try {
            const { data: token, error: rpcError } = await supabase.rpc('generate_client_share_token', { p_client_id: client.id });
            if (rpcError) throw rpcError;
            
            fetchClients(); 

            return `${window.location.origin}/client/${client.id}?token=${token}`;
        } catch (err) {
            setError(`Could not generate share link: ${err.message}`);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleModalGenerateLink = async () => {
        const link = await getOrGenerateShareLink(selectedClient);
        if (link) {
            setShareLink(link);
            setMessage('Share link is ready.');
        }
    };

    const handleViewClientPage = async (e, client) => {
        e.stopPropagation();
        const url = await getOrGenerateShareLink(client);
        if (url) {
            window.open(url, '_blank');
        }
    };

    const copyShareLink = () => {
        if (!shareLink) return;
        const el = document.createElement('textarea');
        el.value = shareLink;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setMessage('Share link copied to clipboard!');
    };

  const handleUpdateGlobalSettings = async (newCompanyName, newLogoFileFromInput = null) => {
    setLoading(true);
    setError(null);
    setMessage('');
    let logoData = globalLogoUrl;
    try {
      if (newLogoFileFromInput) { logoData = await fileToBase64(newLogoFileFromInput); }
      else if (newLogoFileFromInput === null && globalLogoUrl) { logoData = null; }
      const { error: upsertError } = await supabase.from('clients').upsert({ id: GLOBAL_SETTINGS_ID, client_name: newCompanyName, custom_logo_url: logoData, client_properties: {}, user_id: session.user.id, last_updated: new Date().toISOString() }, { onConflict: 'id' });
      if (upsertError) throw upsertError;
      setCompanyName(newCompanyName);
      setGlobalLogoUrl(logoData);
      setNewGlobalLogoFile(null);
      setMessage('Global settings updated successfully!');
      setShowSettingsModal(false);
    } catch (err) {
      console.error("Error updating global settings:", err.message);
      setError("Failed to update global settings: " + err.message);
    } finally { setLoading(false); }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans">
      {/* ... (all modals remain the same) */}

      {showEditClientModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative text-gray-800">
                <button onClick={() => setShowEditClientModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-800" aria-label="Close modal"><X size={24} /></button>
                <h2 className="text-2xl font-bold text-yellow-400 mb-6">Edit Client: {selectedClient.client_name}</h2>
                <form onSubmit={handleUpdateClientDetails} className="space-y-4">
                    <div>
                        <label htmlFor="editingClientName" className="block text-sm font-medium text-gray-800">Client Name</label>
                        <input type="text" id="editingClientName" value={editingClientName} onChange={(e) => setEditingClientName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:ring-yellow-400 focus:border-yellow-400" required />
                    </div>
                    <div>
                        <label htmlFor="editingClientQuote" className="block text-sm font-medium text-gray-800">Base Quote</label>
                        <input type="number" step="0.01" id="editingClientQuote" value={editingClientQuote} onChange={(e) => setEditingClientQuote(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:ring-yellow-400 focus:border-yellow-400" required />
                    </div>
                    <div>
                        <label htmlFor="editingClientCurrency" className="block text-sm font-medium text-gray-800">Currency</label>
                        <select
                            id="editingClientCurrency"
                            value={editingClientCurrency}
                            onChange={(e) => setEditingClientCurrency(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:ring-yellow-400 focus:border-yellow-400"
                        >
                            <option value="NZD">NZ$</option>
                            <option value="USD">$</option>
                            <option value="EUR">€</option>
                            <option value="INR">₹</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Details'}
                    </button>
                </form>
                <div className="mt-6 border-t pt-4">
                    <button onClick={handleModalGenerateLink} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 flex items-center justify-center" disabled={loading}>
                        <Share2 size={16} className="mr-2"/>
                        {loading ? 'Generating...' : (shareLink ? 'Show Share Link' : 'Generate Share Link')}
                    </button>
                    {shareLink && (
                        <div className="mt-4 flex items-center space-x-2">
                            <input type="text" value={shareLink} readOnly className="flex-grow p-2 border border-gray-300 rounded-md bg-gray-100 text-sm" />
                            <button onClick={copyShareLink} className="p-2 bg-gray-200 rounded-md hover:bg-gray-300" title="Copy Link"><Copy size={16} /></button>
                        </div>
                    )}
                </div>
                {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
                {message && <p className="text-green-600 text-sm mt-4">{message}</p>}
            </div>
        </div>
      )}

      <div className="w-full flex flex-col sm:flex-row justify-between items-center py-4 px-8 mb-8 rounded-xl shadow-lg bg-gray-900 text-white">
        <div className="flex items-center mb-4 sm:mb-0">
          {globalLogoUrl ? ( <img src={globalLogoUrl} alt="Company Logo" className="h-12 w-auto object-contain rounded-lg mr-4" /> ) : ( <div className="h-12 w-12 rounded-lg bg-gray-700 flex items-center justify-center text-gray-400 text-xs mr-4">Logo</div> )}
          <h1 className="text-3xl font-extrabold text-accent">{companyName}</h1>
        </div>
        <nav className="flex space-x-6">
          <button onClick={() => setActiveTab('clients')} className={`text-lg font-semibold px-4 py-2 rounded-lg transition-colors duration-200 ${activeTab === 'clients' ? 'bg-accent text-gray-900 shadow-md' : 'text-gray-300 hover:text-white'}`}> Clients </button>
          <button onClick={() => setShowSettingsModal(true)} className={`text-lg font-semibold px-4 py-2 rounded-lg transition-colors duration-200 ${activeTab === 'settings' ? 'bg-accent text-gray-900 shadow-md' : 'text-gray-300 hover:text-white'}`}> Settings </button>
        </nav>
        <button onClick={handleLogout} className="flex items-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500" disabled={loading}> <LogOut size={20} className="mr-2" /> {loading ? 'Logging out...' : 'Logout'} </button>
      </div>

      <div className="flex-grow flex p-4 md:p-8 pt-0">
        <div className={`bg-gray-900 text-white transition-all duration-300 ease-in-out ${isSidebarMinimized ? 'w-16' : 'w-72'} flex-shrink-0 relative shadow-lg z-10 rounded-xl mr-8`}>
          <div className={`flex items-center justify-between p-4 border-b border-gray-700 ${isSidebarMinimized ? 'justify-center' : ''}`}>
            {!isSidebarMinimized && ( <h2 className="text-2xl font-bold text-accent">Clients</h2> )}
            <button onClick={() => setIsSidebarMinimized(!isSidebarMinimized)} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent" aria-label={isSidebarMinimized ? "Expand sidebar" : "Minimize sidebar"}> {isSidebarMinimized ? <ChevronRight size={20} /> : <ChevronLeft size={20} />} </button>
          </div>
          <nav className="flex-grow overflow-y-auto p-4">
            <button onClick={() => setIsAddingClient(!isAddingClient)} className={`flex items-center w-full bg-accent hover:bg-yellow-500 text-gray-900 font-bold py-2 px-4 rounded-lg mb-4 justify-center transition duration-200 ${isSidebarMinimized ? 'p-2 w-12 h-12 rounded-full mx-auto flex-shrink-0' : ''}`} title={isAddingClient ? 'Cancel Add Client' : 'Add New Client'}> <Plus size={20} className={`${isSidebarMinimized ? '' : 'mr-2'}`} /> {!isSidebarMinimized && (isAddingClient ? 'Cancel' : 'Add Client')} </button>
            {isAddingClient && !isSidebarMinimized && ( <form onSubmit={handleAddClient} className="space-y-4 mb-6 p-4 border border-gray-700 rounded-lg bg-gray-800 text-gray-300"> <h3 className="text-xl font-semibold text-accent">New Client Details</h3> <div> <label htmlFor="newClientName" className="block text-sm font-bold mb-2">Client Name:</label> <input type="text" id="newClientName" className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-accent" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Enter client name" required /> </div> <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200" disabled={loading}> Create Client </button> </form> )}
            <ul className="py-2 space-y-2">
              {clients.length === 0 ? ( <li className={`text-gray-400 text-center py-4 ${isSidebarMinimized ? 'hidden' : ''}`}>No clients yet.</li> ) : ( clients.map((client) => ( <li key={client.id} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition duration-200 ease-in-out ${selectedClient && selectedClient.id === client.id ? 'bg-gray-700 border-accent shadow-lg' : 'bg-gray-800 hover:bg-gray-700 border-gray-700'} ${isSidebarMinimized ? 'justify-center p-2' : ''}`} onClick={() => handleSelectClient(client)}> {!isSidebarMinimized ? ( <> <div className="flex-1 min-w-0 pr-2"> <p className="font-semibold text-gray-100 truncate">{client.client_name}</p> <p className="text-sm text-gray-400 truncate">ID: {client.id.substring(0, 8)}...</p> </div> <div className="flex space-x-2 flex-shrink-0"> <button onClick={(e) => handleViewClientPage(e, client)} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors" title="View Client Page"> <ExternalLink size={16} /> </button> <button onClick={(e) => { e.stopPropagation(); handleOpenEditClientModal(client); }} className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors" title="Edit Client Details"> <Edit size={16} /> </button> <button onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors" title="Delete Client"> <Trash2 size={16} /> </button> </div> </> ) : ( <div className="text-center"> {globalLogoUrl ? ( <img src={globalLogoUrl} alt="Global Logo" className="h-8 w-8 object-contain mx-auto mb-1" title={client.client_name}/> ) : ( <Eye size={20} className="text-gray-300 mx-auto mb-1" title={client.client_name} /> )} <p className="text-xs text-gray-300 leading-none">{client.client_name.split(' ')[0]}</p> </div> )} </li> )) )}
            </ul>
          </nav>
        </div>
        
        <div className="flex-grow bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          {activeTab === 'clients' && (
            selectedClient ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b pb-4">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3 sm:mb-0">
                    Editing: "{selectedClient.client_name}"
                  </h2>
                  <div className="flex space-x-2">
                    <button onClick={() => { setShowItineraryModal(true); setNewItinerary({ location: '', checkIn: '', checkOut: '' }); setEditingItineraryLeg(null); }} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out">
                          <MapPin size={20} className="mr-2" />
                          Add Itinerary Leg
                      </button>
                      <button onClick={() => { setShowItineraryListModal(true); }} className="flex items-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out">
                          <Edit size={20} className="mr-2" />
                          Edit Itinerary
                      </button>
                  </div>
                </div>
                
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveClientTab('summary')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeClientTab === 'summary' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <ClipboardList size={16} className="mr-2" /> Summary
                        </button>
                        <button onClick={() => setActiveClientTab('property')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeClientTab === 'property' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <Building size={16} className="mr-2" /> Property
                        </button>
                        <button onClick={() => setActiveClientTab('activities')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeClientTab === 'activities' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <Activity size={16} className="mr-2" /> Activities
                        </button>
                        <button onClick={() => setActiveClientTab('flights')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeClientTab === 'flights' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <Plane size={16} className="mr-2" /> Flights
                        </button>
                        <button onClick={() => setActiveClientTab('transportation')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeClientTab === 'transportation' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <Car size={16} className="mr-2" /> Transportation
                        </button>
                    </nav>
                </div>

                <div>
                    {activeClientTab === 'summary' && clientData && (
                        <AdminSummaryView clientData={clientData} setActiveTab={setActiveClientTab} currency={clientData.currency || 'NZD'} />
                    )}
                    {activeClientTab === 'property' && clientData && (
                        <PropertyForm
                            properties={clientData.properties}
                            setProperties={handleUpdateProperties}
                            onSave={handleSaveClientData}
                            adminMode={true}
                        />
                    )}
                    {activeClientTab === 'activities' && clientData && (
                        <ActivityForm
                            activities={clientData.activities}
                            setActivities={handleUpdateActivities}
                            itineraryLegs={clientData.properties}
                        />
                    )}
                    {activeClientTab === 'transportation' && clientData && (
                        <TransportationForm
                            transportation={clientData.transportation}
                            setTransportation={handleUpdateTransportation}
                            itineraryLegs={clientData.properties.filter(p => p.isPlaceholder)}
                        />
                    )}
                    {activeClientTab === 'flights' && clientData && (
                        <FlightForm
                            flights={clientData.flights}
                            setFlights={handleUpdateFlights}
                        />
                    )}
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={handleSaveClientData}
                    disabled={loading}
                    className="px-6 py-3 bg-accent text-gray-900 rounded-lg shadow-md hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save All Client Changes'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <Eye size={48} className="mx-auto mb-4" />
                <p className="text-xl">Select a client from the sidebar to manage their data.</p>
                <p className="text-md mt-2">Or add a new client if none exist.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;