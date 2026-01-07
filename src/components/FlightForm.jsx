// src/components/FlightForm.jsx - Version 1.5 (Enhanced Pricing Model)
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Edit3, Trash2, X, Plane, Calendar, Clock, MapPin, Briefcase, DollarSign, CheckCircle, Upload, Download } from 'lucide-react';
import { getCurrencySymbol, getCurrencyName, getCurrencyOptions } from '../utils/currencyUtils';

const FlightForm = ({ flights, setFlights }) => {
  const [editingFlight, setEditingFlight] = useState(null);
  const [newFlight, setNewFlight] = useState(null);
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const accentColor = '#FFD700';

  // Helper function to format number with thousand separators
  const formatNumberWithCommas = (number) => {
    return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const flightTypes = [
    { type: 'domestic', label: 'Domestic Flight' },
    { type: 'international', label: 'International Flight' },
  ];

  // --- UTILITY FUNCTIONS ---
  const getCurrencySymbol = (currencyCode) => {
    const symbols = { NZD: 'NZ$', USD: '$', EUR: '€', INR: '₹' };
    return symbols[currencyCode] || currencyCode || 'NZ$';
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

  const calculateFinalPrice = (flight) => {
    const priceSelected = parseFloat(flight.price_if_selected) || 0;
    const priceNotSelected = parseFloat(flight.price_if_not_selected) || 0;
    return flight.selected ? priceSelected : priceNotSelected;
  };

  const getPriceColor = (price) => {
    if (price < 0) return 'text-green-600';
    if (price > 0) return 'text-red-600';
    return 'text-gray-900';
  };

  // --- DATA DERIVATION ---
  const groupedFlights = useMemo(() => {
    const groups = { domestic: [], international: [] };
    (flights || []).forEach(flight => {
      if (groups[flight.flightType]) {
        groups[flight.flightType].push(flight);
      }
    });
    return groups;
  }, [flights]);

  // --- HANDLER FUNCTIONS ---
  const handleStartAdding = () => {
    setShowTypeSelection(true);
  };

  const handleTypeSelected = (type) => {
    setNewFlight({
      id: `flight-${Date.now()}`,
      flightType: type,
      airline: '',
      airlineLogoUrl: '',
      flightNumber: '',
      from: '',
      to: '',
      departureDate: '',
      departureTime: '12:00',
      arrivalDate: '',
      arrivalTime: '14:00',
      duration: '',
      price_if_selected: 0,
      price_if_not_selected: 0,
      currency: 'NZD',
      baggage: {
        checkInKgs: 23,
        checkInPieces: 1,
        cabinKgs: 7,
        cabinPieces: 1,
      },
      selected: true,
    });
    setShowTypeSelection(false);
  };

  const handleSave = () => {
    const flightToSave = editingFlight || newFlight;
    if (!flightToSave) return;
    
    flightToSave.price_if_selected = parseFloat(flightToSave.price_if_selected) || 0;
    flightToSave.price_if_not_selected = parseFloat(flightToSave.price_if_not_selected) || 0;
    flightToSave.duration = calculateDuration(flightToSave.departureDate, flightToSave.departureTime, flightToSave.arrivalDate, flightToSave.arrivalTime);

    const updatedFlights = editingFlight
      ? (flights || []).map(f => f.id === flightToSave.id ? flightToSave : f)
      : [...(flights || []), flightToSave];
      
    setFlights(updatedFlights);
    resetForm();
  };

  const handleDelete = (id) => {
    console.log("Confirm deletion of flight with ID:", id);
    setFlights((flights || []).filter(f => f.id !== id));
  };
  
  const resetForm = () => {
    setEditingFlight(null);
    setNewFlight(null);
    setShowTypeSelection(false);
  };

  const toggleSelection = (id) => {
    const flightToToggle = (flights || []).find(f => f.id === id);
    if (!flightToToggle) return;
  
    const updatedFlights = (flights || []).map(f => {
      if (f.flightType === flightToToggle.flightType) {
        return { ...f, selected: f.id === id ? !f.selected : false };
      }
      return f;
    });
  
    setFlights(updatedFlights);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target.result;
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                setError("CSV file must contain a header row and at least one data row.");
                return;
            }
            const headers = lines[0].split(',').map(h => h.trim());
            const requiredHeaders = ['flightType', 'airline', 'airlineLogoUrl', 'flightNumber', 'from', 'to', 'departureDate', 'departureTime', 'arrivalDate', 'arrivalTime', 'price_if_selected', 'price_if_not_selected', 'currency', 'baggage_checkInKgs', 'baggage_checkInPieces', 'baggage_cabinKgs', 'baggage_cabinPieces'];

            if (!requiredHeaders.every(h => headers.includes(h))) {
                setError(`CSV must include the following headers: ${requiredHeaders.join(', ')}`);
                return;
            }

            const newFlightsFromCSV = lines.slice(1).map((line, index) => {
                const data = line.split(',');
                if (data.length < headers.length) return null;

                const flight = {};
                headers.forEach((header, i) => {
                    flight[header] = data[i].trim();
                });

                return {
                    id: `flight-csv-${Date.now()}-${index}`,
                    flightType: flight.flightType || 'domestic',
                    airline: flight.airline,
                    airlineLogoUrl: flight.airlineLogoUrl,
                    flightNumber: flight.flightNumber,
                    from: flight.from,
                    to: flight.to,
                    departureDate: parseDateString(flight.departureDate),
                    departureTime: flight.departureTime,
                    arrivalDate: parseDateString(flight.arrivalDate),
                    arrivalTime: flight.arrivalTime,
                    duration: '',
                    price_if_selected: parseFloat(flight.price_if_selected) || 0,
                    price_if_not_selected: parseFloat(flight.price_if_not_selected) || 0,
                    currency: flight.currency || 'NZD',
                    baggage: {
                        checkInKgs: parseInt(flight.baggage_checkInKgs, 10) || 0,
                        checkInPieces: parseInt(flight.baggage_checkInPieces, 10) || 0,
                        cabinKgs: parseInt(flight.baggage_cabinKgs, 10) || 0,
                        cabinPieces: parseInt(flight.baggage_cabinPieces, 10) || 0,
                    },
                    selected: true,
                };
            }).filter(Boolean);

            setFlights([...flights, ...newFlightsFromCSV]);
            setMessage(`${newFlightsFromCSV.length} flights imported successfully!`);
            setError(null);
        } catch (err) {
            setError(`Failed to process CSV file: ${err.message}`);
        }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const downloadTemplate = () => {
    const headers = "flightType,airline,airlineLogoUrl,flightNumber,from,to,departureDate,departureTime,arrivalDate,arrivalTime,price_if_selected,price_if_not_selected,currency,baggage_checkInKgs,baggage_checkInPieces,baggage_cabinKgs,baggage_cabinPieces";
    const example = "domestic,Jetstar,https://logo.com/jetstar.png,JQ235,Auckland,Christchurch,2025-12-05,14:30,2025-12-05,15:55,0,-350,NZD,23,1,7,1";
    const note = "\n# NOTE: Please use YYYY-MM-DD format for dates. Separate multiple image URLs with a semicolon (;). flightType can be 'domestic' or 'international'.";
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${example}${note}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "flight_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- RENDER FUNCTIONS ---
  const renderFlightForm = (data, setData) => (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6 mt-4">
      <h3 className="text-xl font-bold mb-4 text-gray-800">{editingFlight ? 'Edit Flight' : `Add New ${data.flightType} Flight`}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div><label className="block text-sm font-medium text-gray-700">Airline</label><input type="text" value={data.airline} onChange={(e) => setData({...data, airline: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Flight Number</label><input type="text" value={data.flightNumber} onChange={(e) => setData({...data, flightNumber: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Airline Logo URL</label><input type="text" value={data.airlineLogoUrl} onChange={(e) => setData({...data, airlineLogoUrl: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
        
        <div className="md:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Departure</div>
        <div className="lg:col-span-1"><label className="block text-sm font-medium text-gray-700">From</label><input type="text" value={data.from} onChange={(e) => setData({...data, from: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Date</label><input type="date" value={data.departureDate} onChange={(e) => setData({...data, departureDate: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Time</label><input type="time" value={data.departureTime} onChange={(e) => setData({...data, departureTime: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>

        <div className="md:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Arrival</div>
        <div className="lg:col-span-1"><label className="block text-sm font-medium text-gray-700">To</label><input type="text" value={data.to} onChange={(e) => setData({...data, to: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Date</label><input type="date" value={data.arrivalDate} onChange={(e) => setData({...data, arrivalDate: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Time</label><input type="time" value={data.arrivalTime} onChange={(e) => setData({...data, arrivalTime: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
        
        <div className="md:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Baggage Allowance</div>
        <div><label className="block text-sm font-medium text-gray-700">Check-in (Kgs)</label><input type="number" value={data.baggage.checkInKgs} onChange={(e) => setData({...data, baggage: {...data.baggage, checkInKgs: e.target.value}})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Check-in (Pieces)</label><input type="number" value={data.baggage.checkInPieces} onChange={(e) => setData({...data, baggage: {...data.baggage, checkInPieces: e.target.value}})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
        <div></div>
        <div><label className="block text-sm font-medium text-gray-700">Cabin (Kgs)</label><input type="number" value={data.baggage.cabinKgs} onChange={(e) => setData({...data, baggage: {...data.baggage, cabinKgs: e.target.value}})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Cabin (Pieces)</label><input type="number" value={data.baggage.cabinPieces} onChange={(e) => setData({...data, baggage: {...data.baggage, cabinPieces: e.target.value}})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
        
        <div className="md:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Pricing</div>
        <div><label className="block text-sm font-medium text-gray-700">Price if Selected</label><input type="number" step="0.01" value={data.price_if_selected} onChange={(e) => setData({...data, price_if_selected: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Price if Not Selected</label><input type="number" step="0.01" value={data.price_if_not_selected} onChange={(e) => setData({...data, price_if_not_selected: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Currency</label><select value={data.currency} onChange={(e) => setData({...data, currency: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
          {getCurrencyOptions().map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select></div>
        <div className="lg:col-span-3 flex items-center">
            <input
                type="checkbox"
                id="selected_by_default_flight"
                checked={data.selected}
                onChange={(e) => setData({ ...data, selected: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="selected_by_default_flight" className="ml-2 block text-sm font-medium text-gray-700">
                Selected by default for client
            </label>
        </div>
      </div>
      <div className="flex items-center justify-end space-x-3 mt-6">
        <button onClick={resetForm} className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400">Cancel</button>
        <button onClick={handleSave} className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
          {editingFlight ? 'Update Flight' : 'Save Flight'}
        </button>
      </div>
    </div>
  );
  
  const renderItemRow = (item) => {
    const currentPrice = calculateFinalPrice(item);
    const priceColor = getPriceColor(currentPrice);
    const duration = calculateDuration(item.departureDate, item.departureTime, item.arrivalDate, item.arrivalTime);

    return (
      <div 
        key={item.id} 
        className={`relative p-6 rounded-lg border-2 transition-all duration-300 cursor-pointer w-full ${item.selected ? 'selected-flight-row' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}
        onClick={() => toggleSelection(item.id)}
      >
        <div className="flex flex-col w-full">
            <div className="flex justify-between items-center w-full">
                {item.selected && (
                    <div className="absolute top-1/2 -translate-y-1/2 left-6 rounded-full p-1 shadow-md bg-white z-10">
                        <CheckCircle size={24} className="text-green-500" />
                    </div>
                )}
                <div className="flex items-center gap-6 flex-1 pl-12">
                    <img src={item.airlineLogoUrl || 'https://placehold.co/140x50/E0E0E0/333333?text=Logo'} alt={`${item.airline} logo`} className="h-16 w-auto object-contain"/>
                    <div className="text-sm">
                        <p className="font-bold text-gray-800 text-lg">{item.airline}</p>
                        <p className="text-gray-500">{item.flightNumber}</p>
                    </div>
                </div>
                
                <div className="flex items-center justify-center flex-grow-[2] text-center">
                    <div className="text-right">
                        <p className="text-3xl font-bold">{formatTime(item.departureTime)}</p>
                        <p className="text-xl font-semibold text-gray-700">{item.from}</p>
                        <p className="text-xs text-gray-500">{formatDate(item.departureDate)}</p>
                    </div>
                    <div className="mx-8 text-center">
                        <p className="text-sm text-gray-500">{duration}</p>
                        <div className="w-32 h-px bg-gray-300 relative my-1">
                            <Plane size={16} className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gray-50 px-1 text-gray-500"/>
                        </div>
                        <p className="text-xs text-green-600 font-semibold">Direct</p>
                    </div>
                    <div className="text-left">
                        <p className="text-3xl font-bold">{formatTime(item.arrivalTime)}</p>
                        <p className="text-xl font-semibold text-gray-700">{item.to}</p>
                        <p className="text-xs text-gray-500">{formatDate(item.arrivalDate)}</p>
                    </div>
                </div>

                <div className="flex items-center justify-end flex-1 gap-6">
                    <div className="text-right">
                        <span className={`text-3xl font-bold whitespace-nowrap ${priceColor}`}>
                            {currentPrice < 0 ? `-` : `+`}{getCurrencySymbol(item.currency)}{formatNumberWithCommas(Math.abs(currentPrice))}
                        </span>
                    </div>
                    <div className="flex flex-col space-y-2">
                        <button onClick={(e) => { e.stopPropagation(); setEditingFlight(item); }} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-md"><Edit3 size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"><Trash2 size={16} /></button>
                    </div>
                </div>
            </div>
            
            <div className="w-full mt-4 pt-4 border-t border-gray-200 flex justify-center items-center gap-8 text-sm text-gray-600">
                <p className="font-semibold text-gray-500">Baggage Allowance:</p>
                <div className="flex items-center"><Briefcase size={14} className="mr-2 text-gray-500" /> Check-in: {item.baggage.checkInKgs}kg ({item.baggage.checkInPieces} pc)</div>
                <div className="flex items-center"><Briefcase size={14} className="mr-2 text-gray-500" /> Cabin: {item.baggage.cabinKgs}kg ({item.baggage.cabinPieces} pc)</div>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <style>{`
        .selected-flight-row {
          border-color: ${accentColor};
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        }
      `}</style>

      <div className="p-6 bg-white rounded-2xl shadow-xl border border-gray-100 mb-8">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-800">Manage All Flights</h3>
            <div className="flex items-center gap-2">
                <button onClick={() => fileInputRef.current.click()} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center transition-transform hover:scale-105">
                    <Upload size={18} className="mr-2" /> Import from CSV
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileUpload}
                />
                <button onClick={handleStartAdding} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center transition-transform hover:scale-105">
                    <Plus size={18} className="mr-2" /> Add New Flight
                </button>
            </div>
        </div>
        <div className="text-right mb-4">
            <a href="#" onClick={downloadTemplate} className="text-sm text-blue-600 hover:underline">Download CSV Template</a>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {message && <p className="text-green-600 text-sm mb-4">{message}</p>}
      </div>

      {showTypeSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
             <button onClick={() => setShowTypeSelection(false)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"><X size={24} /></button>
            <h3 className="text-xl font-bold mb-4 text-gray-800">Select Flight Type</h3>
            <div className="grid grid-cols-2 gap-4">
              {flightTypes.map(t => (
                <button key={t.type} onClick={() => handleTypeSelected(t.type)} className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-100 hover:border-yellow-400">
                  <Plane />
                  <span className="mt-2">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {(newFlight && !editingFlight) && renderFlightForm(newFlight, setNewFlight)}
      
      <div className="space-y-12">
        {flightTypes.map(typeInfo => {
          const items = groupedFlights[typeInfo.type];
          if (!items || items.length === 0) return null;
          return (
            <div key={typeInfo.type} className="p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><Plane /> {typeInfo.label}</h3>
              </div>
              
              <div className="space-y-4">
                {items.map(item => (
                  editingFlight?.id === item.id 
                    ? <div key={item.id}>{renderFlightForm(editingFlight, setEditingFlight)}</div>
                    : renderItemRow(item)
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default FlightForm;
