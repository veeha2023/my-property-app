// src/components/PropertyForm.jsx - Version 6.5 (Image URL Input)
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  Calendar,
  MapPin,
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
  Plus,
  Link2,
} from 'lucide-react';

const PropertyForm = ({
  properties,
  setProperties,
  onSave,
  adminMode = false
}) => {
  const accentColor = '#FFD700';
  const savingsColor = '#10B981';
  const extraColor = '#EF4444';

  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [expandedImage, setExpandedImage] = useState(null);
  const [expandedImagePropertyId, setExpandedImagePropertyId] = useState(null);
  const [newProperty, setNewProperty] = useState({
    name: '', location: '', checkIn: '', checkOut: '', currency: 'NZD',
    price: '',
    price_type: 'Per Night',
    bedrooms: '', bathrooms: '', images: [], homeImageIndex: 0,
    selected: false, description: '', category: 'Luxury',
  });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [showPropertyFormModal, setShowPropertyFormModal] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [imageLinks, setImageLinks] = useState(''); // State for image URL input

  const initialNewPropertyState = {
    name: '', location: '', checkIn: '', checkOut: '', currency: 'NZD',
    price: '',
    price_type: 'Per Night',
    bedrooms: '', bathrooms: '', images: [], homeImageIndex: 0,
    selected: false, description: '', category: 'Luxury',
  };

  const getCurrencySymbol = (currencyCode) => {
    switch (currencyCode) {
      case 'NZD':
        return 'NZ$';
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'INR':
        return '₹';
      default:
        return currencyCode;
    }
  };

  useEffect(() => {
    const initialImageIndices = {};
    (properties || []).forEach(prop => {
      if (prop && prop.id !== undefined) {
        initialImageIndices[prop.id] = prop.homeImageIndex || 0;
      }
    });
    setCurrentImageIndex(initialImageIndices);
  }, [properties]);

  const handleAddNewPropertyClick = (itineraryDetails = {}) => {
      setNewProperty({
          ...initialNewPropertyState,
          location: itineraryDetails.location || '',
          checkIn: itineraryDetails.checkIn || '',
          checkOut: itineraryDetails.checkOut || '',
      });
      setIsAddingNew(true);
      setEditingProperty(null);
      setShowPropertyFormModal(true);
      setMessage('');
      setError(null);
  };

  const handleEditPropertyClick = (property) => {
    setEditingProperty({
      ...property,
      price: property.price === 0 ? '' : property.price,
      bedrooms: property.bedrooms === 0 ? '' : property.bedrooms,
      bathrooms: property.bathrooms === 0 ? '' : property.bathrooms,
    });
    setIsAddingNew(false);
    setShowPropertyFormModal(true);
    setMessage('');
    setError(null);
  };

  const handleSavePropertyDetails = async (propertyToSave, isNewProperty) => {
      setUploadingImages(true);
      setError(null);

      try {
          const finalPropertyToSave = {
              ...propertyToSave,
              price: parseCurrencyToNumber(propertyToSave.price),
              bedrooms: parseInt(propertyToSave.bedrooms) || 0,
              bathrooms: parseFloat(propertyToSave.bathrooms) || 0,
          };

          let updatedProperties;
          if (isNewProperty) {
              const newId = `prop-${Date.now()}`;
              const propertyWithId = { ...finalPropertyToSave, id: newId };
              
              const nonPlaceholderProperties = properties.filter(p => !(p.location === propertyWithId.location && p.isPlaceholder));
              updatedProperties = [...nonPlaceholderProperties, propertyWithId];

          } else {
              updatedProperties = properties.map(prop =>
                  prop.id === propertyToSave.id ? finalPropertyToSave : prop
              );
          }

          setProperties(updatedProperties);
          if (onSave) {
              await onSave(updatedProperties);
          }
          setMessage(isNewProperty ? 'Property added successfully!' : 'Property updated successfully!');
          isNewProperty ? setIsAddingNew(false) : setEditingProperty(null);
          setShowPropertyFormModal(false);
      } catch (err) {
          console.error("Save error:", err);
          setError(`Failed to save property: ${err.message}`);
          setUploadingImages(false);
      } finally {
          setUploadingImages(false);
      }
  };

  const handleCancelForm = () => {
    if (isAddingNew) {
      setIsAddingNew(false);
      setNewProperty({ ...initialNewPropertyState });
    } else if (editingProperty) {
      setEditingProperty(null);
      setNewProperty({ ...initialNewPropertyState });
    }
    setMessage('');
    setError(null);
    setIsAddingNew(false);
    setShowPropertyFormModal(false);
    setImageLinks(''); // Clear the image links textarea
  };

  const handleDeleteProperty = (idToDelete) => {
    if (window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
      const updatedProperties = properties.filter(prop => prop.id !== idToDelete);
      setProperties(updatedProperties);
      if (onSave) {
        onSave(updatedProperties);
      }
      setMessage('Property deleted successfully!');
      setError(null);
    }
  };

  const toggleSelection = useCallback((locationId, propertyId) => {
    if (typeof setProperties === 'function') {
      const updatedProperties = (properties || []).map(prop => {
        if (prop && prop.location === locationId) {
          return { ...prop, selected: (prop.id === propertyId) ? !prop.selected : false };
        }
        return prop;
      });
      setProperties(updatedProperties);
    } else {
      console.error("PropertyForm: setProperties prop is not a function in toggleSelection.");
    }
  }, [properties, setProperties]);


  const parseCurrencyToNumber = useCallback((currencyString) => {
    if (typeof currencyString === 'number') {
      return currencyString;
    }
    if (typeof currencyString === 'string') {
      const cleanedString = currencyString.replace(/[^0-9.-]+/g, "");
      const parsed = parseFloat(cleanedString);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }, []);

  const getPriceColorStyle = (price) => {
    if (price < 0) {
      return { color: savingsColor };
    } else if (price > 0) {
      return { color: extraColor };
    }
    return { color: '#333' };
  };

  const getTotalChangeColorStyle = (totalChangeValue) => {
    if (totalChangeValue < 0) {
      return { color: savingsColor };
    } else if (totalChangeValue > 0) {
      return { color: extraColor };
    }
    return { color: '#333' };
  };

  const prevImage = (propertyId) => {
    setCurrentImageIndex(prev => {
      const current = prev[propertyId] || 0;
      const totalImages = properties.find(p => p.id === propertyId)?.images?.length || 0;
      return { ...prev, [propertyId]: (current - 1 + totalImages) % totalImages };
    });
  };

  const nextImage = (propertyId) => {
    setCurrentImageIndex(prev => {
      const current = prev[propertyId] || 0;
      const totalImages = properties.find(p => p.id === propertyId)?.images?.length || 0;
      return { ...prev, [propertyId]: (current + 1) % totalImages };
    });
  };

  const openExpandedImage = (propertyId, index) => {
    const property = properties.find(p => p.id === propertyId);
    if (property && property.images && property.images[index]) {
      setExpandedImage(property.images[index]);
      setExpandedImagePropertyId(propertyId);
      setCurrentImageIndex(prev => ({ ...prev, [propertyId]: index }));
    }
  };

  const closeExpandedImage = useCallback(() => {
    setExpandedImage(null);
    setExpandedImagePropertyId(null);
  }, []);

  const prevExpandedImage = useCallback(() => {
    if (expandedImagePropertyId) {
      const property = properties.find(p => p.id === expandedImagePropertyId);
      if (property && property.images.length > 0) {
        setCurrentImageIndex(prev => {
          const current = prev[expandedImagePropertyId] || 0;
          const newIndex = (current - 1 + property.images.length) % property.images.length;
          setExpandedImage(property.images[newIndex]);
          return { ...prev, [expandedImagePropertyId]: newIndex };
        });
      }
    }
  }, [expandedImagePropertyId, properties]);

  const nextExpandedImage = useCallback(() => {
    if (expandedImagePropertyId) {
      const property = properties.find(p => p.id === expandedImagePropertyId);
      if (property && property.images.length > 0) {
        setCurrentImageIndex(prev => {
          const current = prev[expandedImagePropertyId] || 0;
          const newIndex = (current + 1) % property.images.length;
          setExpandedImage(property.images[newIndex]);
          return { ...prev, [expandedImagePropertyId]: newIndex };
        });
      }
    }
  }, [expandedImagePropertyId, properties]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (expandedImage) {
        if (event.key === 'ArrowRight') {
          nextExpandedImage();
        } else if (event.key === 'ArrowLeft') {
          prevExpandedImage();
        } else if (event.key === 'Escape') {
          closeExpandedImage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandedImage, nextExpandedImage, prevExpandedImage, closeExpandedImage]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString + 'T00:00:00');
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return new Intl.DateTimeFormat('en-NZ', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
      }).format(date);
    } catch (e) {
      console.error("Error formatting date:", e);
      return 'Error';
    }
  };

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  // New function to handle adding images from URLs
  const handleAddImageLinks = (currentProperty, setProperty) => {
    const urls = imageLinks.split('\n').map(url => url.trim()).filter(url => url);
    if (urls.length > 0) {
      setProperty(prev => ({
        ...prev,
        images: [...prev.images, ...urls]
      }));
      setImageLinks(''); // Clear textarea after adding
      setMessage(`${urls.length} image(s) added from links.`);
    }
  };


  const handleRemoveImage = (imageToRemoveUrl, currentProperty, setProperty) => {
    const updatedImages = currentProperty.images.filter(url => url !== imageToRemoveUrl);
    setProperty(prev => {
      let newHomeImageIndex = prev.homeImageIndex;
      if (updatedImages.length > 0 && newHomeImageIndex >= updatedImages.length) {
        newHomeImageIndex = updatedImages.length - 1;
      } else if (updatedImages.length === 0) {
        newHomeImageIndex = 0;
      }
      return { ...prev, images: updatedImages, homeImageIndex: newHomeImageIndex };
    });
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Luxury': return 'bg-yellow-400 text-gray-900';
      case 'Deluxe': return 'bg-green-600 text-white';
      case 'Super Deluxe': return 'bg-blue-600 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const groupPropertiesByLocation = () => {
    const grouped = {};
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

  const getSelectedProperty = (location) => {
    return (properties || []).find(prop => prop && prop.location === location && prop.selected && !prop.isPlaceholder);
  };

  const groupedProperties = groupPropertiesByLocation();


  const renderPropertyFormFields = (currentProperty, setProperty) => (
    <>
      <style>
        {`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        `}
      </style>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Property Name</label>
          <input
            type="text"
            id="name"
            value={currentProperty.name}
            onChange={(e) => setProperty(prev => ({ ...prev, name: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            id="location"
            value={currentProperty.location}
            onChange={(e) => setProperty(prev => ({ ...prev, location: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            required
            readOnly
          />
        </div>
        <div>
          <label htmlFor="checkIn" className="block text-sm font-medium text-gray-700">Check-in Date</label>
          <input
            type="date"
            id="checkIn"
            value={currentProperty.checkIn}
            onChange={(e) => setProperty(prev => ({ ...prev, checkIn: e.target.value, checkOut: e.target.value > prev.checkOut ? '' : prev.checkOut }))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            required
            readOnly
          />
        </div>
        <div>
          <label htmlFor="checkOut" className="block text-sm font-medium text-gray-700">Check-out Date</label>
          <input
            type="date"
            id="checkOut"
            value={currentProperty.checkOut}
            onChange={(e) => setProperty(prev => ({ ...prev, checkOut: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            required
            min={currentProperty.checkIn}
            disabled={!currentProperty.checkIn}
            readOnly
          />
        </div>
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
          <input
            type="number"
            id="price"
            value={currentProperty.price}
            onChange={(e) => setProperty(prev => ({ ...prev, price: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            required
            step="0.01"
            placeholder="e.g., 100.00 or -50.00"
          />
        </div>
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Currency</label>
          <select
            id="currency"
            value={currentProperty.currency}
            onChange={(e) => setProperty(prev => ({ ...prev, currency: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="NZD">NZ$ (New Zealand Dollar)</option>
            <option value="USD">$ (United States Dollar)</option>
            <option value="EUR">€ (Euro)</option>
            <option value="INR">₹ (Indian Rupee)</option>
          </select>
        </div>
        <div>
          <label htmlFor="price_type" className="block text-sm font-medium text-gray-700">Price Type</label>
          <select
            id="price_type"
            value={currentProperty.price_type}
            onChange={(e) => setProperty(prev => ({ ...prev, price_type: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Per Night">Per Night</option>
            <option value="Total Stay">Total Stay</option>
          </select>
        </div>
        <div>
          <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700">Bedrooms</label>
          <input
            type="number"
            id="bedrooms"
            value={currentProperty.bedrooms}
            onChange={(e) => setProperty(prev => ({ ...prev, bedrooms: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
            placeholder="e.g., 2"
          />
        </div>
        <div>
          <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700">Bathrooms</label>
          <input
            type="number"
            id="bathrooms"
            value={currentProperty.bathrooms}
            onChange={(e) => setProperty(prev => ({ ...prev, bathrooms: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
            step="0.5"
            placeholder="e.g., 1.5"
          />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
          <select
            id="category"
            value={currentProperty.category}
            onChange={(e) => setProperty(prev => ({ ...prev, category: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Deluxe">Deluxe</option>
            <option value="Super Deluxe">Super Deluxe</option>
            <option value="Luxury">Luxury</option>
          </select>
        </div>
      </div>
      <div className="mb-6">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="description"
          value={currentProperty.description}
          onChange={(e) => setProperty(prev => ({ ...prev, description: e.target.value }))}
          rows="4"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
        <div className="border border-gray-300 rounded-md p-4 mb-4">
          <div className="mb-4">
            <label htmlFor="imageLinks" className="block text-sm font-medium text-gray-700">Add Image URLs (one per line)</label>
            <textarea
              id="imageLinks"
              rows="5"
              value={imageLinks}
              onChange={(e) => setImageLinks(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.png"
            ></textarea>
            <button
              type="button"
              onClick={() => handleAddImageLinks(isAddingNew ? newProperty : editingProperty, isAddingNew ? setNewProperty : setEditingProperty)}
              className="mt-2 cursor-pointer bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Link2 size={20} />
              <span>Add Images from Links</span>
            </button>
          </div>
          
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {currentProperty.images.map((image, index) => (
              <div key={index} className="relative group rounded-lg overflow-hidden shadow-sm aspect-video">
                <img src={image} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemoveImage(image, currentProperty, setProperty)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove image"
                >
                  <X size={16} />
                </button>
                {adminMode && (
                  <button
                    onClick={() => setProperty(prev => ({ ...prev, homeImageIndex: index }))}
                    className={`absolute bottom-1 left-1 rounded-full p-1 shadow-md transition-all duration-200
                      ${currentProperty.homeImageIndex === index ? `bg-${accentColor.replace('#', '')}/90 text-gray-900` : 'bg-gray-700 bg-opacity-70 text-white hover:bg-opacity-90'}`}
                    style={{
                      backgroundColor: currentProperty.homeImageIndex === index ? accentColor : undefined,
                      color: currentProperty.homeImageIndex === index ? '#333' : 'white'
                    }}
                    title="Set as Home Image"
                  >
                    <Image size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center">
        <input
          type="checkbox"
          id="selected"
          checked={currentProperty.selected}
          onChange={(e) => setProperty(prev => ({ ...prev, selected: e.target.checked }))}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="selected" className="ml-2 block text-sm font-medium text-gray-700">
          Selected for Client
        </label>
      </div>
    </>
  );

  const totalChange = properties.filter(p => p.selected && !p.isPlaceholder).reduce((sum, prop) => {
    return sum + parseCurrencyToNumber(prop.price);
  }, 0);

  return (
    <div className="admin-property-form-container font-['Century_Gothic']">
      <style>{`
        .font-century-gothic {
          font-family: 'Century Gothic', sans-serif;
        }
        .selected-border {
            border-color: ${accentColor};
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.7);
            border-width: 5px;
            border-radius: 1rem;
        }
      `}</style>
      {message && <p className="mb-4 text-center text-sm text-blue-600">{message}</p>}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm text-center">
          {error}
        </div>
      )}

      {adminMode && !isAddingNew && !editingProperty && (
        <div className="mb-6 text-center">
        </div>
      )}

      {adminMode && showPropertyFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={handleCancelForm}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {isAddingNew ? 'Add New Property' : 'Edit Property'}
            </h2>

            {renderPropertyFormFields(
              isAddingNew ? newProperty : editingProperty,
              isAddingNew ? setNewProperty : setEditingProperty
            )}

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  handleSavePropertyDetails(isAddingNew ? newProperty : editingProperty, isAddingNew);
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={uploadingImages || !(isAddingNew ? newProperty.name : editingProperty?.name) || !(isAddingNew ? newProperty.location : editingProperty?.location) || !(isAddingNew ? newProperty.checkIn : editingProperty?.checkIn) || !(isAddingNew ? newProperty.checkOut : editingProperty?.checkOut)}
              >
                {uploadingImages ? 'Uploading...' : (isAddingNew ? 'Save Property' : 'Save Changes')}
              </button>
              <button
                onClick={handleCancelForm}
                className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {expandedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative w-[90vw] h-[90vh] max-w-6xl max-h-[calc(100vh-80px)] bg-black flex items-center justify-center rounded-xl shadow-lg">
            <button
              onClick={closeExpandedImage}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 z-10"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            <img
              src={expandedImage}
              alt="Expanded view"
              className="max-w-full max-h-full object-contain rounded-xl"
            />
            {expandedImagePropertyId && properties.find(p => p.id === expandedImagePropertyId)?.images?.length > 1 && (
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
                  {properties.find(p => p.id === expandedImagePropertyId)?.images?.map((img, idx) => (
                    <div
                      key={idx}
                      className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-200 ${
                        idx === (currentImageIndex[expandedImagePropertyId] || properties.find(p => p.id === expandedImagePropertyId)?.homeImageIndex || 0) ? 'bg-white scale-125' : 'bg-white bg-opacity-60'
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

      <div className="space-y-10">
        {Object.entries(groupedProperties).map(([location, locationProperties]) => {
          const actualProperties = locationProperties.filter(p => !p.isPlaceholder);
          const itineraryDetails = locationProperties[0];

          return (
            <div key={location} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="p-5 border-b bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div className="mb-2 md:mb-0">
                    <h2 className="text-2xl font-bold text-gray-900 font-century-gothic text-left">
                      {location}
                    </h2>
                    <p className="text-sm text-gray-600">
                      <Calendar size={14} className="inline mr-1 text-gray-500" />
                      {itineraryDetails?.checkIn && itineraryDetails?.checkOut ?
                        `${formatDate(itineraryDetails.checkIn)} - ${formatDate(itineraryDetails.checkOut)} · ${calculateNights(itineraryDetails.checkIn, itineraryDetails.checkOut)} nights`
                        : 'Dates N/A'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-left md:text-right">
                        <p className="text-sm text-gray-600">Selected Property:</p>
                        <p className="font-semibold text-gray-900 text-base">
                            {getSelectedProperty(location)?.name || 'None'}
                        </p>
                    </div>
                    {adminMode && (
                        <button
                            onClick={() => handleAddNewPropertyClick({
                                location: itineraryDetails.location,
                                checkIn: itineraryDetails.checkIn,
                                checkOut: itineraryDetails.checkOut
                            })}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors flex items-center text-sm"
                        >
                            <Plus size={16} className="inline mr-1" /> Add Property
                        </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5">
                {actualProperties.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <p>No properties added for this itinerary yet.</p>
                        <p>Click "Add Property" to get started.</p>
                    </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                    {actualProperties.map((property) => {
                      const priceValue = parseCurrencyToNumber(property.price);
                      const priceColorStyle = getPriceColorStyle(priceValue);

                      return (
                        <div
                          key={property.id}
                          className={`relative group bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden transform hover:scale-102 transition-all duration-300 cursor-pointer
                            ${property.selected ? 'selected-border' : ''}`}
                          onClick={() => toggleSelection(property.location, property.id)}
                        >
                          {adminMode && (
                            <div className="absolute top-3 left-3 z-10">
                              <input
                                type="checkbox"
                                checked={property.selected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleSelection(property.location, property.id);
                                }}
                                className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                              />
                            </div>
                          )}

                          {adminMode && (
                            <div className="absolute top-3 right-3 z-10 flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPropertyClick(property);
                                }}
                                className="p-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors"
                                title="Edit Property"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProperty(property.id);
                                }}
                                className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors"
                                title="Delete Property"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}

                          <div className="aspect-w-16 aspect-h-9 overflow-hidden">
                            {property.images && property.images.length > 0 ? (
                              <div className="relative w-full h-48 sm:h-56">
                                <img
                                  src={property.images[currentImageIndex[property.id] || property.homeImageIndex || 0]}
                                  alt={property.name}
                                  className="w-full h-full object-cover"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openExpandedImage(property.id, currentImageIndex[property.id] || property.homeImageIndex || 0);
                                  }}
                                />
                                {property.images.length > 1 && (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); prevImage(property.id); }}
                                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity opacity-0 group-hover:opacity-100"
                                    >
                                      <ChevronLeft size={20} />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); nextImage(property.id); }}
                                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity opacity-0 group-hover:opacity-100"
                                    >
                                      <ChevronRight size={20} />
                                    </button>
                                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                                      {property.images.map((img, idx) => (
                                        <div
                                          key={idx}
                                          className={`w-2 h-2 rounded-full ${
                                            idx === (currentImageIndex[property.id] || property.homeImageIndex || 0) ? 'bg-white' : 'bg-gray-400'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openExpandedImage(property.id, currentImageIndex[property.id] || property.homeImageIndex || 0);
                                  }}
                                  className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity opacity-0 group-hover:opacity-100"
                                  title="Expand Image"
                                >
                                  <Maximize2 size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="w-full h-48 sm:h-56 bg-gray-200 flex items-center justify-center text-gray-500">
                                <Image size={48} />
                              </div>
                            )}
                          </div>

                          <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-xl font-bold text-gray-900 leading-tight">
                                {property.name}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getCategoryColor(property.category)}`}>
                                {property.category}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm mb-3 flex items-center">
                              <MapPin size={14} className="inline mr-1 text-gray-500" />
                              {property.location}
                            </p>
                            <p className="text-gray-600 text-sm mb-3">
                              {property.description}
                            </p>

                            <div className="flex justify-between items-end mt-4">
                              <div className="flex items-center text-gray-700 text-sm space-x-3">
                                {(property.bedrooms !== undefined && property.bedrooms !== null && property.bedrooms !== '') && (property.bedrooms > 0) && (
                                  <div className="flex items-center">
                                    <BedDouble size={12} className="mr-0.5" />
                                    <span>{property.bedrooms}</span>
                                  </div>
                                )}
                                {(property.bathrooms !== undefined && property.bathrooms !== null && property.bathrooms !== '') && (property.bathrooms > 0) && (
                                  <div className="flex items-center">
                                    <Bath size={12} className="mr-0.5" />
                                    <span>{property.bathrooms}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right w-full sm:w-auto">
                                <span className="font-bold text-xl text-gray-900" style={priceColorStyle}>
                                  {getCurrencySymbol(property.currency)}{priceValue >= 0 ? '+' : ''}{priceValue.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {(properties && properties.filter(p => !p.isPlaceholder).length > 0) && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 mt-10">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Summary of Selected Properties</h3>
            {Object.entries(groupedProperties).map(([location, locationProperties]) => {
              const selectedProperty = getSelectedProperty(location);
              if (!selectedProperty) return null;

              const priceValue = parseCurrencyToNumber(selectedProperty.price);
              const priceColorStyle = getPriceColorStyle(priceValue);

              return (
                <div key={`summary-${location}`} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-lg font-semibold text-gray-800">{selectedProperty.name}</p>
                    <p className="text-sm text-gray-600">{selectedProperty.location}</p>
                    <div className="flex items-center text-gray-700 text-xs space-x-2 mt-1">
                      {(selectedProperty.bedrooms !== undefined && selectedProperty.bedrooms !== null && selectedProperty.bedrooms !== '') && (selectedProperty.bedrooms > 0) && (
                        <div className="flex items-center">
                          <BedDouble size={12} className="mr-0.5" />
                          <span>{selectedProperty.bedrooms}</span>
                        </div>
                      )}
                      {(selectedProperty.bathrooms !== undefined && selectedProperty.bathrooms !== null && selectedProperty.bathrooms !== '') && (selectedProperty.bathrooms > 0) && (
                        <div className="flex items-center">
                          <Bath size={12} className="mr-0.5" />
                          <span>{selectedProperty.bathrooms}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right w-full sm:w-auto">
                    <span className="font-bold text-xl text-gray-900" style={priceColorStyle}>
                      {getCurrencySymbol(selectedProperty.currency)}{priceValue >= 0 ? '+' : ''}{priceValue.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900">Total Price Change:</span>
                <span className={`text-3xl font-extrabold`} style={getTotalChangeColorStyle(totalChange)}>
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
