// src/components/PropertyForm.jsx - Version 6.2
// This component is designed to be a controlled component used by AdminDashboard.
// It receives properties and update functions as props.
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
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
  BedDouble, // Icon for bedrooms
  Bath,      // Icon for bathrooms
  Image,     // Icon for selecting home image
  Plus, // Added Plus icon for 'Add New Property' button
} from 'lucide-react';

const PropertyForm = ({
  properties, // This is the list of properties for the current client selection
  setProperties, // Callback to update the properties list in the parent (AdminDashboard)
  customLogoUrl, // Logo for display (not used directly in this component, but can be passed down)
  setCustomLogoUrl, // For changing the logo from within PropertyForm if needed by Admin
  onSave,       // Callback to trigger a save in the parent (AdminDashboard) after property changes
  adminMode = false // Controls whether admin features (add/edit/delete/toggle selection) are visible
}) => {
  const accentColor = '#FFD700';
  const accentColorDark = '#DAA520';
  // Re-added savingsColor and extraColor
  const savingsColor = '#10B981'; // Dark green for savings (negative)
  const extraColor = '#EF4444';   // Dark red for extra (positive)

  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [expandedImage, setExpandedImage] = useState(null);
  const [expandedImagePropertyId, setExpandedImagePropertyId] = useState(null);
  const [newProperty, setNewProperty] = useState({
    name: '', location: '', checkIn: '', checkOut: '', currency: 'NZD',
    price: '', // MODIFIED: Changed from 0 to empty string
    price_type: 'Per Night',
    bedrooms: '', bathrooms: '', images: [], homeImageIndex: 0, // MODIFIED: Changed from 0 to empty string
    selected: false, description: '', category: 'Luxury', // Default category set to 'Luxury'
  });
  const [isAddingNew, setIsAddingNew] = useState(false); // Controls the add form visibility
  const [editingProperty, setEditingProperty] = useState(null); // For existing property edits
  const [showPropertyFormModal, setShowPropertyFormModal] = useState(false); // Controls the visibility of the property form modal (for add/edit)
  const [tempImageFiles, setTempImageFiles] = useState([]); // For new image files before upload
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imagePreviews, setImagePreviews] = useState({}); // Stores URLs for existing images
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  // Helper for initial state of a new property
  const initialNewPropertyState = {
    name: '', location: '', checkIn: '', checkOut: '', currency: 'NZD',
    price: '', // MODIFIED: Changed from 0 to empty string
    price_type: 'Per Night',
    bedrooms: '', bathrooms: '', images: [], homeImageIndex: 0, // MODIFIED: Changed from 0 to empty string
    selected: false, description: '', category: 'Luxury', // Default category set to 'Luxury'
  };

  // Initialize currentImageIndex when the 'properties' prop changes
  useEffect(() => {
    const initialImageIndices = {};
    (properties || []).forEach(prop => {
      if (prop && prop.id !== undefined) {
        initialImageIndices[prop.id] = prop.homeImageIndex || 0;
      }
    });
    setCurrentImageIndex(initialImageIndices);
  }, [properties]);

  // For adding a new property
  const handleAddNewPropertyClick = () => {
    setNewProperty({ ...initialNewPropertyState }); // Reset form fields
    setIsAddingNew(true); // Show the new property form
    setEditingProperty(null); // Ensure not in edit mode
    setShowPropertyFormModal(true); // Open the modal
    setMessage('');
    setError(null);
  };

  // For editing an existing property
  const handleEditPropertyClick = (property) => {
    // Set the property to be edited
    // Ensure that if price, bedrooms, or bathrooms are 0, they appear as empty in the edit form
    setEditingProperty({
      ...property,
      price: property.price === 0 ? '' : property.price,
      bedrooms: property.bedrooms === 0 ? '' : property.bedrooms,
      bathrooms: property.bathrooms === 0 ? '' : property.bathrooms,
    });
    setIsAddingNew(false); // Ensure not in add mode
    setShowPropertyFormModal(true); // Open the modal for editing

    // Populate image previews for editing property
    const initialPreviews = {};
    property.images.forEach((url) => {
      initialPreviews[url] = url; // Use the URL itself as the preview for existing images
    });
    setImagePreviews(initialPreviews);

    setMessage('');
    setError(null);
  };

  // Function to handle saving new/edited property details
  const handleSavePropertyDetails = async (propertyToSave, isNewProperty) => {
    setUploadingImages(true); // Indicate that saving/uploading is in progress
    setError(null); // Clear previous errors

    try {
      // Ensure numeric fields are correctly parsed before saving
      const finalPropertyToSave = {
        ...propertyToSave,
        price: parseCurrencyToNumber(propertyToSave.price),
        bedrooms: parseInt(propertyToSave.bedrooms) || 0,
        bathrooms: parseFloat(propertyToSave.bathrooms) || 0,
      };

      let updatedProperties;
      if (isNewProperty) {
        // Generate a simple unique ID for new property
        const newId = `prop-${Date.now()}`;
        const propertyWithId = { ...finalPropertyToSave, id: newId };
        updatedProperties = [...properties, propertyWithId];
      } else {
        updatedProperties = properties.map(prop =>
          prop.id === propertyToSave.id ? finalPropertyToSave : prop
        );
      }

      setProperties(updatedProperties); // Update the state immediately
      if (onSave) {
        await onSave(updatedProperties); // Trigger save to parent (AdminDashboard)
      }
      setMessage(isNewProperty ? 'Property added successfully!' : 'Property updated successfully!');
      isNewProperty ? setIsAddingNew(false) : setEditingProperty(null);
      setShowPropertyFormModal(false); // Close modal on success for both new and existing property
    } catch (err) {
      console.error("Save error:", err);
      setError(`Failed to save property: ${err.message}`);
      setUploadingImages(false); // Ensure loading state is reset
    } finally {
      setUploadingImages(false);
    }
  };

  // Function to handle form cancellation
  const handleCancelForm = () => {
    if (isAddingNew) {
      setIsAddingNew(false);
      setNewProperty({ ...initialNewPropertyState }); // Clear fields
    } else if (editingProperty) {
      setEditingProperty(null);
      setNewProperty({ ...initialNewPropertyState }); // Clear newProperty state for next add
    }
    setTempImageFiles([]); // Clear any temporary image files
    setImagePreviews({}); // Clear image previews
    setMessage('');
    setError(null);
    setIsAddingNew(false); // Reset add mode
    setShowPropertyFormModal(false); // Close modal on cancel for both new and existing property
  };

  // For deleting a property
  const handleDeleteProperty = (idToDelete) => {
    if (window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
      const updatedProperties = properties.filter(prop => prop.id !== idToDelete);
      setProperties(updatedProperties);
      if (onSave) {
        onSave(updatedProperties); // Trigger save to parent
      }
      setMessage('Property deleted successfully!');
      setError(null);
    }
  };

  // Function to handle setting an image as the home image
  const handleSetHomeImage = (propertyId, imageIndex) => {
    const updatedProperties = properties.map(prop =>
      prop.id === propertyId ? { ...prop, homeImageIndex: imageIndex } : prop
    );
    setProperties(updatedProperties);
    if (onSave) {
      onSave(updatedProperties);
    }
  };

  // MODIFIED: Toggles the selection status of a property, ensuring only one per location.
  // This now works regardless of adminMode.
  const toggleSelection = useCallback((locationId, propertyId) => {
    if (typeof setProperties === 'function') {
      const updatedProperties = (properties || []).map(prop => {
        if (prop && prop.location === locationId) {
          // If the clicked property is already selected, deselect it.
          // Otherwise, select the clicked property and deselect all others in the same location.
          return { ...prop, selected: (prop.id === propertyId) ? !prop.selected : false };
        }
        return prop;
      });
      setProperties(updatedProperties);
    } else {
      console.error("PropertyForm: setProperties prop is not a function in toggleSelection.");
    }
  }, [properties, setProperties]); // Depend on 'properties' and 'setProperties'


  // Utility function to safely parse numeric values from currency strings
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

  // NEW: Function to get price color style
  const getPriceColorStyle = (price) => {
    if (price < 0) {
      return { color: savingsColor }; // Dark green for negative (savings)
    } else if (price > 0) {
      return { color: extraColor }; // Dark red for positive (extra)
    }
    return { color: '#333' }; // Default color for zero
  };

  // NEW: Function to get total change color style
  const getTotalChangeColorStyle = (totalChangeValue) => {
    if (totalChangeValue < 0) {
      return { color: savingsColor }; // Dark green for negative (savings)
    } else if (totalChangeValue > 0) {
      return { color: extraColor }; // Dark red for positive (extra)
    }
    return { color: '#333' }; // Default color for zero
  };

  // Image navigation for property cards
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

  // Image expansion logic
  const openExpandedImage = (propertyId, index) => {
    const property = properties.find(p => p.id === propertyId);
    if (property && property.images && property.images[index]) {
      setExpandedImage(property.images[index]);
      setExpandedImagePropertyId(propertyId);
      setCurrentImageIndex(prev => ({ ...prev, [propertyId]: index })); // Set current index for expanded view
    }
  };

  const closeExpandedImage = () => {
    setExpandedImage(null);
    setExpandedImagePropertyId(null);
  };

  const prevExpandedImage = () => {
    if (expandedImagePropertyId) {
      prevImage(expandedImagePropertyId);
      const property = properties.find(p => p.id === expandedImagePropertyId);
      if (property) {
        setExpandedImage(property.images[(currentImageIndex[expandedImagePropertyId] - 1 + property.images.length) % property.images.length]);
      }
    }
  };

  const nextExpandedImage = () => {
    if (expandedImagePropertyId) {
      nextImage(expandedImagePropertyId);
      const property = properties.find(p => p.id === expandedImagePropertyId);
      if (property) {
        setExpandedImage(property.images[(currentImageIndex[expandedImagePropertyId] + 1) % property.images.length]);
      }
    }
  };

  // Keyboard navigation for expanded image
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (expandedImage) {
        if (event.key === 'ArrowRight') {
          nextExpandedImage();
        } else if (event.key === 'ArrowLeft') {
          prevExpandedImage();
        } else if (event.key === 'Escape') {
          setExpandedImage(null);
          setExpandedImagePropertyId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandedImage, nextExpandedImage, prevExpandedImage]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString + 'T00:00:00'); // Added T00:00:00 for consistent parsing
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return new Intl.DateTimeFormat('en-NZ', {
        day: 'numeric',
        month: 'short', // Changed to short month
        year: '2-digit'  // Changed to 2-digit year
      }).format(date);
    } catch (e) {
      console.error("Error formatting date:", e);
      return 'Error';
    }
  };

  // Calculate number of nights
  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Handle image file input change (Supabase integration)
  const handleImageFileChange = async (e, currentProperty, setProperty) => {
    const files = Array.from(e.target.files);
    setUploadingImages(true);
    setError(null);

    const newImageFiles = [];
    const newImageUrls = [...(currentProperty.images || [])]; // Existing images
    const previewsToAdd = {};

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicURLData } = supabase.storage
          .from('property-images')
          .getPublicUrl(data.path);

        newImageUrls.push(publicURLData.publicUrl);
        newImageFiles.push(file); // Keep track of files to associate with property
        previewsToAdd[publicURLData.publicUrl] = publicURLData.publicUrl;
      }

      setProperty(prev => ({
        ...prev,
        images: newImageUrls,
        homeImageIndex: prev.homeImageIndex >= 0 ? prev.homeImageIndex : 0, // Ensure homeImageIndex is valid
      }));
      setTempImageFiles(prev => [...prev, ...newImageFiles]);
      setImagePreviews(prev => ({ ...prev, ...previewsToAdd }));
      setMessage('Images uploaded successfully!');
    } catch (error) {
      console.error('Error uploading images:', error);
      setError(`Error uploading images: ${error.message}`);
    } finally {
      setUploadingImages(false);
    }
  };

  // Handle image removal from property (both new and existing)
  const handleRemoveImage = (imageToRemoveUrl, currentProperty, setProperty) => {
    const updatedImages = currentProperty.images.filter(url => url !== imageToRemoveUrl);
    setProperty(prev => {
      let newHomeImageIndex = prev.homeImageIndex;
      if (updatedImages.length > 0 && newHomeImageIndex >= updatedImages.length) {
        newHomeImageIndex = updatedImages.length - 1; // Adjust if home image index is now out of bounds
      } else if (updatedImages.length === 0) {
        newHomeImageIndex = 0; // No images left
      }
      return { ...prev, images: updatedImages, homeImageIndex: newHomeImageIndex };
    });
    setImagePreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[imageToRemoveUrl];
      return newPreviews;
    });

    // Optionally, if it's an existing image in Supabase, you might want to delete it from storage too
    // This would require a separate Supabase delete call
  };

  // MODIFIED: Categories are now only Deluxe, Super Deluxe, Luxury
  const getCategoryColor = (category) => {
    switch (category) {
      case 'Luxury': return 'bg-yellow-400 text-gray-900';
      case 'Deluxe': return 'bg-green-600 text-white';
      case 'Super Deluxe': return 'bg-blue-600 text-white';
      default: return 'bg-gray-400 text-white'; // Fallback for unexpected categories
    }
  };

  // Group properties by location
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

  // Get selected property for summary
  const getSelectedProperty = (location) => {
    // Returns the single selected property for a given location for the summary
    return (properties || []).find(prop => prop && prop.location === location && prop.selected);
  };

  const groupedProperties = groupPropertiesByLocation();


  const renderPropertyFormFields = (currentProperty, setProperty) => (
    <>
      <style>
        {`
        /* Hide spin buttons for number input */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield; /* Firefox */
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
          />
        </div>
        <div>
          <label htmlFor="checkIn" className="block text-sm font-medium text-gray-700">Check-in Date</label>
          <input
            type="date"
            id="checkIn"
            value={currentProperty.checkIn}
            onChange={(e) => setProperty(prev => ({ ...prev, checkIn: e.target.value, checkOut: e.target.value > prev.checkOut ? '' : prev.checkOut }))} // Clear checkout if it's before new checkIn
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            required
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
            min={currentProperty.checkIn} // MODIFIED: Checkout date must be after check-in date
            disabled={!currentProperty.checkIn} // Disable if check-in not set
          />
        </div>
        {/* MODIFIED: Price input now allows 2 decimal places and negative sign, with arrows hidden via CSS */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
          <input
            type="number" // Still type number for semantic meaning, but arrows hidden with CSS
            id="price"
            value={currentProperty.price}
            onChange={(e) => setProperty(prev => ({ ...prev, price: e.target.value }))} // Keep as string for display
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            required
            step="0.01" // Allows 2 decimal places
            placeholder="e.g., 100.00 or -50.00" // Added placeholder for clarity
          />
        </div>
        {/* Removed original_price and adjusted_price inputs */}
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Currency</label>
          <select
            id="currency"
            value={currentProperty.currency}
            onChange={(e) => setProperty(prev => ({ ...prev, currency: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="NZD">NZD</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
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
            onChange={(e) => setProperty(prev => ({ ...prev, bedrooms: e.target.value }))} // Keep as string for display
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
            onChange={(e) => setProperty(prev => ({ ...prev, bathrooms: e.target.value }))} // Keep as string for display
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
            {/* MODIFIED: Categories are now only Deluxe, Super Deluxe, Luxury */}
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
          <input
            type="file"
            id="imageUpload"
            multiple
            accept="image/*"
            onChange={(e) => handleImageFileChange(e, currentProperty, setProperty)}
            className="hidden"
          />
          <label
            htmlFor="imageUpload"
            className="cursor-pointer bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Upload size={20} />
            <span>{uploadingImages ? 'Uploading...' : 'Upload Images'}</span>
          </label>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {currentProperty.images.map((image, index) => (
              <div key={index} className="relative group rounded-lg overflow-hidden shadow-sm aspect-video">
                <img src={image} alt={`Property image ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemoveImage(image, currentProperty, setProperty)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove image"
                >
                  <X size={16} />
                </button>
                {/* Admin Mode Controls for Home Image (on the form itself) */}
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

      {/* Checkbox for 'selected' in the form (Admin Mode) */}
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

  // MODIFIED: Calculate total change as sum of prices of selected properties
  const totalChange = properties.filter(p => p.selected).reduce((sum, prop) => {
    // Ensure to parse price from string to number before summing
    return sum + parseCurrencyToNumber(prop.price);
  }, 0);

  return ( // Main container for PropertyForm
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

      {/* Admin Button for Add New Property */}
      {adminMode && !isAddingNew && !editingProperty && (
        <div className="mb-6 text-center">
          <button onClick={handleAddNewPropertyClick} className="px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors flex items-center text-lg">
            <Plus size={20} className="inline mr-2" /> Add New Property
          </button>
        </div>
      )}

      {/* Unified Modal for Add/Edit Property */}
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

            {/* Render the form fields dynamically based on whether it's adding or editing */}
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

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative w-[90vw] h-[90vh] max-w-6xl max-h-[calc(100vh-80px)] bg-black flex items-center justify-center rounded-xl shadow-lg">
            <button
              onClick={closeExpandedImage}
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
                {(locationProperties || []).map((property) => {
                  const priceValue = parseCurrencyToNumber(property.price); // Use single price field
                  const priceColorStyle = getPriceColorStyle(priceValue);

                  return (
                    <div
                      key={property.id}
                      className={`relative group bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden transform hover:scale-102 transition-all duration-300 cursor-pointer
                        ${property.selected ? 'selected-border' : ''}`}
                      onClick={() => toggleSelection(property.location, property.id)}
                    >
                      {/* Checkbox/Selection Indicator for Admin Mode */}
                      {adminMode && (
                        <div className="absolute top-3 left-3 z-10">
                          <input
                            type="checkbox"
                            checked={property.selected}
                            onChange={(e) => {
                              e.stopPropagation(); // Prevent card click from toggling selection twice
                              toggleSelection(property.location, property.id);
                            }}
                            className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </div>
                      )}

                      {/* Admin Edit/Delete Buttons */}
                      {adminMode && (
                        <div className="absolute top-3 right-3 z-10 flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              handleEditPropertyClick(property);
                            }}
                            className="p-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors"
                            title="Edit Property"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
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
                            {(property.bedrooms !== undefined && property.bedrooms !== null && property.bedrooms !== '') && (property.bedrooms > 0) && ( // Check for non-empty string
                              <div className="flex items-center">
                                <BedDouble size={12} className="mr-0.5" />
                                <span>{property.bedrooms}</span>
                              </div>
                            )}
                            {(property.bathrooms !== undefined && property.bathrooms !== null && property.bathrooms !== '') && (property.bathrooms > 0) && ( // Check for non-empty string
                              <div className="flex items-center">
                                <Bath size={12} className="mr-0.5" />
                                <span>{property.bathrooms}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right w-full sm:w-auto">
                            {/* MODIFIED: Display price with sign and color */}
                            <span className="font-bold text-xl text-gray-900" style={priceColorStyle}>
                              {property.currency}{priceValue >= 0 ? '+' : ''}{priceValue.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Total Price Change Summary */}
        {(properties && properties.length > 0) && (
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
                      {(selectedProperty.bedrooms !== undefined && selectedProperty.bedrooms !== null && selectedProperty.bedrooms !== '') && (selectedProperty.bedrooms > 0) && ( // Check for non-empty string
                        <div className="flex items-center">
                          <BedDouble size={12} className="mr-0.5" />
                          <span>{selectedProperty.bedrooms}</span>
                        </div>
                      )}
                      {(selectedProperty.bathrooms !== undefined && selectedProperty.bathrooms !== null && selectedProperty.bathrooms !== '') && (selectedProperty.bathrooms > 0) && ( // Check for non-empty string
                        <div className="flex items-center">
                          <Bath size={12} className="mr-0.5" />
                          <span>{selectedProperty.bathrooms}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right w-full sm:w-auto">
                    {/* MODIFIED: Display single price */}
                    <span className="font-bold text-xl text-gray-900" style={priceColorStyle}>
                      {selectedProperty.currency}{priceValue >= 0 ? '+' : ''}{priceValue.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900">Total Price Change:</span>
                {/* MODIFIED: Display sum of prices with color and sign */}
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
