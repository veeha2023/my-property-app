// src/components/ActivityForm.jsx - Version 4.2 (Display Logic Fix)
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Plus, Edit3, Trash2, X, Image, Link2, Calendar, Clock, MapPin, Users, DollarSign, ChevronsRight, CheckCircle, Upload } from 'lucide-react';

const ActivityForm = ({ activities, setActivities, itineraryLegs }) => {
  const [editingActivity, setEditingActivity] = useState(null);
  const [addingToLocation, setAddingToLocation] = useState(null);
  const [newActivity, setNewActivity] = useState(null);
  const [imageLinks, setImageLinks] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [showDateTime, setShowDateTime] = useState(false); // State for the toggle
  const fileInputRef = useRef(null);
  const accentColor = '#FFD700';

  // --- UTILITY FUNCTIONS ---
  // Helper function to format number with thousand separators
  const formatNumberWithCommas = (number) => {
    return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getCurrencySymbol = (currencyCode) => {
    switch (currencyCode) {
      case 'NZD': return 'NZ$';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'INR': return '₹';
      default: return currencyCode || 'NZ$';
    }
  };
  
  const parseDateString = (dateString) => {
    if (!dateString) return '';
    // Check for YYYY-MM-DD format (preferred)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    // Check for DD/MM/YYYY format
    const parts = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (parts) {
      const day = parts[1].padStart(2, '0');
      const month = parts[2].padStart(2, '0');
      const year = parts[3];
      // Convert to YYYY-MM-DD which is reliably parsed by new Date()
      return `${year}-${month}-${day}`;
    }
    // Return original string if format is not recognized, allowing new Date() to attempt parsing
    return dateString;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'; // This will now only be called if dateString exists
    try {
      // Use the robust parser before creating a Date object
      const parsedDateStr = parseDateString(dateString);
      const date = new Date(parsedDateStr + 'T00:00:00'); // Add time part to avoid timezone issues
      if (isNaN(date.getTime())) return 'Invalid Date';
      return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    } catch { return 'Invalid Date'; }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'; // This will now only be called if timeString exists
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(hours, minutes);
      return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(date);
    } catch { return 'Invalid Time'; }
  };

  const calculateBasePrice = (activity) => {
    const costPerPax = parseFloat(activity.cost_per_pax) || 0;
    const flatPrice = parseFloat(activity.flat_price) || 0;
    const pax = parseInt(activity.pax, 10) || 1;

    return (costPerPax * pax) + flatPrice;
  };

  const getPriceColor = (price) => {
    if (price < 0) return 'text-green-600';
    if (price > 0) return 'text-red-600';
    return 'text-gray-900';
  };
  
  const sortedActivityGroups = useMemo(() => {
    // First, group existing activities by location
    const groupedByLocation = (activities || []).reduce((acc, activity) => {
      const location = activity.location || 'Uncategorized';
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(activity);
      return acc;
    }, {});

    // Add all itinerary legs as location groups (even if they don't have activities)
    const allLocations = new Set();

    // Add locations from itinerary legs
    (itineraryLegs || []).forEach(leg => {
      if (leg.location) {
        allLocations.add(leg.location);
      }
    });

    // Add locations from existing activities
    Object.keys(groupedByLocation).forEach(location => {
      allLocations.add(location);
    });

    const locationGroups = Array.from(allLocations).map(location => {
      const groupActivities = groupedByLocation[location] || [];

      // Sort activities by date/time
      groupActivities.sort((a, b) => {
        const dateA = new Date(parseDateString(a.date) + 'T' + (a.time || '00:00'));
        const dateB = new Date(parseDateString(b.date) + 'T' + (b.time || '00:00'));
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateA.getTime() - dateB.getTime();
      });

      // Find the corresponding itinerary leg for sorting
      const itineraryLeg = (itineraryLegs || []).find(leg => leg.location === location);

      // Use itinerary leg's check-in date for sorting, or earliest activity date
      let sortDate;
      if (itineraryLeg && itineraryLeg.checkIn) {
        sortDate = new Date(parseDateString(itineraryLeg.checkIn) + 'T00:00:00');
      } else if (groupActivities.length > 0) {
        const earliestActivity = groupActivities[0];
        sortDate = new Date(parseDateString(earliestActivity.date) + 'T' + (earliestActivity.time || '00:00'));
      } else {
        sortDate = new Date(0);
      }

      return {
        location,
        activities: groupActivities,
        sortDate: isNaN(sortDate.getTime()) ? new Date(0) : sortDate,
        itineraryLeg, // Include the itinerary leg data
      };
    });

    // Sort by date
    locationGroups.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

    return locationGroups;
  }, [activities, itineraryLegs]);

  // --- HANDLER FUNCTIONS ---
  const handleStartAdding = (location) => {
    setAddingToLocation(location);
    setEditingActivity(null);
    setNewActivity({
      id: `act-${Date.now()}`,
      name: '',
      date: '',
      time: '',
      location: location,
      duration: '',
      pax: 1,
      cost_per_pax: 0,
      flat_price: 0,
      currency: 'NZD',
      images: [],
      included_in_base: true, // Default to included in base quote
      selected: true, // Default to selected
    });
    setShowDateTime(false); // Default to false for new activities
  };

  const handleSave = () => {
    let updatedActivities;
    const activityToSave = editingActivity || newActivity;

    activityToSave.pax = parseInt(activityToSave.pax, 10) || 1;
    activityToSave.cost_per_pax = parseFloat(activityToSave.cost_per_pax) || 0;
    activityToSave.flat_price = parseFloat(activityToSave.flat_price) || 0;

    // Calculate and store the base price contribution for this activity
    activityToSave.base_price = (activityToSave.cost_per_pax * activityToSave.pax) + activityToSave.flat_price;

    // --- BUG FIX ---
    // If the date/time toggle is off, clear the date and time fields before saving
    if (!showDateTime) {
      activityToSave.date = '';
      activityToSave.time = '';
    }
    // --- END BUG FIX ---

    if (editingActivity) {
      updatedActivities = activities.map(act => act.id === activityToSave.id ? activityToSave : act);
    } else {
      updatedActivities = [...activities, activityToSave];
    }
    setActivities(updatedActivities);
    resetForm();
  };

  const handleDelete = (id) => {
    console.log("Confirm deletion of activity with ID:", id);
    const updatedActivities = activities.filter(act => act.id !== id);
    setActivities(updatedActivities);
  };

  const toggleSelection = useCallback((activityId) => {
    if (typeof setActivities === 'function') {
      const updatedActivities = (activities || []).map(act => {
        if (act && act.id === activityId) {
          return { ...act, selected: !act.selected };
        }
        return act;
      });
      setActivities(updatedActivities);
    } else {
      console.error("ActivityForm: setActivities prop is not a function in toggleSelection.");
    }
  }, [activities, setActivities]);

  const resetForm = () => {
    setAddingToLocation(null);
    setEditingActivity(null);
    setNewActivity(null);
    setImageLinks('');
    setShowDateTime(false); // Reset toggle on form close
  };

  const handleAddImageLinks = (currentActivity, setFunc) => {
    const urls = imageLinks.split('\n').map(url => url.trim()).filter(url => url);
    if (urls.length > 0) {
      setFunc(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
      setImageLinks('');
    }
  };

  const handleRemoveImage = (imageToRemoveUrl, currentActivity, setFunc) => {
    const updatedImages = currentActivity.images.filter(url => url !== imageToRemoveUrl);
    setFunc(prev => ({ ...prev, images: updatedImages }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target.result;
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '' && !line.startsWith('#'));
            if (lines.length < 2) {
                setError("CSV file must contain a header row and at least one data row.");
                return;
            }
            const headers = lines[0].split(',').map(h => h.trim());
            
            // --- CSV HEADER UPDATE ---
            const coreHeaders = ['name', 'location', 'duration', 'pax', 'cost_per_pax', 'currency', 'images'];
            const missingHeaders = coreHeaders.filter(h => !headers.includes(h));
            
            if (missingHeaders.length > 0) {
                setError(`CSV is missing required headers: ${missingHeaders.join(', ')}`);
                return;
            }
            // --- END CSV HEADER UPDATE ---

            const newActivitiesFromCSV = lines.slice(1).map((line, index) => {
                const data = line.split(',');
                if (data.length < headers.length) {
                    // Handle case where trailing commas might be omitted for empty optional fields
                    while (data.length < headers.length) {
                        data.push('');
                    }
                }

                const activity = {};
                headers.forEach((header, i) => {
                    activity[header] = data[i] ? data[i].trim() : '';
                });

                // Ensure core fields are present
                if (!activity.name || !activity.location) {
                    return null;
                }

                const pax = parseInt(activity.pax, 10) || 1;
                const costPerPax = parseFloat(activity.cost_per_pax) || 0;
                const flatPrice = parseFloat(activity.flat_price) || 0;
                const basePrice = (costPerPax * pax) + flatPrice;

                // Parse included_in_base: if explicitly 'false' or 'FALSE', set to false; otherwise default to true
                const includedInBase = activity.included_in_base?.toLowerCase() !== 'false';

                // Parse selected: if CSV has explicit value, use it; otherwise match included_in_base
                // (included in base = selected by default, not included = deselected by default)
                let selected;
                if (activity.selected && activity.selected.trim() !== '') {
                    // Explicit value provided in CSV
                    selected = activity.selected.toLowerCase() !== 'false';
                } else {
                    // No explicit value: default based on included_in_base
                    selected = includedInBase;
                }

                return {
                    id: `act-csv-${Date.now()}-${index}`,
                    name: activity.name,
                    // Conditionally assign date/time only if columns exist and have data
                    date: activity.date ? parseDateString(activity.date) : '',
                    time: activity.time || '',
                    location: activity.location,
                    duration: parseFloat(activity.duration) || 0,
                    pax,
                    cost_per_pax: costPerPax,
                    flat_price: flatPrice,
                    base_price: basePrice,
                    currency: activity.currency || 'NZD',
                    images: activity.images ? activity.images.split(';').map(url => url.trim()) : [],
                    included_in_base: includedInBase,
                    selected: selected,
                };
            }).filter(Boolean);

            setActivities([...activities, ...newActivitiesFromCSV]);
            setMessage(`${newActivitiesFromCSV.length} activities imported successfully!`);
            setError(null);
        } catch (err) {
            setError(`Failed to process CSV file: ${err.message}`);
        }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const downloadTemplate = () => {
    // --- CSV TEMPLATE UPDATE ---
    const headers = "name,location,duration,pax,cost_per_pax,flat_price,currency,images,included_in_base,date,time";
    const exampleWithDate = "Skydiving,Queenstown,3,2,140,50,NZD,https://example.com/image1.jpg,true,2025-08-15,10:00";
    const exampleWithoutDate = "Guided Hike,Queenstown,4,2,25,0,NZD,https://example.com/hike.jpg,false,,";

    const note = [
        "\n# NOTE: Required headers are: name, location, duration, pax, cost_per_pax, currency, images.",
        "# 'flat_price' is OPTIONAL - adds a fixed cost on top of per-pax pricing.",
        "# 'included_in_base' - true means included in base quote, false means optional add-on.",
        "# 'date' and 'time' headers are OPTIONAL. You can leave them blank or omit them entirely.",
        "# Please use YYYY-MM-DD format for dates for best compatibility.",
        "# Separate multiple image URLs with a semicolon (;) in the 'images' column.",
        "# Base price is calculated as: (cost_per_pax × pax) + flat_price"
    ].join('\n');

    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${exampleWithDate}\n${exampleWithoutDate}${note}`;
    // --- END CSV TEMPLATE UPDATE ---

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "activity_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- RENDER FUNCTIONS ---
  const renderForm = (activityData, setActivityData) => (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">{editingActivity ? 'Edit Activity' : `Add New Activity for ${addingToLocation}`}</h3>
        <div className="flex items-center">
            <label htmlFor="showDateTimeToggle" className="text-sm font-medium text-gray-700 mr-2">Show Date/Time</label>
            <input
                type="checkbox"
                id="showDateTimeToggle"
                checked={showDateTime}
                onChange={(e) => setShowDateTime(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Activity Name</label>
            <input type="text" value={activityData.name} onChange={(e) => setActivityData({...activityData, name: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input type="text" value={activityData.location} readOnly className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-100" />
        </div>
        
        {/* Conditionally render Date and Time fields */}
        {showDateTime && (
          <>
            <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input type="date" value={activityData.date} onChange={(e) => setActivityData({...activityData, date: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Time</label>
                <input type="time" value={activityData.time} onChange={(e) => setActivityData({...activityData, time: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
          </>
        )}
        
        <div>
            <label className="block text-sm font-medium text-gray-700">Duration (in hours)</label>
            <input type="number" placeholder="e.g., 3" value={activityData.duration} onChange={(e) => setActivityData({...activityData, duration: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Pax</label>
            <input type="number" min="1" value={activityData.pax} onChange={(e) => setActivityData({...activityData, pax: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Cost Per Pax</label>
            <input type="number" step="0.01" value={activityData.cost_per_pax || ''} onChange={(e) => setActivityData({...activityData, cost_per_pax: e.target.value})} placeholder="e.g., 140" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Flat Price (Optional)</label>
            <input type="number" step="0.01" value={activityData.flat_price || ''} onChange={(e) => setActivityData({...activityData, flat_price: e.target.value})} placeholder="e.g., 50" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Currency</label>
            <select value={activityData.currency} onChange={(e) => setActivityData({...activityData, currency: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                <option value="NZD">NZ$</option>
                <option value="USD">$</option>
                <option value="EUR">€</option>
                <option value="INR">₹</option>
            </select>
        </div>
        <div className="lg:col-span-3 flex items-center">
            <input
                type="checkbox"
                id="included_in_base"
                checked={activityData.included_in_base !== false}
                onChange={(e) => setActivityData({ ...activityData, included_in_base: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="included_in_base" className="ml-2 block text-sm font-medium text-gray-700">
                Included in Base Quote
            </label>
        </div>
        <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Image URLs (one per line)</label>
            <textarea rows="3" value={imageLinks} onChange={(e) => setImageLinks(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></textarea>
            <button onClick={() => handleAddImageLinks(activityData, setActivityData)} className="mt-2 text-sm bg-blue-500 text-white py-1 px-3 rounded-md hover:bg-blue-600 flex items-center"><Link2 size={14} className="mr-1" /> Add from Links</button>
        </div>
        <div className="lg:col-span-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {(activityData.images || []).map((img, index) => (
                <div key={index} className="relative group">
                    <img src={img} alt={`Activity ${index + 1}`} className="w-full h-24 object-cover rounded-md" />
                    <button onClick={() => handleRemoveImage(img, activityData, setActivityData)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X size={12} /></button>
                </div>
            ))}
        </div>
      </div>
      <div className="flex items-center justify-end space-x-3 mt-4">
          <button onClick={resetForm} className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400">Cancel</button>
          <button onClick={handleSave} className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
              {editingActivity ? 'Update Activity' : 'Save Activity'}
          </button>
      </div>
    </div>
  );

  return (
    <div>
      <style>{`
        .selected-activity-card {
          border-color: ${accentColor};
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.7);
          border-width: 4px;
        }
      `}</style>
      
      <div className="p-6 bg-white rounded-2xl shadow-xl border border-gray-100 mb-8">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-800">Manage All Activities</h3>
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
            </div>
        </div>
        <div className="text-right mb-4">
            <a href="#" onClick={downloadTemplate} className="text-sm text-blue-600 hover:underline">Download CSV Template</a>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {message && <p className="text-green-600 text-sm mb-4">{message}</p>}
      </div>

      <div className="space-y-8">
        {sortedActivityGroups.map(({ location, activities: locationActivities, itineraryLeg }) => (
            <div key={location} className="p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{location}</h3>
                  {itineraryLeg && itineraryLeg.checkIn && itineraryLeg.checkOut && (
                    <p className="text-sm text-gray-600 mt-1 flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {formatDate(itineraryLeg.checkIn)} - {formatDate(itineraryLeg.checkOut)}
                      {itineraryLeg.checkIn && itineraryLeg.checkOut && (
                        <span className="ml-2">
                          ({Math.max(0, Math.ceil((new Date(parseDateString(itineraryLeg.checkOut)) - new Date(parseDateString(itineraryLeg.checkIn))) / (1000 * 60 * 60 * 24)))} nights)
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <button onClick={() => handleStartAdding(location)} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center transition-transform hover:scale-105">
                  <Plus size={18} className="mr-2" /> Add Activity
                </button>
              </div>

              {addingToLocation === location && renderForm(newActivity, setNewActivity)}
              
              {locationActivities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {locationActivities.map(activity => {
                    if (editingActivity && editingActivity.id === activity.id) {
                      return <div key={activity.id} className="sm:col-span-2 xl:col-span-3">{renderForm(editingActivity, setEditingActivity)}</div>;
                    }
                    const basePrice = calculateBasePrice(activity);
                    const priceColor = getPriceColor(basePrice);
                    const isIncluded = activity.included_in_base !== false;
                    const isSelected = activity.selected !== false;
                    return (
                      <div
                        key={activity.id}
                        className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-300 group overflow-hidden cursor-pointer ${isSelected ? 'selected-activity-card' : 'border-gray-200'}`}
                        onClick={() => toggleSelection(activity.id)}
                      >
                        <div className="relative aspect-video">
                          {activity.images && activity.images.length > 0 ? (
                            <img src={activity.images[0]} alt={activity.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                              <Image size={40} />
                            </div>
                          )}
                          <div className="absolute top-3 left-3 z-10">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelection(activity.id);
                              }}
                              className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                          </div>
                          {isIncluded && (
                            <div className="absolute top-3 left-10 bg-white rounded-full p-1 shadow-lg">
                              <CheckCircle size={20} className="text-green-500" />
                            </div>
                          )}
                          <div className="absolute top-3 right-3 flex space-x-2">
                            <button onClick={(e) => { 
                                e.stopPropagation(); 
                                setEditingActivity(activity); 
                                setShowDateTime(!!(activity.date || activity.time)); // Show if date or time exists
                                setAddingToLocation(null); 
                            }} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-md"><Edit3 size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(activity.id); }} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"><Trash2 size={16} /></button>
                          </div>
                        </div>
                        <div className="p-4 flex flex-col justify-between flex-grow">
                          <div>
                            <h4 className="font-bold text-lg text-gray-800 truncate">{activity.name}</h4>
                            <div className="mt-2 space-y-2 text-sm text-gray-600">
                              
                              {/* --- DISPLAY LOGIC FIX --- */}
                              {/* Only show date if activity.date is not an empty string */}
                              {activity.date && (
                                <div className="flex items-center"><Calendar size={16} className="mr-2 text-gray-400" /> <span>{formatDate(activity.date)}</span></div>
                              )}
                              {/* Only show time if activity.time is not an empty string */}
                              {activity.time && (
                                <div className="flex items-center"><Clock size={16} className="mr-2 text-gray-400" /> <span>{formatTime(activity.time)}</span></div>
                              )}
                              {/* --- END DISPLAY LOGIC FIX --- */}

                              <div className="flex items-center"><ChevronsRight size={16} className="mr-2 text-gray-400" /> <span>{activity.duration} hours</span></div>
                              <div className="flex items-center"><Users size={16} className="mr-2 text-gray-400" /> <span>{activity.pax} Pax</span></div>
                            </div>
                          </div>
                          <div className="mt-4 text-right">
                            <span className={`text-2xl font-bold ${priceColor}`}>
                              {getCurrencySymbol(activity.currency)}{formatNumberWithCommas(basePrice)}
                            </span>
                            {isIncluded && <div className="text-xs text-green-600 mt-1">Included in Base</div>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                !addingToLocation && <p className="text-center text-gray-500 py-4">No activities added for {location} yet.</p>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ActivityForm;