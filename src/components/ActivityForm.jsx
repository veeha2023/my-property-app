// src/components/ActivityForm.jsx - Version 3.3 (Activity Sorting)
import React, { useState, useMemo } from 'react';
import { Plus, Edit3, Trash2, X, Image, Link2, Calendar, Clock, MapPin, Users, DollarSign, ChevronsRight, CheckCircle } from 'lucide-react';

const ActivityForm = ({ activities, setActivities, itineraryLegs }) => {
  const [editingActivity, setEditingActivity] = useState(null);
  const [addingToLocation, setAddingToLocation] = useState(null);
  const [newActivity, setNewActivity] = useState(null);
  const [imageLinks, setImageLinks] = useState('');
  const accentColor = '#FFD700';

  // --- UTILITY FUNCTIONS ---
  const getCurrencySymbol = (currencyCode) => {
    switch (currencyCode) {
      case 'NZD': return 'NZ$';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'INR': return '₹';
      default: return currencyCode || 'NZ$';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString + 'T00:00:00');
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

  const calculateFinalPrice = (activity) => {
    const pax = parseInt(activity.pax, 10) || 0;
    const pricePerPax = parseFloat(activity.price_per_pax) || 0;
    const adjustment = parseFloat(activity.price_adjustment) || 0;
    return (pax * pricePerPax) + adjustment;
  };

  const getPriceColor = (price) => {
    if (price < 0) return 'text-green-600';
    if (price > 0) return 'text-red-600';
    return 'text-gray-900';
  };

  // --- DATA DERIVATION ---
  // MODIFIED: Derive locations from both itineraryLegs (properties) and existing activities
  const locations = useMemo(() => {
    const allLocationsFromProperties = (itineraryLegs || []).map(leg => leg.location).filter(Boolean);
    const allLocationsFromActivities = (activities || []).map(act => act.location).filter(Boolean);
    // Combine, remove duplicates, and sort for consistent display
    return [...new Set([...allLocationsFromProperties, ...allLocationsFromActivities])].sort();
  }, [itineraryLegs, activities]); // Added activities to dependency array

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
      price_per_pax: 0,
      price_adjustment: 0,
      currency: 'NZD',
      images: [],
      selected: false,
    });
  };

  const handleSave = () => {
    let updatedActivities;
    const activityToSave = editingActivity || newActivity;
    
    activityToSave.pax = parseInt(activityToSave.pax, 10) || 1;
    activityToSave.price_per_pax = parseFloat(activityToSave.price_per_pax) || 0;
    activityToSave.price_adjustment = parseFloat(activityToSave.price_adjustment) || 0;

    if (editingActivity) {
      updatedActivities = activities.map(act => act.id === activityToSave.id ? activityToSave : act);
    } else {
      updatedActivities = [...activities, activityToSave];
    }
    setActivities(updatedActivities);
    resetForm();
  };

  const handleDelete = (id) => {
    // IMPORTANT: Replaced window.confirm with a console log as per instructions
    console.log("Confirm deletion of activity with ID:", id);
    const updatedActivities = activities.filter(act => act.id !== id);
    setActivities(updatedActivities);
  };

  const resetForm = () => {
    setAddingToLocation(null);
    setEditingActivity(null);
    setNewActivity(null);
    setImageLinks('');
  };
  
  const toggleSelection = (id) => {
    const activityToToggle = activities.find(act => act.id === id);
    if (!activityToToggle) return;

    const updatedActivities = activities.map(act => {
      if (act.location === activityToToggle.location) {
        return act.id === id ? { ...act, selected: !act.selected } : { ...act, selected: false };
      }
      return act;
    });
    setActivities(updatedActivities);
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

  const totalChange = activities.reduce((sum, act) => {
    return act.selected ? sum + calculateFinalPrice(act) : sum;
  }, 0);

  // --- RENDER FUNCTIONS ---
  const renderForm = (activityData, setActivityData) => (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6 mt-4">
      <h3 className="text-xl font-bold mb-4 text-gray-800">{editingActivity ? 'Edit Activity' : `Add New Activity for ${addingToLocation}`}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Activity Name</label>
            <input type="text" value={activityData.name} onChange={(e) => setActivityData({...activityData, name: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input type="text" value={activityData.location} readOnly className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-100" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input type="date" value={activityData.date} onChange={(e) => setActivityData({...activityData, date: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Time</label>
            <input type="time" value={activityData.time} onChange={(e) => setActivityData({...activityData, time: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Duration (in hours)</label>
            <input type="number" placeholder="e.g., 3" value={activityData.duration} onChange={(e) => setActivityData({...activityData, duration: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Pax</label>
            <input type="number" min="1" value={activityData.pax} onChange={(e) => setActivityData({...activityData, pax: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Price per Pax</label>
            <input type="number" min="0" step="0.01" value={activityData.price_per_pax} onChange={(e) => setActivityData({...activityData, price_per_pax: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Price Adjustment</label>
            <input type="number" step="0.01" placeholder="e.g., -50 for discount" value={activityData.price_adjustment} onChange={(e) => setActivityData({...activityData, price_adjustment: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
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
      
      <div className="space-y-8">
        {locations.map(location => {
          // Filter activities for the current location and then sort them
          const locationActivities = activities
            .filter(act => act.location === location)
            .sort((a, b) => {
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

          return (
            <div key={location} className="p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-gray-800">{location}</h3>
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
                    const finalPrice = calculateFinalPrice(activity);
                    const priceColor = getPriceColor(finalPrice);
                    return (
                      <div 
                        key={activity.id} 
                        className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-300 cursor-pointer group overflow-hidden ${activity.selected ? 'selected-activity-card' : 'border-gray-200'}`}
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
                          {activity.selected && (
                            <div className="absolute top-3 left-3 bg-white rounded-full p-1 shadow-lg">
                              <CheckCircle size={24} className="text-green-500" />
                            </div>
                          )}
                          <div className="absolute top-3 right-3 flex space-x-2">
                            <button onClick={(e) => { e.stopPropagation(); setEditingActivity(activity); setAddingToLocation(null); }} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-md"><Edit3 size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(activity.id); }} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"><Trash2 size={16} /></button>
                          </div>
                        </div>
                        <div className="p-4 flex flex-col justify-between flex-grow">
                          <div>
                            <h4 className="font-bold text-lg text-gray-800 truncate">{activity.name}</h4>
                            <div className="mt-2 space-y-2 text-sm text-gray-600">
                              <div className="flex items-center"><Calendar size={16} className="mr-2 text-gray-400" /> <span>{formatDate(activity.date)}</span></div>
                              <div className="flex items-center"><Clock size={16} className="mr-2 text-gray-400" /> <span>{formatTime(activity.time)}</span></div>
                              <div className="flex items-center"><ChevronsRight size={16} className="mr-2 text-gray-400" /> <span>{activity.duration} hours</span></div>
                            </div>
                          </div>
                          <div className="mt-4 text-right">
                            <span className={`text-2xl font-bold ${priceColor}`}>
                              {finalPrice < 0 ? `-` : `+`}{getCurrencySymbol(activity.currency)}{Math.abs(finalPrice).toFixed(2)}
                            </span>
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
        })}
      </div>

      {activities.length > 0 && (
          <div className="mt-8 pt-6 border-t-2 border-dashed">
              <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-md">
                  <span className="text-xl font-bold text-gray-800">Activities - Total Price Change:</span>
                  <span className={`text-3xl font-extrabold ${getPriceColor(totalChange)}`}>
                    {totalChange < 0 ? `-` : `+`}{getCurrencySymbol('NZD')}{Math.abs(totalChange).toFixed(2)}
                  </span>
              </div>
          </div>
      )}
    </div>
  );
};

export default ActivityForm;
