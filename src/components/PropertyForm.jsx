// src/components/PropertyForm.jsx
// This component is designed to be used both stand-alone (e.g., initial view without admin)
// and as a sub-component within AdminDashboard for managing properties for a specific client selection.
import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  MapPin,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  Trash2,
  Edit3,
  Maximize2,
  BedDouble,
  Bath,
  Image,
  User,
  Lock
} from 'lucide-react';

const PropertyForm = ({
  properties, // This is now the SOLE source of truth for the list of properties being displayed/managed
  setProperties, // This is the function to update the properties list (from AdminDashboard)
  customLogoUrl,
  setCustomLogoUrl, // For the main logo controlled by admin
  onSave,       // Callback to trigger a save in the parent (AdminDashboard)
  adminMode = false // Controls whether admin features (add/edit/delete/toggle selection) are visible
}) => {
  const accentColor = '#FFD700';
  const accentColorDark = '#DAA520';
  const savingsColor = '#10B981';
  const extraColor = '#EF4444';

  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [expandedImage, setExpandedImage] = useState(null);
  const [expandedImagePropertyId, setExpandedImagePropertyId] = useState(null);
  const [newProperty, setNewProperty] = useState({
    id: null,
    location: '',
    checkIn: '',
    checkOut: '',
    name: '',
    images: [],
    category: 'Deluxe',
    price: '',
    currency: '$',
    bedrooms: '',
    bathrooms: '',
    homeImageIndex: 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);

  const currencies = ['$', '€', '£', '¥', '₹', 'NZ$', 'AU$', 'CA$'];

  // Initialize currentImageIndex when the 'properties' prop changes
  // This ensures images are correctly indexed when new client data is loaded or changed
  useEffect(() => {
    const initialImageIndices = {};
    (properties || []).forEach(prop => {
      if (prop && prop.id !== undefined) {
        initialImageIndices[prop.id] = prop.homeImageIndex || 0;
      }
    });
    setCurrentImageIndex(initialImageIndices);
  }, [properties]);


  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn + 'T00:00:00');
    const end = new Date(checkOut + 'T00:00:00');
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString + 'T00:00:00');
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-NZ', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return 'Error';
    }
  };

  const groupPropertiesByLocation = () => {
    const grouped = {};
    // Ensure 'properties' prop is an array before calling forEach
    (properties || []).forEach(property => {
      if (property && property.location) {
        if (!grouped[property.location]) {
          grouped[property.location] = [];
        }
        grouped[property.location].push(property);
      }
    });
    return grouped;
  };

  // FIXED: Removed onSave() call. This function now only updates local state.
  const toggleSelection = (locationId, propertyId) => {
    if (typeof setProperties === 'function') {
        setProperties(prevProperties => (prevProperties || []).map(prop => {
          if (prop && prop.location === locationId) {
            return { ...prop, selected: prop.id === propertyId };
          }
          return prop;
        }));
    } else {
        console.error("PropertyForm: setProperties prop is not a function in toggleSelection. Cannot update property selection locally.");
        // Use a custom modal or message box instead of alert in production
        // alert("An internal error occurred: cannot toggle selection. Please contact support.");
    }
  };

  const nextImage = (propertyId) => {
    const property = (properties || []).find(p => p.id === propertyId);
    if (!property || !Array.isArray(property.images) || property.images.length <= 1) return;

    setCurrentImageIndex(prev => {
      const currentIdx = prev[propertyId] !== undefined ? prev[propertyId] : property.homeImageIndex || 0;
      const nextIdx = (currentIdx + 1) % property.images.length;
      return { ...prev, [propertyId]: nextIdx };
    });
  };

  const prevImage = (propertyId) => {
    const property = (properties || []).find(p => p.id === propertyId);
    if (!property || !Array.isArray(property.images) || property.images.length <= 1) return;

    setCurrentImageIndex(prev => {
      const currentIdx = prev[propertyId] !== undefined ? prev[propertyId] : property.homeImageIndex || 0;
      const prevIdx = (currentIdx - 1 + property.images.length) % property.images.length;
      return { ...prev, [propertyId]: prevIdx };
    });
  };

  const openExpandedImage = (propertyId, imageIndex) => {
    const property = (properties || []).find(p => p.id === propertyId);
    if (property && Array.isArray(property.images) && property.images.length > 0) {
      setExpandedImage(property.images[imageIndex]);
      setExpandedImagePropertyId(propertyId);
      setCurrentImageIndex(prev => ({ ...prev, [propertyId]: imageIndex }));
    }
  };

  const nextExpandedImage = useCallback(() => {
    if (!expandedImagePropertyId) return;
    const property = (properties || []).find(p => p.id === expandedImagePropertyId);
    if (!property || !Array.isArray(property.images) || property.images.length <= 1) return;

    setCurrentImageIndex(prev => {
      const currentIdx = prev[expandedImagePropertyId] !== undefined ? prev[expandedImagePropertyId] : property.homeImageIndex || 0;
      const nextIdx = (currentIdx + 1) % property.images.length;
      setExpandedImage(property.images[nextIdx]);
      return { ...prev, [expandedImagePropertyId]: nextIdx };
    });
  }, [expandedImagePropertyId, properties]); // Depend on properties to ensure latest data

  const prevExpandedImage = useCallback(() => {
    if (!expandedImagePropertyId) return;
    const property = (properties || []).find(p => p.id === expandedImagePropertyId);
    if (!property || !Array.isArray(property.images) || property.images.length <= 1) return;

    setCurrentImageIndex(prev => {
      const currentIdx = prev[expandedImagePropertyId] !== undefined ? prev[expandedImagePropertyId] : property.homeImageIndex || 0;
      const prevIdx = (currentIdx - 1 + property.images.length) % property.images.length;
      setExpandedImage(property.images[prevIdx]);
      return { ...prev, [expandedImagePropertyId]: prevIdx };
    });
  }, [expandedImagePropertyId, properties]); // Depend on properties to ensure latest data

  const handleImageUpload = (files) => {
    const currentImagesCount = newProperty.images?.length || 0;
    const validFiles = Array.from(files).filter(file => {
      return file.type.startsWith('image/') && file.size <= 4 * 1024 * 1024; // Max 4MB per image
    }).slice(0, 30 - currentImagesCount); // Limit total images to 30

    if (validFiles.length === 0 && files.length > 0) {
      // Use a custom modal or message box instead of alert in production
      // alert("No valid images selected (only image files up to 4MB are allowed, max 30 total images).");
    }

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewProperty(prev => ({
          ...prev,
          images: [...(prev.images || []), e.target.result] // Ensure images is an array before spread
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setNewProperty(prev => {
      const currentImages = prev.images || []; // Ensure it's an array
      const updatedImages = currentImages.filter((_, i) => i !== index);
      let newHomeImageIndex = prev.homeImageIndex;

      // Adjust homeImageIndex if the removed image was before it or was the home image itself
      if (index < prev.homeImageIndex) {
        newHomeImageIndex = Math.max(0, prev.homeImageIndex - 1);
      } else if (index === prev.homeImageIndex && updatedImages.length > 0) {
        newHomeImageIndex = 0; // If home image removed, set first remaining image as home
      } else if (updatedImages.length === 0) {
        newHomeImageIndex = 0; // If all images removed, reset to 0
      }

      return {
        ...prev,
        images: updatedImages,
        homeImageIndex: newHomeImageIndex
      };
    });
  };

  const handleSaveProperty = () => {
    if (!newProperty.name || !newProperty.location || !newProperty.checkIn || !newProperty.checkOut) {
      // Use a custom modal or message box instead of alert in production
      // alert("Please fill all required fields: Location, Check-in, Check-out, Name.");
      return;
    }

    const priceValue = newProperty.price === '' ? 0 : parseFloat(newProperty.price);
    const bedroomsValue = parseInt(newProperty.bedrooms) || 0;
    const bathroomsValue = parseInt(newProperty.bathrooms) || 0;

    let updatedPropertiesList;
    let propertyIdForIndexUpdate;

    if (isEditing) {
      updatedPropertiesList = (properties || []).map(prop =>
        prop && prop.id === newProperty.id ? { ...newProperty, price: priceValue, bedrooms: bedroomsValue, bathrooms: bathroomsValue } : prop
      ).filter(Boolean); // Filter out any null/undefined entries that might appear
      propertyIdForIndexUpdate = newProperty.id;
      setIsEditing(false);
    } else {
      const currentMaxId = (properties || []).length > 0 ? Math.max(...(properties || []).map(p => p.id || 0)) : 0;
      const id = currentMaxId + 1; // Generate a new ID
      const newSavedProperty = { ...newProperty, id, price: priceValue, bedrooms: bedroomsValue, bathrooms: bathroomsValue, selected: false };
      updatedPropertiesList = [...(properties || []), newSavedProperty];
      propertyIdForIndexUpdate = id;
    }

    if (typeof setProperties === 'function') {
      setProperties(updatedPropertiesList);
    } else {
      console.error("PropertyForm: setProperties prop is not a function or is undefined. Cannot save property list locally.");
      // Use a custom modal or message box instead of alert in production
      // alert("An internal error occurred with property list update. Please contact support.");
      return;
    }

    // Update currentImageIndex for the saved/added property
    setCurrentImageIndex(prev => ({
      ...prev,
      [propertyIdForIndexUpdate]: newProperty.homeImageIndex
    }));

    // Reset the form for adding a new property
    setNewProperty({
      id: null,
      location: '',
      checkIn: '',
      checkOut: '',
      name: '',
      images: [], // Always reset to an empty array
      category: 'Deluxe',
      price: '',
      currency: '$',
      bedrooms: '',
      bathrooms: '',
      homeImageIndex: 0
    });
    if (onSave) onSave(); // Callback to parent to trigger database save - ONLY HERE
  };

  const editProperty = (property) => {
    setNewProperty({
      ...property,
      // Ensure price, bedrooms, bathrooms are string representations for input fields
      price: property.price !== undefined && property.price !== null ? String(property.price) : '',
      bedrooms: property.bedrooms !== undefined && property.bedrooms !== null ? String(property.bedrooms) : '',
      bathrooms: property.bathrooms !== undefined && property.bathrooms !== null ? String(property.bathrooms) : '',
      images: property.images || [], // Ensure images are an array when editing
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmRemoveProperty = (id) => {
    setPropertyToDelete(id);
    setShowDeleteConfirm(true);
  };

  // FIXED: Removed onSave() call. This function now only updates local state.
  const removeProperty = () => {
    if (typeof setProperties === 'function') {
        setProperties(prevProperties => (prevProperties || []).filter(prop => prop && prop.id !== propertyToDelete));
    } else {
        console.error("PropertyForm: setProperties prop is not a function in removeProperty. Cannot remove property locally.");
        // Use a custom modal or message box instead of alert in production
        // alert("An internal error occurred: cannot remove property. Please contact support.");
        return;
    }
    setShowDeleteConfirm(false);
    setPropertyToDelete(null);
    if (onSave) onSave(); // Callback to parent to trigger database save - ONLY AFTER CONFIRMED DELETION
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Luxury': return 'bg-purple-600 text-white';
      case 'Super Deluxe': return 'bg-blue-600 text-white';
      case 'Deluxe': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getSelectedProperty = (location) => {
    return (properties || []).find(prop => prop && prop.location === location && prop.selected);
  };

  const groupedProperties = groupPropertiesByLocation();

  const totalChange = (properties || [])
    .filter(prop => prop && prop.selected)
    .reduce((total, prop) => total + parseFloat(prop.price || 0), 0);
  const totalChangeColorStyle = { color: totalChange >= 0 ? extraColor : savingsColor };

  return (
    <div className="font-['Century_Gothic']">
      <style>{`
        .font-century-gothic {
          font-family: 'Century Gothic', sans-serif;
        }
        .text-extra-color { color: ${extraColor}; }
        .text-savings-color { color: ${savingsColor}; }
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
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 z-10"
              aria-label="Close image"
            >
              <X size={24} />
            </button>
            <img
              src={expandedImage}
              alt="Expanded view"
              className="max-w-full max-h-full object-contain rounded-xl"
            />
            {expandedImagePropertyId && (properties || []).find(p => p.id === expandedImagePropertyId)?.images?.length > 1 && (
              <>
                <button
                  onClick={prevExpandedImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-3 text-gray-800 hover:bg-opacity-100 shadow-lg transition-all"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextExpandedImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-3 text-gray-800 hover:bg-opacity-100 shadow-lg transition-all"
                  aria-label="Next image"
                >
                  <ChevronRight size={24} />
                </button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {(properties || []).find(p => p.id === expandedImagePropertyId)?.images?.map((img, idx) => (
                    <div
                      key={idx}
                      className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-200 ${
                        idx === (currentImageIndex[expandedImagePropertyId] !== undefined ? currentImageIndex[expandedImagePropertyId] : ((properties || []).find(p => p.id === expandedImagePropertyId)?.homeImageIndex || 0)) ? 'bg-white scale-125' : 'bg-white bg-opacity-60'
                      }`}
                      onClick={() => openExpandedImage(expandedImagePropertyId, idx)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl text-center max-w-sm w-full font-century-gothic">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Confirm Deletion</h3>
            <p className="text-gray-700 mb-6">Are you sure you want to remove this property?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={removeProperty}
                className="px-6 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel (Property Form for editing/adding single client data) */}
      {adminMode && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 mt-8 font-century-gothic">
          <h2 className="text-2xl font-bold mb-5 text-gray-800 text-left">
            {isEditing ? 'Edit Property' : 'Add New Property'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <input
              type="text"
              placeholder="Location"
              value={newProperty.location}
              onChange={(e) => setNewProperty({...newProperty, location: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
            <input
              type="date"
              value={newProperty.checkIn}
              onChange={(e) => setNewProperty({...newProperty, checkIn: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-gray-700 placeholder-gray-400"
              placeholder="Check-in Date"
            />
            <input
              type="date"
              value={newProperty.checkOut}
              onChange={(e) => setNewProperty({...newProperty, checkOut: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-gray-700 placeholder-gray-400"
              placeholder="Check-out Date"
            />
            <input
              type="text"
              placeholder="Property Name"
              value={newProperty.name}
              onChange={(e) => setNewProperty({...newProperty, name: e.target.value})}
              className="col-span-full px-4 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
            <select
              value={newProperty.category}
              onChange={(e) => setNewProperty({...newProperty, category: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white"
            >
              <option value="Deluxe">Deluxe</option>
              <option value="Super Deluxe">Super Deluxe</option>
              <option value="Luxury">Luxury</option>
            </select>
            <div className="flex gap-2">
              <select
                value={newProperty.currency}
                onChange={(e) => setNewProperty({...newProperty, currency: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white w-24"
              >
                {currencies.map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Price (e.g., -25.50 or 50.00)"
                value={newProperty.price}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
                    setNewProperty({ ...newProperty, price: value });
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
            </div>
            <input
              type="number"
              placeholder="Bedrooms"
              value={newProperty.bedrooms}
              onChange={(e) => setNewProperty({...newProperty, bedrooms: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
            <input
              type="number"
              placeholder="Bathrooms"
              value={newProperty.bathrooms}
              onChange={(e) => setNewProperty({...newProperty, bathrooms: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="inline-flex items-center px-5 py-2 rounded-lg text-base font-medium shadow-sm transition-colors cursor-pointer"
                style={{ backgroundColor: accentColor, color: '#333' }}
              >
                <Upload size={18} className="mr-2" />
                Upload Property Images
              </label>

              {newProperty.images?.length > 0 && (
                <div className="mt-4 flex gap-3 flex-wrap">
                  {newProperty.images.map((image, index) => (
                    <div key={index} className="relative group w-24 h-24">
                      <img src={image} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-lg shadow-sm" />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                        aria-label="Remove image"
                      >
                        <X size={14} />
                      </button>
                      <button
                        onClick={() => setNewProperty(prev => ({ ...prev, homeImageIndex: index }))}
                        className={`absolute bottom-1 left-1 p-1 rounded-full text-white ${newProperty.homeImageIndex === index ? 'bg-blue-500' : 'bg-gray-700 bg-opacity-70 group-hover:bg-blue-500'}`}
                        aria-label="Set as home image"
                        title="Set as home image"
                      >
                        <Image size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleSaveProperty}
              className="px-8 py-3 rounded-lg text-white font-semibold shadow-md transition-all"
              style={{ backgroundColor: isEditing ? '#4CAF50' : accentColor, color: isEditing ? '#fff' : '#333' }}
            >
              {isEditing ? 'Save Changes' : 'Add Property'}
            </button>
            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setNewProperty({ // Reset form when cancelling edit
                    id: null,
                    location: '',
                    checkIn: '',
                    checkOut: '',
                    name: '',
                    images: [],
                    category: 'Deluxe',
                    price: '',
                    currency: '$',
                    bedrooms: '',
                    bathrooms: '',
                    homeImageIndex: 0
                  });
                }}
                className="px-8 py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500 text-base font-semibold shadow-md transition-all"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>
      )}

      {/* Location Groups */}
      <div className="space-y-10">
        {Object.entries(groupedProperties).map(([location, locationProperties]) => (
          <div key={location} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="p-5 border-b bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div className="mb-2 md:mb-0">
                  <h2 className="text-2xl font-bold text-gray-900 font-century-gothic text-left">
                    {location}
                  </h2>
                  <p className="text-sm text-gray-600">
                    <Calendar size={14} className="inline mr-1 text-gray-500" />
                    {locationProperties[0]?.checkIn && locationProperties[0]?.checkOut ?
                      `${formatDate(locationProperties[0].checkIn)} - ${formatDate(locationProperties[0].checkOut)} · ${calculateNights(locationProperties[0].checkIn, locationProperties[0].checkOut)} nights`
                      : 'Dates N/A'}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm text-gray-600">Selected Property:</p>
                  <p className="font-semibold text-gray-900 text-base">
                    {getSelectedProperty(location)?.name || 'None'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {(locationProperties || []).map((property) => (
                  <div
                    key={property.id}
                    className={`relative group bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden transform hover:scale-102 transition-all duration-300 cursor-pointer
                      ${property.selected ? 'selected-border' : ''}`}
                    // FIXED: Only allow selection toggle in adminMode
                    onClick={() => adminMode && toggleSelection(location, property.id)}
                  >
                    {/* Image Container */}
                    <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
                      <img
                        // Adjusted image source to dynamically use currentImageIndex for scrolling
                        src={property.images?.[currentImageIndex[property.id] !== undefined ? currentImageIndex[property.id] : property.homeImageIndex || 0] || "https://placehold.co/800x600/E0E0E0/333333?text=No+Image"}
                        alt={property.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        // Only enlarge if clicking directly on the image, not the navigation buttons
                        onClick={(e) => {
                          // Only enlarge if click isn't on a button within the image area
                          if (!e.target.closest('button')) {
                            e.stopPropagation();
                            openExpandedImage(property.id, currentImageIndex[property.id] !== undefined ? currentImageIndex[property.id] : property.homeImageIndex || 0);
                          }
                        }}
                        onError={(e) => { e.target.src = "https://placehold.co/800x600/E0E0E0/333333?text=Image+Error"; }}
                      />

                      {/* Expand Icon - now only appears on image hover, click still handled by primary image click */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openExpandedImage(property.id, currentImageIndex[property.id] !== undefined ? currentImageIndex[property.id] : property.homeImageIndex || 0);
                        }}
                        className="absolute top-3 right-3 bg-black bg-opacity-40 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                        aria-label="Expand image"
                      >
                        <Maximize2 size={16} />
                      </button>

                      {/* Selection Indicator */}
                      {property.selected && (
                        <div className="absolute top-3 left-3 rounded-full p-2 shadow-md"
                          style={{ backgroundColor: accentColor, color: '#333' }}
                        >
                          <Check size={16} />
                        </div>
                      )}

                      {/* Category Badge */}
                      <div className="absolute bottom-3 left-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getCategoryColor(property.category)}`}>
                          {property.category}
                        </span>
                      </div>

                      {/* Image Navigation */}
                      {property.images?.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening image on button click
                              prevImage(property.id);
                            }}
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-100 shadow-md"
                            aria-label="Previous image"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening image on button click
                              nextImage(property.id);
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-100 shadow-md"
                            aria-label="Next image"
                          >
                            <ChevronRight size={18} />
                          </button>

                          {/* Dots */}
                          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1.5">
                            {property.images.slice(0, 3).map((_, index) => (
                              <div
                                key={index}
                                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                  index === (currentImageIndex[property.id] !== undefined ? currentImageIndex[property.id] : property.homeImageIndex || 0) ? 'bg-white scale-125' : 'bg-white bg-opacity-60'
                                }`}
                              />
                            ))}
                            {property.images.length > 3 && (
                              <div className="w-2 h-2 rounded-full bg-white bg-opacity-60" title={`${property.images.length - 3} more photos`} />
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Property Details */}
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-lg text-gray-900 leading-tight font-century-gothic">
                        {property.name}
                      </h3>

                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin size={16} className="mr-1 text-gray-500" />
                        <span>{property.location}</span>
                      </div>

                      {/* Bedrooms and Bathrooms Display */}
                      <div className="flex items-center text-sm text-gray-600 gap-3">
                        {(property.bedrooms !== undefined && property.bedrooms !== null) && (property.bedrooms > 0) && (
                          <div className="flex items-center">
                            <BedDouble size={16} className="mr-1 text-gray-500" />
                            <span>{property.bedrooms} Bed{property.bedrooms > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {(property.bathrooms !== undefined && property.bathrooms !== null) && (property.bathrooms > 0) && (
                          <div className="flex items-center">
                            <Bath size={16} className="mr-1 text-gray-500" />
                            <span>{property.bathrooms} Bath{property.bathrooms > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-base text-gray-700 font-medium">
                          {property.checkIn && property.checkOut ? `${calculateNights(property.checkIn, property.checkOut)} nights` : 'Nights N/A'}
                        </span>
                        <div className="text-right">
                          <span className="font-bold text-xl text-gray-900" style={{ color: parseFloat(property.price || 0) >= 0 ? extraColor : savingsColor }}>
                            {property.currency}{Math.abs(parseFloat(property.price || 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {adminMode && (
                        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              editProperty(property);
                            }}
                            className="text-blue-500 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-colors"
                            aria-label="Edit property"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmRemoveProperty(property.id);
                            }}
                            className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                            aria-label="Remove property"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selection Summary */}
      <div className="mt-12 bg-white rounded-2xl shadow-xl p-6 font-century-gothic border border-gray-100 text-left">
        <h2 className="text-2xl font-bold mb-5 text-gray-800">Your Selection Summary</h2>
        {(properties || []).filter(prop => prop && prop.selected).length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-lg">No properties selected yet. Start choosing!</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedProperties).map(([location, locationProperties]) => {
              const selectedProperty = getSelectedProperty(location);
              if (!selectedProperty) return null;

              const priceText = parseFloat(selectedProperty.price || 0);
              const priceColorStyle = { color: priceText >= 0 ? extraColor : savingsColor };

              return (
                <div key={location} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                    <img
                      src={selectedProperty.images?.[selectedProperty.homeImageIndex || 0] || "https://placehold.co/60x60/E0E0E0/333333?text=No+Image"}
                      alt={selectedProperty.name}
                      className="w-16 h-16 rounded-lg object-cover shadow-sm flex-shrink-0"
                      onError={(e) => { e.target.src = "https://placehold.co/60x60/E0E0E0/333333?text=Image+Error"; }}
                    />
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-900 text-base">{location}</h4>
                      <p className="text-sm text-gray-700 font-medium">{selectedProperty.name}</p>
                      <p className="text-xs text-gray-500">
                        <Calendar size={12} className="inline mr-1" />
                        {selectedProperty.checkIn && selectedProperty.checkOut ? `${calculateNights(selectedProperty.checkIn, selectedProperty.checkOut)} nights` : 'Nights N/A'}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 gap-2 mt-1">
                        {(selectedProperty.bedrooms !== undefined && selectedProperty.bedrooms !== null) && (selectedProperty.bedrooms > 0) && (
                          <div className="flex items-center">
                            <BedDouble size={12} className="mr-0.5" />
                            <span>{selectedProperty.bedrooms}</span>
                          </div>
                        )}
                        {(selectedProperty.bathrooms !== undefined && selectedProperty.bathrooms !== null) && (selectedProperty.bathrooms > 0) && (
                          <div className="flex items-center">
                            <Bath size={12} className="mr-0.5" />
                            <span>{selectedProperty.bathrooms}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right w-full sm:w-auto">
                    <span className="font-bold text-xl text-gray-900" style={priceColorStyle}>
                      {selectedProperty.currency}{Math.abs(priceText).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900">Total Price Change:</span>
                <span className={`text-3xl font-extrabold`} style={totalChangeColorStyle}>
                  {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyForm;
