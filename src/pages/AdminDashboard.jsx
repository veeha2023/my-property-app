// src/pages/AdminDashboard.jsx - Version 9.0 (Auto-Save + Visibility Detection)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient.js';
import PropertyForm from '../components/PropertyForm.jsx';
import ActivityForm from '../components/ActivityForm.jsx';
import TransportationForm from '../components/TransportationForm.jsx';
import FlightForm from '../components/FlightForm.jsx';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Edit, Trash2, Eye, ExternalLink, ChevronLeft, ChevronRight, X, MapPin, Share2, Building, Activity, Plane, Car, ClipboardList, Calendar, Copy, Link2Off, Link as LinkIcon, Save, CheckCircle, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import { getCurrencySymbol, getCurrencyOptions, convertItemsCurrency, formatNumberWithCommas } from '../utils/currencyUtils.js';
import { useVisibility, useAutoSave } from '../hooks/useVisibility.js';

const AdminSummaryView = ({ clientData, setActiveTab, currency }) => {

    const getPriceColor = (price) => {
        if (price < 0) return 'text-green-600';
        if (price > 0) return 'text-red-600';
        return 'text-gray-900';
    };

    // Helper functions for date and time formatting
    const parseDateString = (dateString) => {
        if (!dateString) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
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
        } catch { return 'Invalid Date'; }
    };

    const formatTime = (timeString) => {
        if (!timeString) return 'N/A';
        try {
            const [hours, minutes] = timeString.split(':');
            const date = new Date();
            date.setHours(hours, minutes);
            return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(date);
        } catch { return 'Invalid Time'; }
    };

    const calculateActivityDelta = useCallback((activity) => {
        // Calculate delta from base quote using new pricing model
        const costPerPax = parseFloat(activity.cost_per_pax) || 0;
        const flatPrice = parseFloat(activity.flat_price) || 0;
        const currentPax = parseInt(activity.pax, 10) || 1;
        const basePrice = parseFloat(activity.base_price) || 0;
        const isIncludedInBase = activity.included_in_base !== false;
        const isSelected = activity.selected !== false;

        // Current price calculation
        const currentPrice = (costPerPax * currentPax) + flatPrice;

        // Delta logic:
        if (isIncludedInBase) {
            // Was included in base
            if (!isSelected) {
                // Deselected: subtract the base price
                return -basePrice;
            } else {
                // Still selected: delta is change from base
                return currentPrice - basePrice;
            }
        } else {
            // Was NOT included in base (optional)
            if (isSelected) {
                // Selected: add the full current price
                return currentPrice;
            } else {
                // Not selected: no delta
                return 0;
            }
        }
    }, []);

    const calculateFinalFlightPrice = useCallback((flight) => {
        const priceSelected = parseFloat(flight.price_if_selected) || 0;
        const priceNotSelected = parseFloat(flight.price_if_not_selected) || 0;
        return flight.selected ? priceSelected : priceNotSelected;
    }, []);

    const selectedProperties = useMemo(() => clientData?.properties?.filter(p => p.selected && !p.isPlaceholder) || [], [clientData]);
    const selectedActivities = useMemo(() => clientData?.activities?.filter(a => a.selected) || [], [clientData]);
    const selectedTransportation = useMemo(() => clientData?.transportation?.filter(t => t.selected) || [], [clientData]);

    // Group selected transportation by pickup/onboard point
    const groupedSelectedTransportation = useMemo(() => {
        if (!selectedTransportation || selectedTransportation.length === 0) return [];

        const groupedByPickup = selectedTransportation.reduce((acc, item) => {
            // Determine pickup point based on transport type
            let pickupPoint = 'Uncategorized';
            if (item.transportType === 'car') {
                pickupPoint = item.pickupLocation || 'Uncategorized';
            } else if (item.transportType === 'ferry' || item.transportType === 'bus') {
                pickupPoint = item.boardingFrom || 'Uncategorized';
            } else if (item.transportType === 'driver') {
                pickupPoint = item.pickupFrom || 'Uncategorized';
            }

            if (!acc[pickupPoint]) acc[pickupPoint] = [];
            acc[pickupPoint].push(item);
            return acc;
        }, {});

        // Convert to sorted array of groups
        const pickupGroups = Object.keys(groupedByPickup).map(pickupPoint => {
            const groupItems = groupedByPickup[pickupPoint];

            // Sort items within group by pickup/boarding date/time
            groupItems.sort((a, b) => {
                const getDate = (item) => item.pickupDate || item.boardingDate || item.date;
                const getTime = (item) => item.pickupTime || item.boardingTime || item.time || '00:00';

                const dateTimeA = new Date(`${getDate(a)}T${getTime(a)}`);
                const dateTimeB = new Date(`${getDate(b)}T${getTime(b)}`);

                if (isNaN(dateTimeA.getTime())) return 1;
                if (isNaN(dateTimeB.getTime())) return -1;

                return dateTimeA.getTime() - dateTimeB.getTime();
            });

            // Determine earliest date for group sorting
            const getDate = (item) => item.pickupDate || item.boardingDate || item.date;
            const getTime = (item) => item.pickupTime || item.boardingTime || item.time || '00:00';
            const firstItem = groupItems[0];
            const sortDate = new Date(`${getDate(firstItem)}T${getTime(firstItem)}`);

            return {
                pickupPoint,
                items: groupItems,
                sortDate: isNaN(sortDate.getTime()) ? new Date(0) : sortDate
            };
        });

        // Sort groups by earliest date
        pickupGroups.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

        return pickupGroups;
    }, [selectedTransportation]);
    const selectedFlights = useMemo(() => clientData?.flights?.filter(f => f.selected) || [], [clientData]);

    const hasSelections = selectedProperties.length > 0 || selectedActivities.length > 0 || selectedTransportation.length > 0 || selectedFlights.length > 0;

    const totalChange = useMemo(() => {
        let total = 0;
        total += selectedProperties.reduce((sum, prop) => sum + (prop.price || 0), 0);
        total += (clientData?.activities || []).reduce((sum, act) => sum + calculateActivityDelta(act), 0);
        total += selectedTransportation.reduce((sum, item) => sum + (item.price || 0), 0);
        total += (clientData?.flights || []).reduce((sum, item) => sum + calculateFinalFlightPrice(item), 0);
        return total;
    }, [clientData, selectedProperties, selectedTransportation, calculateActivityDelta, calculateFinalFlightPrice]);

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
                        <p className="text-2xl font-bold text-gray-800">{currencySymbol}{formatNumberWithCommas(baseQuote, currency)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-100">
                        <p className="text-xs text-gray-600">Selections</p>
                        <p className={`text-2xl font-bold ${getPriceColor(totalChange)}`}>{totalChange >= 0 ? '+' : '-'}{currencySymbol}{formatNumberWithCommas(Math.abs(totalChange), currency)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-100 border border-blue-200">
                        <p className="text-xs text-blue-800">Final Quote</p>
                        <p className="text-2xl font-bold text-blue-800">{currencySymbol}{formatNumberWithCommas(finalQuote, currency)}</p>
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
                                        <p className={`font-bold text-lg ${getPriceColor(item.price)}`}>{`${item.price >= 0 ? '+' : '-'}${getCurrencySymbol(item.currency)}${formatNumberWithCommas(Math.abs(item.price), item.currency)}`}</p>
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
                                        <p className={`font-bold text-lg ${getPriceColor(calculateFinalFlightPrice(item))}`}>{`${calculateFinalFlightPrice(item) >= 0 ? '+' : '-'}${getCurrencySymbol(item.currency)}${formatNumberWithCommas(Math.abs(calculateFinalFlightPrice(item)), item.currency)}`}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {selectedActivities.length > 0 && (
                        <div onClick={() => setActiveTab('activities')} className="cursor-pointer group">
                            <h3 className="text-2xl font-semibold mb-4 flex items-center gap-3 text-gray-700 group-hover:text-yellow-500 transition-colors"><Activity /> Activities</h3>
                            <div className="space-y-4">
                                {selectedActivities.map(item => {
                                    const deltaPrice = calculateActivityDelta(item);
                                    const costPerPax = parseFloat(item.cost_per_pax) || 0;
                                    return (
                                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm border group-hover:border-yellow-400 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <img src={item.images?.[0] || "https://placehold.co/80x80/E0E0E0/333333?text=No+Image"} alt={item.name} className="w-20 h-20 rounded-lg object-cover shadow-sm"/>
                                                <div>
                                                    <p className="font-bold text-gray-800">{item.name}</p>
                                                    <p className="text-sm text-gray-600">{item.location}</p>
                                                    {costPerPax > 0 && <p className="text-xs text-gray-500">{item.pax} pax × {getCurrencySymbol(item.currency)}{formatNumberWithCommas(costPerPax, item.currency)}</p>}
                                                </div>
                                            </div>
                                            <p className={`font-bold text-lg ${getPriceColor(deltaPrice)}`}>{`${deltaPrice >= 0 ? '+' : '-'}${getCurrencySymbol(item.currency)}${formatNumberWithCommas(Math.abs(deltaPrice), item.currency)}`}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {selectedTransportation.length > 0 && (
                        <div onClick={() => setActiveTab('transportation')} className="cursor-pointer group">
                            <h3 className="text-2xl font-semibold mb-4 flex items-center gap-3 text-gray-700 group-hover:text-yellow-500 transition-colors"><Car /> Transportation</h3>
                            <div className="space-y-6">
                                {groupedSelectedTransportation.map(({ pickupPoint, items }) => (
                                    <div key={pickupPoint}>
                                        <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <MapPin size={18} className="text-blue-600" /> {pickupPoint}
                                        </h4>
                                        <div className="space-y-4">
                                            {items.map(item => (
                                                <div key={item.id} className="flex flex-col lg:flex-row items-start lg:items-center gap-4 p-4 bg-gray-50 rounded-lg shadow-sm border group-hover:border-yellow-400 transition-colors">
                                                    <img src={item.images?.[0] || "https://placehold.co/80x80/E0E0E0/333333?text=No+Image"} alt={item.name} className="w-full lg:w-32 h-auto object-cover rounded-lg shadow-sm flex-shrink-0"/>
                                                    <div className="flex-grow">
                                                        <h4 className="font-bold text-lg text-gray-800">{item.name}</h4>
                                                        <p className="text-sm text-gray-500 mb-2 capitalize">{item.type || item.carType || item.transportType}</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700">
                                                            {(() => {
                                                                const transportTypeLower = item.transportType?.toLowerCase() || '';

                                                                // Handle car-type vehicles (car, van, suv, sedan)
                                                                if (['car', 'van', 'suv', 'sedan'].includes(transportTypeLower)) {
                                                                    return (
                                                                        <>
                                                                            <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-500" /> <strong>Pickup:</strong> &nbsp;{item.pickupLocation}</div>
                                                                            <div className="flex items-center"><Calendar size={14} className="mr-2 text-gray-500" /> <strong>On:</strong> &nbsp;{formatDate(item.pickupDate)} at {formatTime(item.pickupTime)}</div>
                                                                            <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-500" /> <strong>Drop-off:</strong> &nbsp;{item.dropoffLocation}</div>
                                                                            <div className="flex items-center"><Calendar size={14} className="mr-2 text-gray-500" /> <strong>On:</strong> &nbsp;{formatDate(item.dropoffDate)} at {formatTime(item.dropoffTime)}</div>
                                                                            <div className="flex items-center"><ShieldCheck size={14} className="mr-2 text-gray-500" /> <strong>Insurance:</strong> &nbsp;{item.insurance} (Excess: {getCurrencySymbol(item.currency)}{formatNumberWithCommas(item.excessAmount || 0, item.currency)})</div>
                                                                            <div className="flex items-center"><Users size={14} className="mr-2 text-gray-500" /> <strong>Drivers:</strong> &nbsp;{item.driversIncluded}</div>
                                                                        </>
                                                                    );
                                                                }

                                                                // Handle ferry and bus
                                                                if (transportTypeLower === 'ferry' || transportTypeLower === 'bus') {
                                                                    return (
                                                                        <>
                                                                            <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-500" /> <strong>From:</strong> &nbsp;{item.boardingFrom}</div>
                                                                            <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-500" /> <strong>To:</strong> &nbsp;{item.departingTo}</div>
                                                                            <div className="flex items-center"><Calendar size={14} className="mr-2 text-gray-500" /> <strong>On:</strong> &nbsp;{formatDate(item.boardingDate)} at {formatTime(item.boardingTime)}</div>
                                                                            <div className="flex items-center"><strong>Duration:</strong> &nbsp;{item.duration}</div>
                                                                            <div className="flex items-center"><strong>Baggage:</strong> &nbsp;{item.baggageAllowance}</div>
                                                                        </>
                                                                    );
                                                                }

                                                                // Handle driver
                                                                if (transportTypeLower === 'driver') {
                                                                    return (
                                                                        <>
                                                                            <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-500" /> <strong>Pickup:</strong> &nbsp;{item.pickupFrom} ({item.location})</div>
                                                                            <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-500" /> <strong>Drop-off:</strong> &nbsp;{item.dropoffTo}</div>
                                                                            <div className="flex items-center"><Calendar size={14} className="mr-2 text-gray-500" /> <strong>On:</strong> &nbsp;{formatDate(item.pickupDate)} at {formatTime(item.pickupTime)}</div>
                                                                            <div className="flex items-center"><strong>Duration:</strong> &nbsp;{item.duration}</div>
                                                                        </>
                                                                    );
                                                                }

                                                                // Fallback for unknown types
                                                                return <div className="text-gray-500">Transport type: {item.transportType}</div>;
                                                            })()}
                                                        </div>
                                                    </div>
                                                    <div className="w-full lg:w-auto text-right lg:ml-auto flex-shrink-0">
                                                        <p className={`text-2xl font-bold whitespace-nowrap ${getPriceColor(item.price)}`}>{`${item.price >= 0 ? '+' : '-'}${getCurrencySymbol(item.currency)}${formatNumberWithCommas(Math.abs(item.price), item.currency)}`}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
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
  const [editingConversionDate, setEditingConversionDate] = useState('');
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [, setShowSettingsModal] = useState(false);
  const [globalLogoUrl, setGlobalLogoUrl] = useState(null);
  const [, setNewGlobalLogoFile] = useState(null);
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
  // V1 FIX: Removed unused state variables for original check-in/out
  // const [originalEditingLegCheckIn, setOriginalEditingLegCheckIn] = useState('');
  // const [originalEditingLegCheckOut, setOriginalEditingLegCheckOut] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const GLOBAL_SETTINGS_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  // V9.0: Visibility detection to prevent loading on tab switch
  useVisibility();
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // V9.0: Auto-save functionality with debouncing (2 second delay)
  const saveFunction = useCallback(
    async (data) => {
      await handleSaveClientData(data, true); // Silent save
    },
    [selectedClient] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const { debouncedSave, isSaving, lastSaved } = useAutoSave(saveFunction, 2000);

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
    const existingActivities = (data.activities || []).map(a => ({
        ...a,
        cost_per_pax: parseFloat(a.cost_per_pax) || 0,
        flat_price: parseFloat(a.flat_price) || 0,
        base_price: parseFloat(a.base_price) || 0,
        pax: parseInt(a.pax, 10) || 1,
        included_in_base: a.included_in_base !== false,
    }));
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
    setEditingConversionDate(fullClientData.conversion_rate_date || new Date().toISOString().split('T')[0]);
    setActiveClientTab('summary');
    setMessage(`Editing details for ${client.client_name}`);
    setError(null);
  };

  // Refresh client data without refreshing the whole page
  const handleRefreshClientData = async () => {
    if (!selectedClient) return;

    setIsRefreshing(true);
    setMessage('Refreshing client data...');
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', selectedClient.id)
        .single();

      if (fetchError) throw fetchError;

      // Update the selected client with fresh data
      setSelectedClient(data);

      // Parse and initialize the fresh client data
      let parsedClientProperties = null;
      try {
        if (typeof data.client_properties === 'string') {
          parsedClientProperties = JSON.parse(data.client_properties);
        } else {
          parsedClientProperties = data.client_properties;
        }
      } catch (e) {
        console.error("Error parsing client_properties:", e);
        parsedClientProperties = null;
      }

      const fullClientData = initializeClientData(parsedClientProperties);
      setClientData(fullClientData);

      setEditingClientName(data.client_name);
      setEditingClientQuote(fullClientData.quote);
      setEditingClientCurrency(fullClientData.currency);
      setEditingConversionDate(fullClientData.conversion_rate_date || new Date().toISOString().split('T')[0]);

      setMessage('Client data refreshed successfully!');
    } catch (err) {
      console.error("Error refreshing client data:", err.message);
      setError("Failed to refresh client data: " + err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // V9.0: Updated to support auto-save (silent saves without UI feedback)
  const handleSaveClientData = async (updatedData = clientData, silent = false) => {
    if (!selectedClient || !updatedData) {
      if (!silent) setMessage('No client selected to save data.');
      return;
    }

    if (!silent) {
      setLoading(true);
      setMessage('');
      setError(null);
    }

    const dataToSave = {
        ...updatedData,
        properties: sortPropertiesByDate(updatedData.properties),
        activities: sortActivitiesByDateTime(updatedData.activities),
        transportation: sortTransportationByDate(updatedData.transportation),
        flights: sortFlightsByDate(updatedData.flights),
    };
    const dataJson = JSON.stringify(dataToSave);

    const { error: updateError } = await supabase
      .from('clients')
      .update({ client_properties: dataJson, last_updated: new Date().toISOString() })
      .eq('id', selectedClient.id);

    if (updateError) {
      console.error('Error saving client data:', updateError.message);
      if (!silent) setError('Error saving client data: ' + updateError.message);
    } else {
      if (!silent) {
        setMessage('Client data saved successfully!');
        fetchClients();
      }
    }

    if (!silent) setLoading(false);
  };

  // V9.0: Updated to trigger auto-save on data changes
  const handleUpdateProperties = (updatedProperties) => {
    const newData = { ...clientData, properties: updatedProperties };
    setClientData(newData);
    debouncedSave(newData); // Auto-save after 2 seconds
  };

  const handleUpdateActivities = (updatedActivities) => {
    const newData = { ...clientData, activities: updatedActivities };
    setClientData(newData);
    debouncedSave(newData); // Auto-save after 2 seconds
  };

  const handleUpdateTransportation = (updatedTransportation) => {
    const newData = { ...clientData, transportation: updatedTransportation };
    setClientData(newData);
    debouncedSave(newData); // Auto-save after 2 seconds
  };

  const handleUpdateFlights = (updatedFlights) => {
    const newData = { ...clientData, flights: updatedFlights };
    setClientData(newData);
    debouncedSave(newData); // Auto-save after 2 seconds
  };

  // V1 FIX: Reworked Add Itinerary Leg logic
  const handleSaveItinerary = async () => {
      if (!selectedClient || !newItinerary.location || !newItinerary.checkIn || !newItinerary.checkOut) {
          setError("Please fill in all itinerary fields.");
          return;
      }
  
      const placeholderProperty = {
          id: `itinerary-placeholder-${uuidv4()}`,
          name: 'Itinerary Placeholder',
          location: newItinerary.location.trim(),
          checkIn: newItinerary.checkIn,
          checkOut: newItinerary.checkOut,
          price: 0, currency: 'NZD', images: [], bedrooms: 0, bathrooms: 0, selected: false, isPlaceholder: true,
      };
      
      const updatedData = {
        ...clientData,
        properties: [...(clientData?.properties || []), placeholderProperty]
      };
      
      setClientData(updatedData);
      await handleSaveClientData(updatedData);

      setShowItineraryModal(false);
      setNewItinerary({ location: '', checkIn: '', checkOut: '' });
      setMessage('Itinerary leg added successfully.');
      setError(null);
  };

  const handleEditItineraryLeg = (leg) => {
    setEditingItineraryLeg({ ...leg });
    setOriginalEditingLegLocation(leg.location.trim());
    setShowItineraryListModal(false);
    setShowItineraryModal(true);
  };

  // V1 FIX: Reworked Edit Itinerary Leg logic
  const handleUpdateEditedItinerary = async () => {
    if (!selectedClient || !editingItineraryLeg) return;
    if (!editingItineraryLeg.location || !editingItineraryLeg.checkIn || !editingItineraryLeg.checkOut) {
        setError("Please fill in all itinerary fields.");
        return;
    }

    setLoading(true);
    setMessage('');
    setError(null);

    const newLocation = editingItineraryLeg.location.trim();
    const newCheckIn = editingItineraryLeg.checkIn;
    const newCheckOut = editingItineraryLeg.checkOut;

    const updatedProperties = clientData.properties.map(prop => {
        if (prop.id === editingItineraryLeg.id) {
            return { ...editingItineraryLeg, location: newLocation, isPlaceholder: true };
        }
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
        if (t.pickupLocation?.trim() === originalEditingLegLocation) {
            t.pickupLocation = newLocation;
            t.pickupDate = newCheckIn;
            t.dropoffDate = newCheckOut;
        }
         if (t.boardingFrom?.trim() === originalEditingLegLocation) {
            t.boardingFrom = newLocation;
            t.boardingDate = newCheckIn;
            t.departingDate = newCheckOut;
        }
        return t;
    });

    const updatedData = {
        ...clientData,
        properties: updatedProperties,
        activities: updatedActivities,
        transportation: updatedTransportation,
    };

    setClientData(updatedData);
    await handleSaveClientData(updatedData);

    setEditingItineraryLeg(null);
    setOriginalEditingLegLocation('');
    setShowItineraryModal(false);
    setMessage('Itinerary leg updated successfully.');
    setLoading(false);
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

    const legLocationToDelete = itineraryToDelete.location.trim();

    const updatedData = {
        ...clientData,
        properties: clientData.properties.filter(prop => prop.location?.trim() !== legLocationToDelete),
        activities: clientData.activities.filter(act => act.location?.trim() !== legLocationToDelete),
        transportation: clientData.transportation.filter(t => 
            t.pickupLocation?.trim() !== legLocationToDelete && 
            t.boardingFrom?.trim() !== legLocationToDelete
        ),
    };

    setClientData(updatedData);
    await handleSaveClientData(updatedData);

    setShowConfirmDeleteModal(false);
    setShowItineraryListModal(false);
    setItineraryToDelete(null);
    setMessage('Itinerary leg and associated items deleted successfully.');
    setLoading(false);
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

  // V2 FEATURE: Duplicate Itinerary
  const handleDuplicateClient = async (clientToDuplicate) => {
    if (!session) { setError("You must be logged in."); return; }
    if (!window.confirm(`Are you sure you want to duplicate the itinerary for "${clientToDuplicate.client_name}"?`)) return;

    setLoading(true);
    setMessage('');
    setError(null);

    const newName = `${clientToDuplicate.client_name} (Copy)`;
    const newId = uuidv4();
    
    // Deep copy of client_properties
    const duplicatedProperties = JSON.parse(JSON.stringify(clientToDuplicate.client_properties));

    const { error: insertError } = await supabase
      .from('clients')
      .insert([{ 
          id: newId, 
          client_name: newName, 
          client_properties: duplicatedProperties, 
          user_id: session.user.id, 
          last_updated: new Date().toISOString(),
          share_link_disabled: true // Disable link on new copies by default
      }]);

    if (insertError) {
      console.error('Error duplicating client:', insertError.message);
      setError('Error duplicating client: ' + insertError.message);
    } else {
      setMessage('Client duplicated successfully!');
      fetchClients();
    }
    setLoading(false);
  };
  
  // V2 FEATURE: Disable/Enable Share Link
  const handleToggleShareLink = async () => {
    if (!selectedClient) return;
    setLoading(true);
    const newStatus = !selectedClient.share_link_disabled;
    const { data, error: updateError } = await supabase
        .from('clients')
        .update({ share_link_disabled: newStatus })
        .eq('id', selectedClient.id)
        .select()
        .single();
    
    if (updateError) {
        setError('Failed to update link status: ' + updateError.message);
    } else {
        setSelectedClient(data); // Update selected client with new status
        // Update the main clients list as well
        setClients(clients.map(c => c.id === data.id ? data : c));
        setMessage(`Share link has been ${newStatus ? 'disabled' : 'enabled'}.`);
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

  // V9.0: Only fetch on initial mount, prevent re-fetching on tab visibility changes
  useEffect(() => {
    if (session && !hasInitiallyLoaded) {
        fetchClients();
        fetchGlobalSettings();
        setHasInitiallyLoaded(true);
    }
  }, [session, hasInitiallyLoaded, fetchClients, fetchGlobalSettings]);

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
    setEditingConversionDate(currentData.conversion_rate_date || new Date().toISOString().split('T')[0]);
    if (client.share_token) {
        setShareLink(`${window.location.origin}/client/${client.id}?token=${client.share_token}`);
    } else {
        setShareLink('');
    }
    setShowEditClientModal(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateClientDetails = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    setLoading(true);
    setMessage('');
    setError(null);
    try {
        const newCurrency = editingClientCurrency;
        const currentCurrency = clientData?.currency || 'NZD';

        // Convert all items to new currency if currency changed
        let updatedProperties = clientData?.properties || [];
        let updatedActivities = clientData?.activities || [];
        let updatedTransportation = clientData?.transportation || [];
        let updatedFlights = clientData?.flights || [];

        if (currentCurrency !== newCurrency) {
            setMessage('Converting currencies... This may take a moment.');

            // Use the conversion date to ensure consistent exchange rates
            updatedProperties = await convertItemsCurrency(updatedProperties, currentCurrency, newCurrency, editingConversionDate);
            updatedActivities = await convertItemsCurrency(updatedActivities, currentCurrency, newCurrency, editingConversionDate);
            updatedTransportation = await convertItemsCurrency(updatedTransportation, currentCurrency, newCurrency, editingConversionDate);
            updatedFlights = await convertItemsCurrency(updatedFlights, currentCurrency, newCurrency, editingConversionDate);
        }

        const updatedClientData = {
            ...clientData,
            quote: parseFloat(editingClientQuote) || 0,
            currency: newCurrency,
            conversion_rate_date: editingConversionDate,
            properties: updatedProperties,
            activities: updatedActivities,
            transportation: updatedTransportation,
            flights: updatedFlights,
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

  // eslint-disable-next-line no-unused-vars
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
      {/* ... (all modals remain the same, with one addition below) */}

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
                        <label htmlFor="editingClientCurrency" className="block text-sm font-medium text-gray-800">Base Currency</label>
                        <select
                            id="editingClientCurrency"
                            value={editingClientCurrency}
                            onChange={(e) => setEditingClientCurrency(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:ring-yellow-400 focus:border-yellow-400"
                        >
                            {getCurrencyOptions().map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="editingConversionDate" className="block text-sm font-medium text-gray-800">Currency Conversion Rate Date</label>
                        <input
                            type="date"
                            id="editingConversionDate"
                            value={editingConversionDate}
                            onChange={(e) => setEditingConversionDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:ring-yellow-400 focus:border-yellow-400"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Exchange rates will be locked to this date for client currency conversion</p>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Details'}
                    </button>
                </form>
                <div className="mt-6 border-t pt-4 space-y-3">
                    <button onClick={handleModalGenerateLink} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 flex items-center justify-center" disabled={loading}>
                        <Share2 size={16} className="mr-2"/>
                        {loading ? 'Generating...' : (shareLink ? 'Show Share Link' : 'Generate Share Link')}
                    </button>
                    {/* V2 FEATURE: Disable Share Link Button */}
                    <button 
                        onClick={handleToggleShareLink} 
                        className={`w-full font-bold py-2 px-4 rounded-md transition duration-200 flex items-center justify-center ${selectedClient.share_link_disabled ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        disabled={loading}
                    >
                        {selectedClient.share_link_disabled ? <LinkIcon size={16} className="mr-2"/> : <Link2Off size={16} className="mr-2"/>}
                        {loading ? 'Updating...' : (selectedClient.share_link_disabled ? 'Enable Share Link' : 'Disable Share Link')}
                    </button>
                    {shareLink && (
                        <div className="flex items-center space-x-2">
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

      {/* Add/Edit Itinerary Modal */}
      {showItineraryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative text-gray-800">
            <button onClick={() => setShowItineraryModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-800" aria-label="Close modal"><X size={24} /></button>
            <h2 className="text-2xl font-bold text-yellow-400 mb-6">
              {editingItineraryLeg ? 'Edit Itinerary Leg' : 'Add New Itinerary Leg'}
            </h2>
            <form onSubmit={(e) => { e.preventDefault(); editingItineraryLeg ? handleUpdateEditedItinerary() : handleSaveItinerary(); }} className="space-y-4">
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-800">Location</label>
                <input 
                  type="text" 
                  id="location" 
                  value={editingItineraryLeg ? editingItineraryLeg.location : newItinerary.location} 
                  onChange={(e) => {
                    if (editingItineraryLeg) {
                      setEditingItineraryLeg({...editingItineraryLeg, location: e.target.value});
                    } else {
                      setNewItinerary({...newItinerary, location: e.target.value});
                    }
                  }} 
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:ring-yellow-400 focus:border-yellow-400" 
                  required 
                />
              </div>
              <div>
                <label htmlFor="checkIn" className="block text-sm font-medium text-gray-800">Check-in Date</label>
                <input 
                  type="date" 
                  id="checkIn" 
                  value={editingItineraryLeg ? editingItineraryLeg.checkIn : newItinerary.checkIn} 
                  onChange={(e) => {
                    if (editingItineraryLeg) {
                      setEditingItineraryLeg({...editingItineraryLeg, checkIn: e.target.value});
                    } else {
                      setNewItinerary({...newItinerary, checkIn: e.target.value});
                    }
                  }} 
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:ring-yellow-400 focus:border-yellow-400" 
                  required 
                />
              </div>
              <div>
                <label htmlFor="checkOut" className="block text-sm font-medium text-gray-800">Check-out Date</label>
                <input 
                  type="date" 
                  id="checkOut" 
                  value={editingItineraryLeg ? editingItineraryLeg.checkOut : newItinerary.checkOut} 
                  onChange={(e) => {
                    if (editingItineraryLeg) {
                      setEditingItineraryLeg({...editingItineraryLeg, checkOut: e.target.value});
                    } else {
                      setNewItinerary({...newItinerary, checkOut: e.target.value});
                    }
                  }} 
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:ring-yellow-400 focus:border-yellow-400" 
                  required 
                />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200" disabled={loading}>
                  {loading ? 'Saving...' : (editingItineraryLeg ? 'Update Itinerary' : 'Add Itinerary')}
                </button>
                <button type="button" onClick={() => setShowItineraryModal(false)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition duration-200">
                  Cancel
                </button>
              </div>
            </form>
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
            {message && <p className="text-green-600 text-sm mt-4">{message}</p>}
          </div>
        </div>
      )}

      {/* Edit Itinerary List Modal */}
      {showItineraryListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative text-gray-800 max-h-[80vh] overflow-y-auto">
            <button onClick={() => setShowItineraryListModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-800" aria-label="Close modal"><X size={24} /></button>
            <h2 className="text-2xl font-bold text-yellow-400 mb-6">Edit Itinerary Legs</h2>
            
            {clientData && clientData.properties && clientData.properties.filter(p => p.isPlaceholder).length > 0 ? (
              <div className="space-y-4">
                {clientData.properties.filter(p => p.isPlaceholder).map((leg, index) => (
                  <div key={leg.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800">{leg.location}</h3>
                        <p className="text-sm text-gray-600">
                          {formatDateForDisplay(leg.checkIn)} - {formatDateForDisplay(leg.checkOut)}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditItineraryLeg(leg)} 
                          className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                          title="Edit Itinerary Leg"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => confirmDeleteItineraryLeg(leg)} 
                          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          title="Delete Itinerary Leg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No itinerary legs found. Add some using the "Add Itinerary Leg" button.</p>
            )}
            
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowItineraryListModal(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition duration-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showConfirmDeleteModal && itineraryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative text-gray-800 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Confirm Deletion</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete the itinerary leg for "
              <span className="font-semibold">{itineraryToDelete.location}</span>"? This will also delete all associated properties, activities, and transportation for this location. This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setShowConfirmDeleteModal(false);
                  setItineraryToDelete(null);
                }}
                className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteItineraryLeg}
                className="px-6 py-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
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
              {clients.length === 0 ? ( <li className={`text-gray-400 text-center py-4 ${isSidebarMinimized ? 'hidden' : ''}`}>No clients yet.</li> ) : ( clients.map((client) => ( <li key={client.id} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition duration-200 ease-in-out ${selectedClient && selectedClient.id === client.id ? 'bg-gray-700 border-accent shadow-lg' : 'bg-gray-800 hover:bg-gray-700 border-gray-700'} ${isSidebarMinimized ? 'justify-center p-2' : ''}`} onClick={() => handleSelectClient(client)}> {!isSidebarMinimized ? ( <> <div className="flex-1 min-w-0 pr-2"> <p className="font-semibold text-gray-100 truncate">{client.client_name}</p> <p className="text-sm text-gray-400 truncate">ID: {client.id.substring(0, 8)}...</p> </div> <div className="flex space-x-2 flex-shrink-0"> <button onClick={(e) => { e.stopPropagation(); handleDuplicateClient(client); }} className="p-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors" title="Duplicate Client"><Copy size={16} /></button> <button onClick={(e) => handleViewClientPage(e, client)} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors" title="View Client Page"> <ExternalLink size={16} /> </button> <button onClick={(e) => { e.stopPropagation(); handleOpenEditClientModal(client); }} className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors" title="Edit Client Details"> <Edit size={16} /> </button> <button onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors" title="Delete Client"> <Trash2 size={16} /> </button> </div> </> ) : ( <div className="text-center"> {globalLogoUrl ? ( <img src={globalLogoUrl} alt="Global Logo" className="h-8 w-8 object-contain mx-auto mb-1" title={client.client_name}/> ) : ( <Eye size={20} className="text-gray-300 mx-auto mb-1" title={client.client_name} /> )} <p className="text-xs text-gray-300 leading-none">{client.client_name.split(' ')[0]}</p> </div> )} </li> )) )}
            </ul>
          </nav>
        </div>
        
        <div className="flex-grow bg-white rounded-xl shadow-lg p-6 border border-gray-200 relative">
          {activeTab === 'clients' && (
            selectedClient ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b pb-4">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3 sm:mb-0">
                    Editing: "{selectedClient.client_name}"
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleRefreshClientData}
                      disabled={isRefreshing}
                      className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh client data"
                    >
                      <RefreshCw size={20} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
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

                {/* Refreshing overlay with smooth animation */}
                {isRefreshing && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-40 rounded-xl animate-fade-in">
                    <div className="flex flex-col items-center">
                      <RefreshCw size={48} className="text-blue-600 animate-spin mb-4" />
                      <p className="text-lg font-semibold text-gray-700">Refreshing client data...</p>
                    </div>
                  </div>
                )}

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
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => handleSaveClientData()}
                      disabled={loading}
                      className="px-6 py-3 bg-accent text-gray-900 rounded-lg shadow-md hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : 'Save Now'}
                    </button>
                    {isSaving && (
                      <div className="flex items-center gap-2 text-blue-600 animate-pulse">
                        <Save size={16} />
                        <span className="text-sm font-medium">Auto-saving...</span>
                      </div>
                    )}
                    {!isSaving && lastSaved && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle size={16} />
                        <span className="text-sm">
                          Saved {new Date(lastSaved).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Changes are automatically saved 2 seconds after you stop editing
                  </p>
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
