// src/components/TransportationForm.jsx - Version 2.3
import React, { useState, useMemo } from 'react';
import { Plus, Edit3, Trash2, X, Car, Calendar, Clock, MapPin, ShieldCheck, Users, DollarSign, Image, Link2, Ship, Bus } from 'lucide-react';

const TransportationForm = ({ transportation, setTransportation, itineraryLegs }) => {
  const [editingItem, setEditingItem] = useState(null);
  const [addingToLocation, setAddingToLocation] = useState(null);
  const [newItem, setNewItem] = useState(null);
  const [imageLinks, setImageLinks] = useState('');
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const accentColor = '#FFD700';

  const transportationTypes = [
    { type: 'car', label: 'Car Rental', icon: <Car/> },
    { type: 'ferry', label: 'Ferry', icon: <Ship/> },
    { type: 'bus', label: 'Bus', icon: <Bus/> },
    { type: 'driver', label: 'Car with Driver', icon: <Car/> },
  ];

  const getCurrencySymbol = (currencyCode) => {
    const symbols = { NZD: 'NZ$', USD: '$', EUR: '€', INR: '₹' };
    return symbols[currencyCode] || currencyCode || 'NZ$';
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

  const getPriceColor = (price) => {
    if (price < 0) return 'text-green-600';
    if (price > 0) return 'text-red-600';
    return 'text-gray-900';
  };

  const locations = useMemo(() => {
    const allLocations = (itineraryLegs || []).map(leg => leg.location).filter(Boolean);
    return [...new Set(allLocations)].sort();
  }, [itineraryLegs]);

  const handleStartAdding = (location) => {
    setAddingToLocation(location);
    setShowTypeSelection(true);
  };

  const handleTypeSelected = (type) => {
    const leg = itineraryLegs.find(l => l.location === addingToLocation);
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
        baseItem = { ...baseItem, name: '', type: 'Sedan', pickupLocation: addingToLocation, pickupDate: leg?.checkIn || '', pickupTime: '10:00', dropoffLocation: addingToLocation, dropoffDate: leg?.checkOut || '', dropoffTime: '10:00', insurance: 'Basic', excessAmount: '', driversIncluded: 1 };
        break;
      case 'ferry':
        baseItem = { ...baseItem, name: '', boardingFrom: addingToLocation, boardingDate: leg?.checkIn || '', boardingTime: '09:00', departingTo: '', departingDate: leg?.checkIn || '', departingTime: '12:00', duration: '', baggageAllowance: '' };
        break;
      case 'bus':
        baseItem = { ...baseItem, name: '', boardingFrom: addingToLocation, boardingDate: leg?.checkIn || '', boardingTime: '08:00', departingTo: '', departingDate: leg?.checkIn || '', departingTime: '17:00', duration: '', baggageAllowance: '' };
        break;
      case 'driver':
        baseItem = { ...baseItem, name: '', carType: 'Sedan', location: addingToLocation, pickupFrom: 'Hotel', pickupDate: leg?.checkIn || '', pickupTime: '09:00', duration: '' };
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
    setAddingToLocation(null);
    setEditingItem(null);
    setNewItem(null);
    setImageLinks('');
    setShowTypeSelection(false);
  };

  const handleAddImageLinks = (currentItem, setFunc) => {
    const urls = imageLinks.split('\n').map(url => url.trim()).filter(url => url);
    if (urls.length > 0) {
      setFunc(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
      setImageLinks('');
    }
  };

  const handleRemoveImage = (imageToRemoveUrl, currentItem, setFunc) => {
    const updatedImages = currentItem.images.filter(url => url !== imageToRemoveUrl);
    setFunc(prev => ({ ...prev, images: updatedImages }));
  };

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
      <div><label className="block text-sm font-medium text-gray-700">Location</label><input type="text" value={data.location} readOnly className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-gray-100" /></div>
      <div className="md:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Pickup Details</div>
      <div><label className="block text-sm font-medium text-gray-700">Pickup From</label><input type="text" value={data.pickupFrom} onChange={(e) => setData({...data, pickupFrom: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Hotel Lobby"/></div>
      <div><label className="block text-sm font-medium text-gray-700">Date</label><input type="date" value={data.pickupDate} onChange={(e) => setData({...data, pickupDate: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div><label className="block text-sm font-medium text-gray-700">Time</label><input type="time" value={data.pickupTime} onChange={(e) => setData({...data, pickupTime: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" /></div>
      <div className="md:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Other Details</div>
      <div><label className="block text-sm font-medium text-gray-700">Duration</label><input type="text" value={data.duration} onChange={(e) => setData({...data, duration: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., 4 hours"/></div>
    </>
  );
  
  const renderForm = (data, setData) => {
    let fields;
    switch (data.transportType) {
      case 'car': fields = renderCarForm(data, setData); break;
      case 'ferry': fields = renderFerryBusForm(data, setData, 'ferry'); break;
      case 'bus': fields = renderFerryBusForm(data, setData, 'bus'); break;
      case 'driver': fields = renderDriverForm(data, setData); break;
      default: return null;
    }
    return (
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6 mt-4">
          <h3 className="text-xl font-bold mb-4 text-gray-800">{editingItem ? `Edit ${data.transportType}` : `Add New ${data.transportType}`}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fields}
              <div className="lg:col-span-3 font-semibold text-gray-800 pt-2 border-t mt-2">Pricing & Images</div>
              <div><label className="block text-sm font-medium text-gray-700">Price (Differential)</label><input type="number" step="0.01" value={data.price} onChange={(e) => setData({...data, price: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., 150 or -50"/></div>
              <div><label className="block text-sm font-medium text-gray-700">Currency</label><select value={data.currency} onChange={(e) => setData({...data, currency: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"><option value="NZD">NZ$</option><option value="USD">$</option><option value="EUR">€</option><option value="INR">₹</option></select></div>
              <div className="lg:col-span-3"><label className="block text-sm font-medium text-gray-700">Image URLs (one per line)</label><textarea rows="3" value={imageLinks} onChange={(e) => setImageLinks(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"></textarea><button onClick={() => handleAddImageLinks(data, setData)} className="mt-2 text-sm bg-blue-500 text-white py-1 px-3 rounded-md hover:bg-blue-600 flex items-center"><Link2 size={14} className="mr-1" /> Add from Links</button></div>
              <div className="lg:col-span-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {(data.images || []).map((img, index) => (
                      <div key={index} className="relative group">
                          <img src={img} alt={`${data.name} ${index + 1}`} className="w-full h-24 object-cover rounded-md" />
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
  

  const renderItem = (item) => {
    const price = parseFloat(item.price) || 0;
    const priceColor = getPriceColor(price);
    const Icon = transportationTypes.find(t => t.type === item.transportType)?.icon || Car;

    return (
      <div key={item.id} className={`p-4 rounded-lg border-2 transition-all duration-300 flex flex-col md:flex-row items-center gap-4 border-gray-200 hover:border-gray-300`}>
        <div className="w-full md:w-1/3 flex items-center gap-4">
            <img src={item.images?.[0] || 'https://placehold.co/120x80/E0E0E0/333333?text=No+Image'} alt={item.name} className="w-24 h-16 object-cover rounded-md shadow-sm" />
            <div>
                <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">{Icon} {item.name}</h4>
                <p className="text-sm text-gray-500">{item.type || item.carType}</p>
            </div>
        </div>

        <div className="w-full md:w-1/3 text-sm text-gray-700 space-y-1">
            {item.transportType === 'car' && (<>
                <p><strong>Pickup:</strong> {item.pickupLocation} on {formatDate(item.pickupDate)} at {formatTime(item.pickupTime)}</p>
                <p><strong>Drop-off:</strong> {item.dropoffLocation} on {formatDate(item.dropoffDate)} at {formatTime(item.dropoffTime)}</p>
            </>)}
             {item.transportType === 'ferry' && (<>
                <p><strong>Boarding:</strong> {item.boardingFrom} on {formatDate(item.boardingDate)} at {formatTime(item.boardingTime)}</p>
                <p><strong>Arriving:</strong> {item.departingTo} on {formatDate(item.departingDate)} at {formatTime(item.departingTime)}</p>
            </>)}
             {item.transportType === 'bus' && (<>
                <p><strong>Boarding:</strong> {item.boardingFrom} on {formatDate(item.boardingDate)} at {formatTime(item.boardingTime)}</p>
                <p><strong>Arriving:</strong> {item.departingTo} on {formatDate(item.departingDate)} at {formatTime(item.departingTime)}</p>
            </>)}
             {item.transportType === 'driver' && (<>
                <p><strong>Pickup:</strong> {item.pickupFrom} on {formatDate(item.pickupDate)} at {formatTime(item.pickupTime)}</p>
                <p><strong>Duration:</strong> {item.duration}</p>
            </>)}
        </div>
        
        <div className="w-full md:w-1/3 flex justify-between items-center">
            <div className="text-sm text-gray-600">
                {item.transportType === 'car' && <p><ShieldCheck size={14} className="inline mr-1" /> {item.insurance} (Excess: {getCurrencySymbol(item.currency)}{item.excessAmount || '0'})</p>}
                {item.transportType === 'car' && <p><Users size={14} className="inline mr-1" /> {item.driversIncluded} Driver(s)</p>}
                {(item.transportType === 'ferry' || item.transportType === 'bus') && <p><strong>Baggage:</strong> {item.baggageAllowance}</p>}
            </div>
            <div className="text-right">
                <span className={`text-2xl font-bold ${priceColor}`}>
                    {price < 0 ? `-` : `+`}{getCurrencySymbol(item.currency)}{Math.abs(price).toFixed(2)}
                </span>
            </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
            <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setAddingToLocation(null); }} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-md"><Edit3 size={16} /></button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"><Trash2 size={16} /></button>
        </div>
      </div>
    );
  };

  return (
    <div>
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

      <div className="space-y-8">
        {locations.map(location => {
          const locationItems = (transportation || []).filter(t => t.location === location || t.pickupLocation === location || t.boardingFrom === location);
          return (
            <div key={location} className="p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-gray-800">{location}</h3>
                <button onClick={() => handleStartAdding(location)} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center transition-transform hover:scale-105">
                  <Plus size={18} className="mr-2" /> Add Transportation
                </button>
              </div>

              {(addingToLocation === location && newItem) && renderForm(newItem, setNewItem)}
              
              {locationItems.length > 0 ? (
                <div className="space-y-4">
                  {locationItems.map(item => (
                    editingItem?.id === item.id 
                      ? <div key={item.id}>{renderForm(editingItem, setEditingItem)}</div>
                      : renderItem(item)
                  ))}
                </div>
              ) : (
                !addingToLocation && <p className="text-center text-gray-500 py-4">No transportation options added for {location} yet.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default TransportationForm;
