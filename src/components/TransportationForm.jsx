// src/components/TransportationForm.jsx - Version 2.7 (Image Link Input Fix)
import React, { useState, useMemo, useRef } from 'react';
import { Plus, Edit3, Trash2, X, Car, Calendar, Clock, MapPin, ShieldCheck, Users, DollarSign, Image, Link2, Ship, Bus, CheckCircle, Upload, Download } from 'lucide-react';
import { getCurrencySymbol, getCurrencyName, getCurrencyOptions } from '../utils/currencyUtils';

const TransportationForm = ({ transportation, setTransportation, itineraryLegs }) => {
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState(null);
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const fileInputRef = useRef(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [imageLinks, setImageLinks] = useState(''); // State for image URL input
  const accentColor = '#FFD700';

  // Helper function to format number with thousand separators
  const formatNumberWithCommas = (number) => {
    return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const transportationTypes = [
    { type: 'car', label: 'Car Rental', icon: <Car/> },
    { type: 'ferry', label: 'Ferry', icon: <Ship/> },
    { type: 'bus', label: 'Bus', icon: <Bus/> },
    { type: 'driver', label: 'Car with Driver', icon: <Car/> },
  ];

  // --- UTILITY FUNCTIONS ---
  const getCurrencySymbol = (currencyCode) => {
    const symbols = { NZD: 'NZ$', USD: '$', EUR: '€', INR: '₹' };
    return symbols[currencyCode] || currencyCode || 'NZ$';
  };

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

  const getPriceColor = (price) => {
    if (price < 0) return 'text-green-600';
    if (price > 0) return 'text-red-600';
    return 'text-gray-900';
  };

  // --- DATA DERIVATION ---
  const sortedTransportationGroups = useMemo(() => {
    if (!transportation || transportation.length === 0) return [];

    // Group by pickup/onboard point
    const groupedByPickup = (transportation || []).reduce((acc, item) => {
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

        const dateTimeA = new Date(`${parseDateString(getDate(a))}T${getTime(a)}`);
        const dateTimeB = new Date(`${parseDateString(getDate(b))}T${getTime(b)}`);

        if (isNaN(dateTimeA.getTime())) return 1;
        if (isNaN(dateTimeB.getTime())) return -1;

        return dateTimeA.getTime() - dateTimeB.getTime();
      });

      // Determine earliest date for group sorting
      const getDate = (item) => item.pickupDate || item.boardingDate || item.date;
      const getTime = (item) => item.pickupTime || item.boardingTime || item.time || '00:00';
      const firstItem = groupItems[0];
      const sortDate = new Date(`${parseDateString(getDate(firstItem))}T${getTime(firstItem)}`);

      return {
        pickupPoint,
        items: groupItems,
        sortDate: isNaN(sortDate.getTime()) ? new Date(0) : sortDate
      };
    });

    // Sort groups by earliest date
    pickupGroups.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

    return pickupGroups;
  }, [transportation]);

  // --- HANDLER FUNCTIONS ---
  const handleStartAdding = () => {
    setShowTypeSelection(true);
  };
  
  const handleTypeSelected = (type) => {
    let baseItem = {
      id: `transport-${Date.now()}`,
      transportType: type,
      price: '',
      currency: 'NZD',
      images: [],
      selected: false,
    };

    switch (type) {
      case 'car':
        baseItem = { ...baseItem, name: '', type: 'Sedan', pickupLocation: '', pickupDate: '', pickupTime: '10:00', dropoffLocation: '', dropoffDate: '', dropoffTime: '10:00', insurance: 'Basic', excessAmount: '', driversIncluded: 1 };
        break;
      case 'ferry':
        baseItem = { ...baseItem, name: '', boardingFrom: '', boardingDate: '', boardingTime: '09:00', departingTo: '', departingDate: '', departingTime: '12:00', duration: '', baggageAllowance: '' };
        break;
      case 'bus':
        baseItem = { ...baseItem, name: '', boardingFrom: '', boardingDate: '', boardingTime: '08:00', departingTo: '', departingDate: '', departingTime: '17:00', duration: '', baggageAllowance: '' };
        break;
      case 'driver':
        baseItem = { ...baseItem, name: '', carType: 'Sedan', location: '', pickupFrom: 'Hotel', dropoffTo: '', pickupDate: '', pickupTime: '09:00', duration: '' };
        break;
      default: break;
    }
    setNewItem(baseItem);
    setShowTypeSelection(false);
  };

  const handleSave = () => {
    const itemToSave = editingItem || newItem;
    if (!itemToSave) return;
    
    itemToSave.price = parseFloat(itemToSave.price) || 0;
    if(itemToSave.transportType === 'car') {
        itemToSave.excessAmount = parseFloat(itemToSave.excessAmount) || 0;
        itemToSave.driversIncluded = parseInt(itemToSave.driversIncluded, 10) || 1;
    }

    const updatedTransportation = editingItem
      ? (transportation || []).map(t => t.id === itemToSave.id ? itemToSave : t)
      : [...(transportation || []), itemToSave];
      
    setTransportation(updatedTransportation);
    resetForm();
  };

  const handleDelete = (id) => {
    console.log("Confirm deletion of transport with ID:", id);
    setTransportation((transportation || []).filter(t => t.id !== id));
  };
  
  const resetForm = () => {
    setEditingItem(null);
    setNewItem(null);
    setShowTypeSelection(false);
    setImageLinks('');
  };

  const toggleSelection = (id) => {
    const updatedTransportation = (transportation || []).map(t => {
      if (t.id === id) {
        return { ...t, selected: !t.selected };
      }
      return t;
    });
    setTransportation(updatedTransportation);
  };

  const handleAddImageLinks = (currentItem, setItem) => {
    const urls = imageLinks.split('\n').map(url => url.trim()).filter(url => url);
    if (urls.length > 0) {
      setItem(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
      setImageLinks('');
    }
  };

  const handleRemoveImage = (imageToRemoveUrl, currentItem, setItem) => {
    const updatedImages = currentItem.images.filter(url => url !== imageToRemoveUrl);
    setItem(prev => ({ ...prev, images: updatedImages }));
  };

  // --- CSV FUNCTIONS ---
  const parseCSV = (text) => {
    const rows = [];
    let currentLine = '';
    let inQuotes = false;
  
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      currentLine += char;
  
      if (char === '"') {
        inQuotes = !inQuotes;
      }
  
      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (currentLine.trim()) {
          rows.push(currentLine.trim());
        }
        currentLine = '';
        if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
          i++; // Skip the \n in a \r\n sequence
        }
      }
    }
  
    if (currentLine.trim()) {
      rows.push(currentLine.trim());
    }
  
    const parseLine = (line) => {
      const values = [];
      let currentVal = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            currentVal += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(currentVal);
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal);
      return values.map(v => v.trim());
    };
  
    return rows.map(parseLine);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setError('');
      setMessage('');
      try {
        const text = e.target.result;
        const parsedData = parseCSV(text);

        const lines = parsedData.filter(row => row.some(cell => cell.trim() !== '') && !row[0].trim().startsWith('#'));

        if (lines.length < 2) {
          setError("CSV file must contain a header row and at least one data row.");
          return;
        }
        
        const headers = lines[0].map(h => h.trim());
        const requiredHeaders = [
          'transportType', 'name', 'price', 'currency', 'images', 'selected'
        ];
        
        if (!requiredHeaders.every(h => headers.includes(h))) {
          setError(`CSV must include the following headers: ${requiredHeaders.join(', ')}`);
          return;
        }

        const newTransportationFromCSV = [];
        const errors = [];

        lines.slice(1).forEach((data, index) => {
          if (data.length !== headers.length) {
            errors.push(`Line ${index + 2}: Incorrect number of columns. Expected ${headers.length}, but found ${data.length}.`);
            return;
          }

          const transportData = {};
          headers.forEach((header, i) => {
              transportData[header] = data[i] || '';
          });

          // Create base item based on transport type
          let baseItem = {
            id: `transport-csv-${Date.now()}-${index}`,
            transportType: transportData.transportType || 'car',
            name: transportData.name || '',
            price: parseFloat(transportData.price) || 0,
            currency: transportData.currency || 'NZD',
            images: transportData.images ? transportData.images.split(/[;\r\n]+/).map(url => url.trim()).filter(Boolean) : [],
            selected: transportData.selected ? transportData.selected.toUpperCase() === 'TRUE' : false,
          };

          // Add type-specific fields
          switch (transportData.transportType) {
            case 'car':
              baseItem = { 
                ...baseItem, 
                type: transportData.type || 'Sedan',
                pickupLocation: transportData.pickupLocation || '',
                pickupDate: parseDateString(transportData.pickupDate || ''),
                pickupTime: transportData.pickupTime || '10:00',
                dropoffLocation: transportData.dropoffLocation || '',
                dropoffDate: parseDateString(transportData.dropoffDate || ''),
                dropoffTime: transportData.dropoffTime || '10:00',
                insurance: transportData.insurance || 'Basic',
                excessAmount: parseFloat(transportData.excessAmount) || 0,
                driversIncluded: parseInt(transportData.driversIncluded, 10) || 1
              };
              break;
            case 'ferry':
              baseItem = { 
                ...baseItem, 
                boardingFrom: transportData.boardingFrom || '',
                boardingDate: parseDateString(transportData.boardingDate || ''),
                boardingTime: transportData.boardingTime || '09:00',
                departingTo: transportData.departingTo || '',
                departingDate: parseDateString(transportData.departingDate || ''),
                departingTime: transportData.departingTime || '12:00',
                duration: transportData.duration || '',
                baggageAllowance: transportData.baggageAllowance || ''
              };
              break;
            case 'bus':
              baseItem = { 
                ...baseItem, 
                boardingFrom: transportData.boardingFrom || '',
                boardingDate: parseDateString(transportData.boardingDate || ''),
                boardingTime: transportData.boardingTime || '08:00',
                departingTo: transportData.departingTo || '',
                departingDate: parseDateString(transportData.departingDate || ''),
                departingTime: transportData.departingTime || '17:00',
                duration: transportData.duration || '',
                baggageAllowance: transportData.baggageAllowance || ''
              };
              break;
            case 'driver':
              baseItem = { 
                ...baseItem, 
                carType: transportData.carType || 'Sedan',
                location: transportData.location || '',
                pickupFrom: transportData.pickupFrom || 'Hotel',
                dropoffTo: transportData.dropoffTo || '',
                pickupDate: parseDateString(transportData.pickupDate || ''),
                pickupTime: transportData.pickupTime || '09:00',
                duration: transportData.duration || ''
              };
              break;
            default: break;
          }

          newTransportationFromCSV.push(baseItem);
        });

        if (errors.length > 0) {
          setError(`Found errors in ${errors.length} line(s). Please check the file format.`);
          console.error("CSV Parsing Errors:", errors);
        }

        if (newTransportationFromCSV.length > 0) {
          const updatedTransportation = [...(transportation || []), ...newTransportationFromCSV];
          setTransportation(updatedTransportation);
          setMessage(`${newTransportationFromCSV.length} transportation items imported successfully!`);
        } else if (errors.length === 0) {
          setError("No new transportation items were imported. The file might be empty or all rows had errors.");
        }

      } catch (err) {
        setError(`Failed to process CSV file: ${err.message}`);
        console.error(err);
      } finally {
        if (event.target) {
          event.target.value = null;
        }
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const headers = "transportType,name,price,currency,images,selected,type,pickupLocation,pickupDate,pickupTime,dropoffLocation,dropoffDate,dropoffTime,insurance,excessAmount,driversIncluded,boardingFrom,boardingDate,boardingTime,departingTo,departingDate,departingTime,duration,baggageAllowance,carType,location,pickupFrom,dropoffTo";
    const example = `"car","Luxury Sedan","150","NZD","https://example.com/car1.jpg;https://example.com/car2.jpg","TRUE","Sedan","Auckland Airport","2025-10-20","10:00","Queenstown Airport","2025-10-25","14:00","Full","500","1","","","","","","","","","","","","",""`;
    const note = "\n# NOTE: For multiple images, separate URLs with a semicolon (;). transportType can be 'car', 'ferry', 'bus', or 'driver'. Use YYYY-MM-DD format for dates.";
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${example}${note}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transportation_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToCSV = () => {
    if (!transportation || transportation.length === 0) {
      setError("No transportation data to export.");
      return;
    }

    const headers = "transportType,name,price,currency,images,selected,type,pickupLocation,pickupDate,pickupTime,dropoffLocation,dropoffDate,dropoffTime,insurance,excessAmount,driversIncluded,boardingFrom,boardingDate,boardingTime,departingTo,departingDate,departingTime,duration,baggageAllowance,carType,location,pickupFrom,dropoffTo";
    
    const csvRows = transportation.map(item => {
      const row = [
        item.transportType || '',
        item.name || '',
        item.price || 0,
        item.currency || 'NZD',
        (item.images || []).join(';'),
        item.selected ? 'TRUE' : 'FALSE',
        item.type || item.carType || '',
        item.pickupLocation || '',
        item.pickupDate || '',
        item.pickupTime || '',
        item.dropoffLocation || '',
        item.dropoffDate || '',
        item.dropoffTime || '',
        item.insurance || '',
        item.excessAmount || 0,
        item.driversIncluded || 1,
        item.boardingFrom || '',
        item.boardingDate || '',
        item.boardingTime || '',
        item.departingTo || '',
        item.departingDate || '',
        item.departingTime || '',
        item.duration || '',
        item.baggageAllowance || '',
        item.carType || '',
        item.location || '',
        item.pickupFrom || '',
        item.dropoffTo || ''
      ];
      return row.map(field => `"${field}"`).join(',');
    });

    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${csvRows.join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transportation_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage("Transportation data exported successfully!");
  };

  // --- RENDER FUNCTIONS ---
  const renderCarForm = (data, setData) => (
    <>
      <div><label className="block text-sm font-medium text-gray-700">Car Name</label><input type="text" value={data.name} onChange={(e) => setData({...data, name: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div><label className="block text-sm font-medium text-gray-700">Type of Car</label><select value={data.type} onChange={(e) => setData({...data, type: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"><option>Sedan</option><option>SUV</option><option>Hatchback</option><option>Van</option><option>Luxury</option></select></div>
      <div className="md:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Pickup Details</div>
      <div><label className="block text-sm font-medium text-gray-700">Location</label><input type="text" value={data.pickupLocation} onChange={(e) => setData({...data, pickupLocation: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div><label className="block text-sm font-medium text-gray-700">Date</label><input type="date" value={data.pickupDate} onChange={(e) => setData({...data, pickupDate: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div><label className="block text-sm font-medium text-gray-700">Time</label><input type="time" value={data.pickupTime} onChange={(e) => setData({...data, pickupTime: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div className="md:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Drop-off Details</div>
      <div><label className="block text-sm font-medium text-gray-700">Location</label><input type="text" value={data.dropoffLocation} onChange={(e) => setData({...data, dropoffLocation: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div><label className="block text-sm font-medium text-gray-700">Date</label><input type="date" value={data.dropoffDate} onChange={(e) => setData({...data, dropoffDate: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div><label className="block text-sm font-medium text-gray-700">Time</label><input type="time" value={data.dropoffTime} onChange={(e) => setData({...data, dropoffTime: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div className="md:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Other Details</div>
      <div><label className="block text-sm font-medium text-gray-700">Insurance</label><select value={data.insurance} onChange={(e) => setData({...data, insurance: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"><option>Basic</option><option>Medium</option><option>Full</option></select></div>
      <div><label className="block text-sm font-medium text-gray-700">Excess Amount</label><input type="number" step="0.01" value={data.excessAmount} onChange={(e) => setData({...data, excessAmount: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., 500"/></div>
      <div><label className="block text-sm font-medium text-gray-700">Drivers Included</label><input type="number" min="1" value={data.driversIncluded} onChange={(e) => setData({...data, driversIncluded: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
    </>
  );

  const renderFerryBusForm = (data, setData, type) => (
    <>
      <div><label className="block text-sm font-medium text-gray-700">{type === 'ferry' ? 'Ferry' : 'Bus'} Name</label><input type="text" value={data.name} onChange={(e) => setData({...data, name: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div className="md:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Departure</div>
      <div><label className="block text-sm font-medium text-gray-700">Boarding From</label><input type="text" value={data.boardingFrom} onChange={(e) => setData({...data, boardingFrom: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div><label className="block text-sm font-medium text-gray-700">Boarding Date</label><input type="date" value={data.boardingDate} onChange={(e) => setData({...data, boardingDate: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div><label className="block text-sm font-medium text-gray-700">Boarding Time</label><input type="time" value={data.boardingTime} onChange={(e) => setData({...data, boardingTime: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div className="md:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Arrival</div>
      <div><label className="block text-sm font-medium text-gray-700">Departing To</label><input type="text" value={data.departingTo} onChange={(e) => setData({...data, departingTo: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div><label className="block text-sm font-medium text-gray-700">Arrival Date</label><input type="date" value={data.departingDate} onChange={(e) => setData({...data, departingDate: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div><label className="block text-sm font-medium text-gray-700">Arrival Time</label><input type="time" value={data.departingTime} onChange={(e) => setData({...data, departingTime: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div className="md:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Other Details</div>
      <div><label className="block text-sm font-medium text-gray-700">Duration</label><input type="text" value={data.duration} onChange={(e) => setData({...data, duration: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., 3 hours"/></div>
      <div><label className="block text-sm font-medium text-gray-700">Baggage Allowance</label><input type="text" value={data.baggageAllowance} onChange={(e) => setData({...data, baggageAllowance: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., 2 bags"/></div>
    </>
  );

  const renderDriverForm = (data, setData) => (
    <>
      <div><label className="block text-sm font-medium text-gray-700">Service Name</label><input type="text" value={data.name} onChange={(e) => setData({...data, name: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div><label className="block text-sm font-medium text-gray-700">Car Type</label><input type="text" value={data.carType} onChange={(e) => setData({...data, carType: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div><label className="block text-sm font-medium text-gray-700">Location</label><input type="text" value={data.location} onChange={(e) => setData({...data, location: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div className="md:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Pickup Details</div>
      <div><label className="block text-sm font-medium text-gray-700">Pickup From</label><input type="text" value={data.pickupFrom} onChange={(e) => setData({...data, pickupFrom: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Hotel Lobby"/></div>
      <div><label className="block text-sm font-medium text-gray-700">Drop-off To</label><input type="text" value={data.dropoffTo} onChange={(e) => setData({...data, dropoffTo: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Airport"/></div>
      <div><label className="block text-sm font-medium text-gray-700">Date</label><input type="date" value={data.pickupDate} onChange={(e) => setData({...data, pickupDate: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div><label className="block text-sm font-medium text-gray-700">Time</label><input type="time" value={data.pickupTime} onChange={(e) => setData({...data, pickupTime: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div className="md:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Other Details</div>
      <div><label className="block text-sm font-medium text-gray-700">Duration</label><input type="text" value={data.duration} onChange={(e) => setData({...data, duration: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., 4 hours"/></div>
    </>
  );
  
  const renderForm = (data, setData) => {
    console.log('renderForm called with data:', data);
    if (!data || !data.transportType) {
      console.error('Invalid data or missing transportType:', data);
      return (
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 mb-6">
          <p className="text-red-600">Error: Invalid transportation item. Missing transportType field.</p>
          <button onClick={resetForm} className="mt-4 bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400">Cancel</button>
        </div>
      );
    }

    let fields;
    // Convert to lowercase for case-insensitive matching
    const transportTypeLower = data.transportType.toLowerCase();
    switch (transportTypeLower) {
      case 'car':
      case 'van':
      case 'suv':
      case 'sedan':
        fields = renderCarForm(data, setData);
        break;
      case 'ferry':
        fields = renderFerryBusForm(data, setData, 'ferry');
        break;
      case 'bus':
        fields = renderFerryBusForm(data, setData, 'bus');
        break;
      case 'driver':
        fields = renderDriverForm(data, setData);
        break;
      default:
        console.error('Unknown transportType:', data.transportType);
        return (
          <div className="bg-red-50 p-6 rounded-lg border border-red-200 mb-6">
            <p className="text-red-600">Error: Unknown transportation type "{data.transportType}". Supported types: car, van, suv, sedan, ferry, bus, driver.</p>
            <button onClick={resetForm} className="mt-4 bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400">Cancel</button>
          </div>
        );
    }
    return (
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6 mt-4">
          <h3 className="text-xl font-bold mb-4 text-gray-800">{editingItem ? `Edit ${data.transportType}` : `Add New ${data.transportType}`}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fields}
              <div className="lg:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Pricing & Images</div>
              <div><label className="block text-sm font-medium text-gray-700">Price (Differential)</label><input type="number" step="0.01" value={data.price} onChange={(e) => setData({...data, price: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., 150 or -50"/></div>
              <div><label className="block text-sm font-medium text-gray-700">Currency</label><select value={data.currency} onChange={(e) => setData({...data, currency: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                {getCurrencyOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select></div>
              <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Image URLs (one per line)</label>
                  <textarea rows="3" value={imageLinks} onChange={(e) => setImageLinks(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></textarea>
                  <button onClick={() => handleAddImageLinks(data, setData)} className="mt-2 text-sm bg-blue-500 text-white py-1 px-3 rounded-md hover:bg-blue-600 flex items-center"><Link2 size={14} className="mr-1" /> Add from Links</button>
              </div>
              <div className="lg:col-span-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {(data.images || []).map((img, index) => (
                      <div key={index} className="relative group">
                          <img src={img} alt={`Transport ${index + 1}`} className="w-full h-24 object-cover rounded-md" />
                          <button onClick={() => handleRemoveImage(img, data, setData)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X size={12} /></button>
                      </div>
                  ))}
              </div>
          </div>
          <div className="flex items-center justify-end space-x-3 mt-6">
              <button onClick={resetForm} className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400">Cancel</button>
              <button onClick={handleSave} className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
                  {editingItem ? 'Update' : 'Save'}
              </button>
          </div>
      </div>
    );
  };
  
  const renderItemRow = (item) => {
    const price = parseFloat(item.price) || 0;
    const priceColor = getPriceColor(price);

    return (
      <div 
        key={item.id} 
        className={`relative p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer flex flex-col lg:flex-row items-start lg:items-center gap-6 w-full ${item.selected ? 'selected-transport-row' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}
        onClick={() => toggleSelection(item.id)}
      >
        {item.selected && (
          <div className="absolute top-4 left-4 rounded-full p-1 shadow-md bg-white z-10">
            <CheckCircle size={24} className="text-green-500" />
          </div>
        )}
        <img src={item.images?.[0] || 'https://placehold.co/200x120/E0E0E0/333333?text=No+Image'} alt={item.name} className="w-full lg:w-48 h-auto object-cover rounded-md shadow-md flex-shrink-0" />
        <div className="flex-grow">
          <h4 className="font-bold text-xl text-gray-800">{item.name}</h4>
          <p className="text-md text-gray-500 mb-4 capitalize">{item.type || item.carType}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-700">
            {item.transportType === 'car' && <>
              <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-500" /> <strong>Pickup:</strong> &nbsp;{item.pickupLocation}</div>
              <div className="flex items-center"><Calendar size={14} className="mr-2 text-gray-500" /> <strong>On:</strong> &nbsp;{formatDate(item.pickupDate)} at {formatTime(item.pickupTime)}</div>
              <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-500" /> <strong>Drop-off:</strong> &nbsp;{item.dropoffLocation}</div>
              <div className="flex items-center"><Calendar size={14} className="mr-2 text-gray-500" /> <strong>On:</strong> &nbsp;{formatDate(item.dropoffDate)} at {formatTime(item.dropoffTime)}</div>
              <div className="flex items-center"><ShieldCheck size={14} className="mr-2 text-gray-500" /> <strong>Insurance:</strong> &nbsp;{item.insurance} (Excess: {getCurrencySymbol(item.currency)}{item.excessAmount || '0'})</div>
              <div className="flex items-center"><Users size={14} className="mr-2 text-gray-500" /> <strong>Drivers:</strong> &nbsp;{item.driversIncluded}</div>
            </>}
            {(item.transportType === 'ferry' || item.transportType === 'bus') && <>
              <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-500" /> <strong>From:</strong> &nbsp;{item.boardingFrom}</div>
              <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-500" /> <strong>To:</strong> &nbsp;{item.departingTo}</div>
              <div className="flex items-center"><Calendar size={14} className="mr-2 text-gray-500" /> <strong>On:</strong> &nbsp;{formatDate(item.boardingDate)} at {formatTime(item.boardingTime)}</div>
              <div className="flex items-center"><strong>Duration:</strong> &nbsp;{item.duration}</div>
              <div className="flex items-center"><strong>Baggage:</strong> &nbsp;{item.baggageAllowance}</div>
            </>}
            {item.transportType === 'driver' && <>
              <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-500" /> <strong>Pickup:</strong> &nbsp;{item.pickupFrom} ({item.location})</div>
              <div className="flex items-center"><MapPin size={14} className="mr-2 text-gray-500" /> <strong>Drop-off:</strong> &nbsp;{item.dropoffTo}</div>
              <div className="flex items-center"><Calendar size={14} className="mr-2 text-gray-500" /> <strong>On:</strong> &nbsp;{formatDate(item.pickupDate)} at {formatTime(item.pickupTime)}</div>
              <div className="flex items-center"><strong>Duration:</strong> &nbsp;{item.duration}</div>
            </>}
          </div>
        </div>
        <div className="w-full lg:w-auto text-right mt-4 lg:mt-0 lg:ml-auto flex-shrink-0">
          <span className={`text-3xl font-bold whitespace-nowrap ${priceColor}`}>
            {`${price < 0 ? '-' : '+'}${getCurrencySymbol(item.currency)}${formatNumberWithCommas(Math.abs(price))}`}
          </span>
        </div>
        <div className="absolute top-4 right-4 flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Editing item:', item);
                setEditingItem(item);
                // Populate imageLinks with existing images for editing
                if (item.images && item.images.length > 0) {
                  setImageLinks(item.images.join('\n'));
                } else {
                  setImageLinks('');
                }
                // Scroll to the item after a brief delay to ensure DOM update
                setTimeout(() => {
                  const element = document.getElementById(`transport-${item.id}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-md"
            >
              <Edit3 size={16} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"><Trash2 size={16} /></button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <style>{`
        .selected-transport-row {
          border-color: ${accentColor};
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        }
      `}</style>

      {showTypeSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
             <button onClick={() => setShowTypeSelection(false)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"><X size={24} /></button>
            <h3 className="text-xl font-bold mb-4 text-gray-800">Select Transportation Type</h3>
            <div className="grid grid-cols-2 gap-4">
              {transportationTypes.map(t => (
                <button key={t.type} onClick={() => handleTypeSelected(t.type)} className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-100 hover:border-yellow-400">
                  {t.icon}
                  <span className="mt-2">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="p-6 bg-white rounded-2xl shadow-xl border border-gray-100 mb-8">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-800">Manage Transportation</h3>
            <div className="flex items-center gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileUpload}
                />
                <button onClick={() => fileInputRef.current.click()} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center transition-transform hover:scale-105">
                    <Upload size={18} className="mr-2" /> Import from CSV
                </button>
                <button onClick={exportToCSV} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center transition-transform hover:scale-105">
                    <Download size={18} className="mr-2" /> Export to CSV
                </button>
                <button onClick={handleStartAdding} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center transition-transform hover:scale-105">
                    <Plus size={18} className="mr-2" /> Add New Transportation
                </button>
            </div>
        </div>
        <div className="text-right mb-4">
            <a href="#" onClick={downloadTemplate} className="text-sm text-blue-600 hover:underline">Download CSV Template</a>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {message && <p className="text-green-600 text-sm mb-4">{message}</p>}
      </div>

      {(newItem && !editingItem) && renderForm(newItem, setNewItem)}

      <div className="space-y-8">
        {sortedTransportationGroups.map(({ pickupPoint, items }) => (
          <div key={pickupPoint} className="p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{pickupPoint}</h3>
              </div>
            </div>

            {items.length > 0 ? (
              <div className="space-y-4">
                {items.map(item => (
                  editingItem?.id === item.id
                    ? <div key={item.id} id={`transport-${item.id}`}>{renderForm(editingItem, setEditingItem)}</div>
                    : renderItemRow(item)
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No transportation options added for {pickupPoint} yet.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransportationForm;
