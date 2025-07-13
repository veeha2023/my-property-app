// src/pages/AdminDashboard.jsx - Version 7.15 (Debugging Itinerary Edit Persistence)
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';
import PropertyForm from '../components/PropertyForm.jsx';
import ActivityForm from '../components/ActivityForm.jsx';
import { Link } from 'react-router-dom';
import { LogOut, Plus, Edit, Trash2, Eye, ExternalLink, ChevronLeft, ChevronRight, X, MapPin, Share2, Building, Activity, Plane, Car, ClipboardList, Calendar } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns'; // Import date-fns for formatting

const PlaceholderContent = ({ title }) => (
  <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-lg">
    <h3 className="text-2xl font-bold">{title}</h3>
    <p className="mt-2">The management interface for this section will be available here.</p>
  </div>
);

const AdminDashboard = ({}) => {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [editingClientName, setEditingClientName] = useState('');
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [globalLogoUrl, setGlobalLogoUrl] = useState(null);
  const [newGlobalLogoFile, setNewGlobalLogoFile] = useState(null);
  const [companyName, setCompanyName] = useState('Veeha Travels');
  const [activeTab, setActiveTab] = useState('clients');
  const [showItineraryModal, setShowItineraryModal] = useState(false); // For adding/editing single itinerary
  const [showItineraryListModal, setShowItineraryListModal] = useState(false); // For showing list of itineraries
  const [newItinerary, setNewItinerary] = useState({ location: '', checkIn: '', checkOut: '' });
  const [activeClientTab, setActiveClientTab] = useState('summary');
  const [clientData, setClientData] = useState(null);
  const [editingItineraryLeg, setEditingItineraryLeg] = useState(null); // State for editing single itinerary leg
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false); // State for delete confirmation modal
  const [itineraryToDelete, setItineraryToDelete] = useState(null); // State to hold itinerary to be deleted
  const [originalEditingLegLocation, setOriginalEditingLegLocation] = useState(''); // To store original location for edit
  const [originalEditingLegCheckIn, setOriginalEditingLegCheckIn] = useState(''); // To store original checkIn for edit
  const [originalEditingLegCheckOut, setOriginalEditingLegCheckOut] = useState(''); // To store original checkOut for edit


  const accentColor = '#FFD700';
  const primaryBgColor = '#F7F7F7';
  const secondaryBgColor = '#FFFFFF';
  const sidebarBg = '#1A202C';
  const headerBg = '#1A202C';
  const primaryTextColor = '#2D3748';
  const secondaryTextColor = '#718096';
  const buttonPrimary = accentColor;
  const buttonTextPrimary = '#1A202C';
  const GLOBAL_SETTINGS_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  // Helper to format dates for display
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

  // Sort properties by check-in date
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

  // Sort activities by date and time
  const sortActivitiesByDateTime = (activities) => {
    if (!activities || !Array.isArray(activities)) return [];
    return [...activities].sort((a, b) => {
      // Combine date and time for a full datetime object
      const dateTimeA = new Date(`${a.date}T${a.time || '00:00'}`);
      const dateTimeB = new Date(`${b.date}T${b.time || '00:00'}`);

      if (isNaN(dateTimeA.getTime())) return 1;
      if (isNaN(dateTimeB.getTime())) return -1;

      return dateTimeA.getTime() - dateTimeB.getTime();
    });
  };

  // Initialize client data structure, ensuring properties are sorted
  // and creating placeholder properties for all unique locations from both properties and activities.
  const initializeClientData = (clientPropertiesData) => {
    const baseData = {
      properties: [],
      activities: [],
      flights: [],
      cars: [],
    };

    // Ensure clientPropertiesData is an object
    const data = typeof clientPropertiesData === 'object' && clientPropertiesData !== null
      ? clientPropertiesData
      : {};

    const existingProperties = Array.isArray(data.properties) ? data.properties : [];
    const existingActivities = Array.isArray(data.activities) ? data.activities : [];

    // Collect all unique locations from both properties and activities
    const allLocations = new Set();
    existingProperties.forEach(p => {
      if (p.location) allLocations.add(p.location.trim());
    });
    existingActivities.forEach(a => {
      if (a.location) allLocations.add(a.location.trim());
    });

    // Create a map of existing placeholder properties by location
    const placeholderMap = new Map();
    existingProperties.filter(p => p.isPlaceholder).forEach(p => {
      if (p.location) placeholderMap.set(p.location.trim(), p);
    });

    // Generate or update placeholder properties for all unique locations
    const generatedPlaceholders = Array.from(allLocations).map(location => {
      const existingPlaceholder = placeholderMap.get(location);
      if (existingPlaceholder) {
        return existingPlaceholder; // Use existing placeholder if available
      } else {
        // Find a property or activity to get checkIn/checkOut dates for new placeholder
        // Prefer property dates if available, otherwise use activity dates
        const relatedProperty = existingProperties.find(p => p.location?.trim() === location && !p.isPlaceholder);
        const relatedActivity = existingActivities.find(a => a.location?.trim() === location);
        
        return {
          id: `itinerary-placeholder-${Date.now()}-${location.replace(/\s/g, '')}`, // Unique ID
          name: 'Itinerary Placeholder',
          location: location,
          checkIn: relatedProperty?.checkIn || relatedActivity?.date || '', // Use property checkIn, then activity date
          checkOut: relatedProperty?.checkOut || relatedActivity?.date || '', // Use property checkOut, then activity date
          price: 0,
          currency: 'NZD',
          images: [],
          bedrooms: 0,
          bathrooms: 0,
          selected: false,
          isPlaceholder: true,
        };
      }
    });

    // Combine actual properties (non-placeholders) with generated placeholders
    const finalProperties = [
      ...existingProperties.filter(p => !p.isPlaceholder),
      ...generatedPlaceholders
    ];

    return {
      ...baseData,
      ...data, // Include other data like flights, cars
      properties: sortPropertiesByDate(finalProperties), // Sort properties on initialization
      activities: sortActivitiesByDateTime(existingActivities), // Sort activities on initialization
    };
  };

  // Handles selecting a client from the sidebar
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
    setActiveClientTab('summary');
    setMessage(`Editing details for ${client.client_name}`);
    setError(null);
  };

  // Saves the entire clientData object to Supabase
  const handleSaveClientData = async () => {
    if (!selectedClient || !clientData) {
      setMessage('No client selected to save data.');
      return;
    }
    setLoading(true);
    setMessage('');
    setError(null);

    // Ensure properties and activities are sorted before saving
    const dataToSave = {
        ...clientData,
        properties: sortPropertiesByDate(clientData.properties), // Re-sort properties before saving
        activities: sortActivitiesByDateTime(clientData.activities), // Re-sort activities before saving
    };
    const dataJson = JSON.stringify(dataToSave);

    console.log("Saving client data:", dataToSave); // Log data being saved

    const { error: updateError } = await supabase
      .from('clients')
      .update({ client_properties: dataJson, last_updated: new Date().toISOString() })
      .eq('id', selectedClient.id);

    if (updateError) {
      console.error('Error saving client data:', updateError.message);
      setError('Error saving client data: ' + updateError.message);
    } else {
      setMessage('Client data saved successfully!');
      // Re-fetch client data after successful save to ensure UI is fully updated
      await fetchClients();
      // Re-initialize the selected client's data from the updated database
      const updatedClient = await supabase
        .from('clients')
        .select('*')
        .eq('id', selectedClient.id)
        .single();
      
      if (updatedClient.data) {
        // Re-initialize clientData with the fresh data from database
        let parsedClientProperties = null;
        try {
          if (typeof updatedClient.data.client_properties === 'string') {
            parsedClientProperties = JSON.parse(updatedClient.data.client_properties);
          } else {
            parsedClientProperties = updatedClient.data.client_properties;
          }
        } catch (e) {
          console.error("Error parsing client_properties:", e);
          parsedClientProperties = null;
        }
        
        const fullClientData = initializeClientData(parsedClientProperties);
        setClientData(fullClientData);
        setSelectedClient(updatedClient.data);
      }
    }
    setLoading(false);
  };

  // Updates properties in clientData state (called from PropertyForm)
  const handleUpdateProperties = (updatedProperties) => {
    setClientData(prevData => ({
        ...prevData,
        properties: updatedProperties
    }));
  };

  // Updates activities in clientData state (called from ActivityForm)
  const handleUpdateActivities = (updatedActivities) => {
    setClientData(prevData => ({
        ...prevData,
        activities: updatedActivities
    }));
  };

  // Handles adding a new itinerary leg (placeholder property)
  const handleSaveItinerary = async () => {
      if (!selectedClient || !newItinerary.location || !newItinerary.checkIn || !newItinerary.checkOut) {
          setError("Please fill in all itinerary fields.");
          return;
      }

      const placeholderProperty = {
          id: `itinerary-placeholder-${Date.now()}`, // Unique ID for the placeholder
          name: 'Itinerary Placeholder', // Generic name
          location: newItinerary.location.trim(), // Trim location on save
          checkIn: newItinerary.checkIn,
          checkOut: newItinerary.checkOut,
          price: 0, // Placeholders have 0 price
          currency: 'NZD',
          images: [],
          bedrooms: 0,
          bathrooms: 0,
          selected: false,
          isPlaceholder: true, // Mark as placeholder
      };
      
      const updatedProperties = [...(clientData?.properties || []), placeholderProperty];
      setClientData(prevData => ({
        ...prevData,
        properties: updatedProperties
      }));

      setShowItineraryModal(false);
      setNewItinerary({ location: '', checkIn: '', checkOut: '' }); // Reset form
      setMessage('Itinerary added. Remember to click "Save All Client Changes" to persist.');
      setError(null);
      await handleSaveClientData(); // Auto-save after adding
  };

  // Handles editing an existing itinerary leg
  const handleEditItineraryLeg = (leg) => {
    setEditingItineraryLeg({ ...leg }); // Set the leg to be edited
    setOriginalEditingLegLocation(leg.location.trim()); // Store original location
    setOriginalEditingLegCheckIn(leg.checkIn); // Store original checkIn
    setOriginalEditingLegCheckOut(leg.checkOut); // Store original checkOut
    setShowItineraryListModal(false); // Close the list modal
    setShowItineraryModal(true); // Open the single edit modal
  };

  // Handles saving changes to an edited itinerary leg
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

        // Step 1: Update the placeholder property itself
        const updatedPropertiesIncludingPlaceholder = clientData.properties.map(prop =>
            prop.id === editingItineraryLeg.id ? { ...editingItineraryLeg, location: newLocation, isPlaceholder: true } : prop
        );

        // Step 2: Update associated non-placeholder properties
        const updatedAssociatedProperties = updatedPropertiesIncludingPlaceholder.map(prop => {
            // Only update if location matches original AND it's not a placeholder itself
            if (!prop.isPlaceholder && prop.location?.trim() === originalEditingLegLocation) {
                return {
                    ...prop,
                    location: newLocation,
                    checkIn: newCheckIn,
                    checkOut: newCheckOut,
                };
            }
            return prop;
        });

        // Step 3: Update associated activities
        const updatedActivities = clientData.activities.map(act => {
            // Only update if location matches original
            if (act.location?.trim() === originalEditingLegLocation) {
                return {
                    ...act,
                    location: newLocation,
                    date: newCheckIn, // Activities use 'date' instead of 'checkIn'
                };
            }
            return act;
        });

        // Update the clientData state with all modified arrays
        setClientData(prevData => ({
            ...prevData,
            properties: updatedAssociatedProperties, // This now holds all properties (placeholders + updated non-placeholders)
            activities: updatedActivities,
            // Add other data types (flights, cars) here if they also need to be updated by location
        }));

        // Clear editing states
        setEditingItineraryLeg(null);
        setOriginalEditingLegLocation('');
        setOriginalEditingLegCheckIn('');
        setOriginalEditingLegCheckOut('');
        setShowItineraryModal(false); // Close modal
        setMessage('Itinerary updated. Remember to click "Save All Client Changes" to persist.');
        await handleSaveClientData(); // Auto-save after updating
    } catch (err) {
        console.error("Error updating itinerary leg:", err);
        setError("Error updating itinerary leg: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  // Function to prepare for deletion (show confirmation modal)
  const confirmDeleteItineraryLeg = (leg) => {
    setItineraryToDelete(leg);
    setShowConfirmDeleteModal(true);
  };

  // Handles deleting an itinerary leg and its associated data
  const handleDeleteItineraryLeg = async () => {
    if (!itineraryToDelete || !selectedClient || !clientData) return;

    setLoading(true);
    setMessage('');
    setError(null);

    try {
        const legIdToDelete = itineraryToDelete.id;
        const legLocationToDelete = itineraryToDelete.location.trim();

        // Filter out the placeholder property
        const updatedProperties = clientData.properties.filter(prop => prop.id !== legIdToDelete);

        // Filter out properties and activities associated with this location
        const finalProperties = updatedProperties.filter(prop => prop.location?.trim() !== legLocationToDelete);
        const finalActivities = clientData.activities.filter(act => act.location?.trim() !== legLocationToDelete);

        setClientData(prevData => ({
            ...prevData,
            properties: finalProperties,
            activities: finalActivities,
            // Add other data types (flights, cars) here if they also need to be filtered by location
        }));

        setShowConfirmDeleteModal(false); // Close confirmation modal
        setShowItineraryListModal(false); // Close itinerary list modal if open
        setItineraryToDelete(null); // Clear item to delete
        setMessage('Itinerary leg and associated data deleted successfully! Remember to click "Save All Client Changes" to persist.');
        await handleSaveClientData(); // Auto-save after deleting
    } catch (err) {
        console.error("Error deleting itinerary leg:", err);
        setError("Error deleting itinerary leg: " + err.message);
    } finally {
        setLoading(false);
    }
  };


  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!session) {
        setError("You must be logged in to add a client.");
        return;
    }
    if (!newClientName.trim()) {
        setError("Client name cannot be empty.");
        return;
    }
    setLoading(true);
    setMessage('');
    setError(null);

    const newClientId = uuidv4();
    const initialClientData = {
        properties: [],
        activities: [],
        flights: [],
        cars: [],
    };

    const { error: insertError } = await supabase
      .from('clients')
      .insert([
        {
            id: newClientId,
            client_name: newClientName,
            client_properties: initialClientData,
            user_id: session.user.id,
            last_updated: new Date().toISOString(),
        },
      ])
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
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('client_name, custom_logo_url')
        .eq('id', GLOBAL_SETTINGS_ID)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      } else if (data) {
        setCompanyName(data.client_name || 'Veeha Travels');
        setGlobalLogoUrl(data.custom_logo_url || null);
      }
    } catch (err) {
      console.error("Unexpected error fetching global settings:", err.message);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }
      setClients(data || []);

    } catch (err) {
      console.error("Error fetching clients:", err.message);
      setError("Failed to load clients: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    let channel;
    try {
      channel = supabase
        .channel('public:clients')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
          fetchClients();
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('Realtime channel error - operating without realtime updates');
          }
        });
    } catch (error) {
      console.warn('Realtime connection failed - operating without realtime updates:', error);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn('Error removing realtime channel:', error);
        }
      }
    };
  }, [session, fetchClients]);

  useEffect(() => {
    if (session) {
      fetchClients();
      fetchGlobalSettings();
    } else {
      setClients([]);
      setSelectedClient(null);
      setClientData(null);
      setGlobalLogoUrl(null);
      setCompanyName('Veeha Travels');
    }
  }, [session, fetchClients, fetchGlobalSettings]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      setMessage('Logged in successfully!');
    } catch (err) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) console.error('Error logging out:', signOutError.message);
    setSession(null);
    setSelectedClient(null);
    setClientData(null);
    setLoading(false);
  };

  const handleDeleteClient = async (clientId) => {
    // IMPORTANT: Replaced window.confirm with a console log as per instructions
    console.log('Confirm deletion of client with ID:', clientId);
    setLoading(true);
    setMessage('');
    setError(null);

    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

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
  };

  const handleOpenEditClientModal = useCallback(() => {
    if (selectedClient) {
      setEditingClientName(selectedClient.client_name);
      setShowEditClientModal(true);
    }
  }, [selectedClient]);

  const handleUpdateClientDetails = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;

    setLoading(true);
    setMessage('');
    setError(null);

    try {
        const { error: updateClientError } = await supabase
            .from('clients')
            .update({ client_name: editingClientName, last_updated: new Date().toISOString() })
            .eq('id', selectedClient.id);

        if (updateClientError) throw updateClientError;

        setMessage('Client details updated successfully!');
        setShowEditClientModal(false);
        fetchClients();

    } catch (err) {
        console.error('Error updating client details:', err.message);
        setError('Error updating client details: ' + err.message);
    } finally {
        setLoading(false);
    }
  };
  
  const handleGenerateShareLink = async () => {
    if (!selectedClient) return;
    setLoading(true);
    setError(null);
    try {
        const { data: token, error: rpcError } = await supabase.rpc('generate_client_share_token', {
            p_client_id: selectedClient.id
        });

        if (rpcError) throw rpcError;

        const shareLink = `${window.location.origin}/client/${selectedClient.id}?token=${token}`;
        // document.execCommand('copy') is used for clipboard operations in iframes
        const el = document.createElement('textarea');
        el.value = shareLink;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);

        setMessage('Share link copied to clipboard!');

    } catch (err) {
        console.error('Error generating share link:', err.message);
        setError(`Could not generate share link: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleUpdateGlobalSettings = async (newCompanyName, newLogoFileFromInput = null) => {
    setLoading(true);
    setError(null);
    setMessage('');

    let logoData = globalLogoUrl;

    try {
      if (newLogoFileFromInput) {
        logoData = await fileToBase64(newLogoFileFromInput);
      } else if (newLogoFileFromInput === null && globalLogoUrl) {
          logoData = null;
      }

      const { error: upsertError } = await supabase
        .from('clients')
        .upsert(
          {
            id: GLOBAL_SETTINGS_ID,
            client_name: newCompanyName,
            custom_logo_url: logoData,
            client_properties: {}, // Assuming global settings don't have client_properties
            user_id: session.user.id,
            last_updated: new Date().toISOString()
          },
          { onConflict: 'id' }
        );

      if (upsertError) {
        throw upsertError;
      }
      setCompanyName(newCompanyName);
      setGlobalLogoUrl(logoData);
      setNewGlobalLogoFile(null);
      setMessage('Global settings updated successfully!');
      setShowSettingsModal(false);
    } catch (err) {
      console.error("Error updating global settings:", err.message);
      setError("Failed to update global settings: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4 font-['Century_Gothic'] text-white`}>
        <div className={`bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-700`}>
          <h2 className="text-4xl font-extrabold text-white text-center mb-8">Veeha Travels Admin</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className={`block text-gray-400 text-sm font-bold mb-2`}>Email:</label>
              <input type="email" id="email" className={`shadow appearance-none border border-gray-600 rounded w-full py-3 px-4 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-[${accentColor}] bg-gray-700 placeholder-gray-500`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" required />
            </div>
            <div>
              <label htmlFor="password" className={`block text-gray-400 text-sm font-bold mb-2`}>Password:</label>
              <input type="password" id="password" className={`shadow appearance-none border border-gray-600 rounded w-full py-3 px-4 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-[${accentColor}] bg-gray-700 placeholder-gray-500`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" required />
            </div>
            <button type="submit" className={`w-full bg-[${buttonPrimary}] hover:bg-yellow-600 text-[${buttonTextPrimary}] font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out transform hover:scale-105`} disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          {error && <p className="mt-6 text-center text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen bg-[${primaryBgColor}] font-['Century_Gothic']`}>
      {/* Loading Overlay */}
      {loading && ( <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"> <div className="bg-white p-4 rounded-lg shadow-xl flex items-center"> <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> Saving changes... </div> </div> )}
      
      {/* Itinerary Add/Edit Modal (for single itinerary leg) */}
      {showItineraryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className={`bg-[${secondaryBgColor}] rounded-lg shadow-xl p-6 w-full max-w-md relative text-[${primaryTextColor}]`}>
            <button onClick={() => { setShowItineraryModal(false); setEditingItineraryLeg(null); setNewItinerary({ location: '', checkIn: '', checkOut: '' }); }} className={`absolute top-3 right-3 text-[${secondaryTextColor}] hover:text-[${primaryTextColor}]`} aria-label="Close modal">
              <X size={24} />
            </button>
            <h2 className={`text-2xl font-bold text-[${accentColor}] mb-6`}>{editingItineraryLeg ? 'Edit Itinerary Leg' : 'Add New Itinerary Leg'}</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="itineraryLocation" className={`block text-sm font-medium text-[${primaryTextColor}]`}>Location</label>
                <input type="text" id="itineraryLocation" value={editingItineraryLeg ? editingItineraryLeg.location : newItinerary.location} onChange={(e) => {
                  if (editingItineraryLeg) {
                    setEditingItineraryLeg(prev => ({ ...prev, location: e.target.value }));
                  } else {
                    setNewItinerary(prev => ({ ...prev, location: e.target.value }));
                  }
                }} className={`mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-[${primaryTextColor}] focus:ring-[${accentColor}] focus:border-[${accentColor}]`} placeholder="e.g., Queenstown" required />
              </div>
              <div>
                <label htmlFor="itineraryCheckIn" className={`block text-sm font-medium text-[${primaryTextColor}]`}>Check-in Date</label>
                <input type="date" id="itineraryCheckIn" value={editingItineraryLeg ? editingItineraryLeg.checkIn : newItinerary.checkIn} onChange={(e) => {
                  if (editingItineraryLeg) {
                    setEditingItineraryLeg(prev => ({ ...prev, checkIn: e.target.value, checkOut: e.target.value > prev.checkOut ? '' : prev.checkOut }));
                  } else {
                    setNewItinerary(prev => ({ ...prev, checkIn: e.target.value, checkOut: '' }));
                  }
                }} className={`mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-[${primaryTextColor}] focus:ring-[${accentColor}] focus:border-[${accentColor}]`} required />
              </div>
              <div>
                <label htmlFor="itineraryCheckOut" className={`block text-sm font-medium text-[${primaryTextColor}]`}>Check-out Date</label>
                <input type="date" id="itineraryCheckOut" value={editingItineraryLeg ? editingItineraryLeg.checkOut : newItinerary.checkOut} min={editingItineraryLeg ? editingItineraryLeg.checkIn : newItinerary.checkIn} onChange={(e) => {
                  if (editingItineraryLeg) {
                    setEditingItineraryLeg(prev => ({ ...prev, checkOut: e.target.value }));
                  } else {
                    setNewItinerary(prev => ({ ...prev, checkOut: e.target.value }));
                  }
                }} className={`mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-[${primaryTextColor}] focus:ring-[${accentColor}] focus:border-[${accentColor}]`} required disabled={!(editingItineraryLeg ? editingItineraryLeg.checkIn : newItinerary.checkIn)} />
              </div>
              <button onClick={editingItineraryLeg ? handleUpdateEditedItinerary : handleSaveItinerary} className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200`} disabled={loading}>
                {loading ? 'Saving...' : (editingItineraryLeg ? 'Update Itinerary' : 'Save Itinerary')}
              </button>
            </div>
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
          </div>
        </div>
      )}

      {/* Itinerary List Modal (for selecting itinerary to edit/delete) */}
      {showItineraryListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className={`bg-[${secondaryBgColor}] rounded-lg shadow-xl p-6 w-full max-w-md relative text-[${primaryTextColor}]`}>
            <button onClick={() => setShowItineraryListModal(false)} className={`absolute top-3 right-3 text-[${secondaryTextColor}] hover:text-[${primaryTextColor}]`} aria-label="Close modal">
              <X size={24} />
            </button>
            <h2 className={`text-2xl font-bold text-[${accentColor}] mb-6`}>Select Itinerary Leg to Edit/Delete</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
              {clientData?.properties?.filter(p => p.isPlaceholder).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn)).length > 0 ? (
                clientData.properties.filter(p => p.isPlaceholder).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn)).map(leg => (
                  <div key={leg.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-md shadow-sm border border-gray-200">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{leg.location}</p>
                      <p className="text-sm text-gray-600 flex items-center">
                        <Calendar size={14} className="mr-1"/> {formatDateForDisplay(leg.checkIn)} - {formatDateForDisplay(leg.checkOut)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleEditItineraryLeg(leg)} className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors" title="Edit Itinerary Leg">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => confirmDeleteItineraryLeg(leg)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors" title="Delete Itinerary Leg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">No itinerary legs added yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      {showConfirmDeleteModal && itineraryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className={`bg-[${secondaryBgColor}] rounded-lg shadow-xl p-6 w-full max-w-md relative text-[${primaryTextColor}] text-center`}>
            <h2 className={`text-2xl font-bold text-red-600 mb-4`}>Confirm Deletion</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete the itinerary leg for "
              <span className="font-semibold">{itineraryToDelete.location}</span>" from "
              <span className="font-semibold">{formatDateForDisplay(itineraryToDelete.checkIn)}</span>" to "
              <span className="font-semibold">{formatDateForDisplay(itineraryToDelete.checkOut)}</span>"?
            </p>
            <p className="text-sm text-gray-600 mb-6">
              This will also delete any associated properties, activities, flights, and car rentals for this location. This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => { setShowConfirmDeleteModal(false); setItineraryToDelete(null); }}
                className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteItineraryLeg} // This now triggers the actual deletion
                className="px-6 py-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Settings Modal */}
      {showSettingsModal && ( <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"> <div className={`bg-[${secondaryBgColor}] rounded-lg shadow-xl p-6 w-full max-w-md relative text-[${primaryTextColor}]`}> <button onClick={() => setShowSettingsModal(false)} className={`absolute top-3 right-3 text-[${secondaryTextColor}] hover:text-[${primaryTextColor}]`} aria-label="Close settings"> <X size={24} /> </button> <h2 className={`text-2xl font-bold text-[${accentColor}] mb-6`}>Global Settings</h2> <div className="space-y-4"> <div> <label htmlFor="companyNameInput" className={`block text-sm font-medium text-[${primaryTextColor}] mb-1`}>Company Name</label> <input type="text" id="companyNameInput" value={companyName || ''} onChange={(e) => setCompanyName(e.target.value)} className={`w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-[${primaryTextColor}] focus:ring-[${accentColor}] focus:border-[${accentColor}]`} /> </div> <div> <label htmlFor="globalLogoFileUpload" className={`block text-sm font-medium text-[${primaryTextColor}] mb-1`}>Company Logo (Upload File)</label> <input type="file" id="globalLogoFileUpload" accept="image/*" onChange={(e) => setNewGlobalLogoFile(e.target.files[0])} className={`mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100`} /> {newGlobalLogoFile && <p className={`text-xs text-[${secondaryTextColor}] mt-1`}>Selected new file: {newGlobalLogoFile.name}</p>} {globalLogoUrl && !newGlobalLogoFile && ( <div className={`mt-2 text-sm text-[${secondaryTextColor}] flex items-center`}> <img src={globalLogoUrl} alt="Current Global Logo" className="h-8 w-auto ml-2 rounded-md" /> <button type="button" onClick={() => { setGlobalLogoUrl(null); setNewGlobalLogoFile(null); }} className="ml-2 text-red-600 hover:text-red-700 text-xs"> Clear current </button> </div> )} {!globalLogoUrl && !newGlobalLogoFile && ( <p className={`mt-2 text-sm text-[${secondaryTextColor}]`}>No global logo currently set.</p> )} </div> <button onClick={() => handleUpdateGlobalSettings(companyName, newGlobalLogoFile)} className={`w-full bg-[${buttonPrimary}] hover:bg-yellow-600 text-[${buttonTextPrimary}] font-bold py-2 px-4 rounded-md transition duration-200`} disabled={loading}> {loading ? 'Saving...' : 'Save Settings'} </button> </div> {error && <p className="text-red-600 text-sm mt-4">{error}</p>} {message && <p className="text-green-600 text-sm mt-4">{message}</p>} </div> </div> )}
      
      {/* Edit Client Details Modal */}
      {showEditClientModal && selectedClient && ( <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"> <div className={`bg-[${secondaryBgColor}] rounded-lg shadow-xl p-6 w-full max-w-md relative text-[${primaryTextColor}]`}> <button onClick={() => setShowEditClientModal(false)} className={`absolute top-3 right-3 text-[${secondaryTextColor}] hover:text-[${primaryTextColor}]`} aria-label="Close modal"> <X size={24} /> </button> <h2 className={`text-2xl font-bold text-[${accentColor}] mb-6`}>Edit Client: {selectedClient.client_name}</h2> <form onSubmit={handleUpdateClientDetails} className="space-y-4"> <div> <label htmlFor="editingClientName" className={`block text-sm font-medium text-[${primaryTextColor}]`}>Client Name</label> <input type="text" id="editingClientName" value={editingClientName} onChange={(e) => setEditingClientName(e.target.value)} className={`mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-[${primaryTextColor}] focus:ring-[${accentColor}] focus:border-[${accentColor}]`} required /> </div> <button type="submit" className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200`} disabled={loading}> {loading ? 'Updating...' : 'Update Name'} </button> </form> <div className="mt-6 border-t pt-4"> <button onClick={handleGenerateShareLink} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 flex items-center justify-center" disabled={loading}> <Share2 size={16} className="mr-2"/> {loading ? 'Generating...' : 'Generate & Copy Share Link'} </button> </div> {error && <p className="text-red-600 text-sm mt-4">{error}</p>} {message && <p className="text-green-600 text-sm mt-4">{message}</p>} </div> </div> )}

      <div className={`w-full flex flex-col sm:flex-row justify-between items-center py-4 px-8 mb-8 rounded-xl shadow-lg bg-[${headerBg}] text-white`}>
        <div className="flex items-center mb-4 sm:mb-0">
          {globalLogoUrl ? ( <img src={globalLogoUrl} alt="Company Logo" className="h-12 w-auto object-contain rounded-lg mr-4" /> ) : ( <div className="h-12 w-12 rounded-lg bg-gray-700 flex items-center justify-center text-gray-400 text-xs mr-4">Logo</div> )}
          <h1 className={`text-3xl font-extrabold text-[${accentColor}]`}>{companyName}</h1>
        </div>
        <nav className="flex space-x-6">
          <button onClick={() => setActiveTab('clients')} className={`text-lg font-semibold px-4 py-2 rounded-lg transition-colors duration-200 ${activeTab === 'clients' ? `bg-[${accentColor}] text-[${buttonTextPrimary}] shadow-md` : 'text-gray-300 hover:text-white'}`}> Clients </button>
          <button onClick={() => setShowSettingsModal(true)} className={`text-lg font-semibold px-4 py-2 rounded-lg transition-colors duration-200 ${activeTab === 'settings' ? `bg-[${accentColor}] text-[${buttonTextPrimary}] shadow-md` : 'text-gray-300 hover:text-white'}`}> Settings </button>
        </nav>
        <button onClick={handleLogout} className="flex items-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500" disabled={loading}> <LogOut size={20} className="mr-2" /> {loading ? 'Logging out...' : 'Logout'} </button>
      </div>

      <div className={`flex-grow flex p-4 md:p-8 pt-0`}>
        <div className={`bg-[${sidebarBg}] text-white transition-all duration-300 ease-in-out ${isSidebarMinimized ? 'w-16' : 'w-72'} flex-shrink-0 relative shadow-lg z-10 rounded-xl mr-8`}>
          <div className={`flex items-center justify-between p-4 border-b border-gray-700 ${isSidebarMinimized ? 'justify-center' : ''}`}>
            {!isSidebarMinimized && ( <h2 className={`text-2xl font-bold text-[${accentColor}]`}>Clients</h2> )}
            <button onClick={() => setIsSidebarMinimized(!isSidebarMinimized)} className={`p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-[${accentColor}]`} aria-label={isSidebarMinimized ? "Expand sidebar" : "Minimize sidebar"}> {isSidebarMinimized ? <ChevronRight size={20} /> : <ChevronLeft size={20} />} </button>
          </div>
          <nav className="flex-grow overflow-y-auto custom-scrollbar p-4">
            <button onClick={() => setIsAddingClient(!isAddingClient)} className={`flex items-center w-full bg-[${accentColor}] hover:bg-yellow-600 text-[${buttonTextPrimary}] font-bold py-2 px-4 rounded-lg mb-4 justify-center transition duration-200 ${isSidebarMinimized ? 'p-2 w-12 h-12 rounded-full mx-auto flex-shrink-0' : ''}`} title={isAddingClient ? 'Cancel Add Client' : 'Add New Client'}> <Plus size={20} className={`${isSidebarMinimized ? '' : 'mr-2'}`} /> {!isSidebarMinimized && (isAddingClient ? 'Cancel Add Client' : 'Add New Client')} </button>
            {isAddingClient && !isSidebarMinimized && ( <form onSubmit={handleAddClient} className={`space-y-4 mb-6 p-4 border border-gray-700 rounded-lg bg-[${headerBg}] text-[${secondaryTextColor}]`}> <h3 className={`text-xl font-semibold text-[${accentColor}]`}>New Client Details</h3> <div> <label htmlFor="newClientName" className="block text-sm font-bold mb-2">Client Name:</label> <input type="text" id="newClientName" className={`shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-[${accentColor}]`} value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Enter client name" required /> </div> <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200" disabled={loading}> Create Client </button> </form> )}
            <ul className="py-2 space-y-2">
              {clients.length === 0 ? ( <li className={`text-gray-400 text-center py-4 ${isSidebarMinimized ? 'hidden' : ''}`}>No clients added yet.</li> ) : ( clients.map((client) => ( <li key={client.id} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition duration-200 ease-in-out ${selectedClient && selectedClient.id === client.id ? `bg-gray-700 border-[${accentColor}] shadow-lg` : 'bg-gray-800 hover:bg-gray-700 border-gray-700'} ${isSidebarMinimized ? 'justify-center p-2' : ''}`} onClick={() => handleSelectClient(client)}> {!isSidebarMinimized ? ( <> <div className="flex-1 min-w-0 pr-2"> <p className="font-semibold text-gray-100 truncate">{client.client_name}</p> <p className="text-sm text-gray-400 truncate">ID: {client.id.substring(0, 8)}...</p> </div> <div className="flex space-x-2 flex-shrink-0"> <Link to={`/client/${client.id}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors" title="View Client Page" onClick={(e) => e.stopPropagation()}> <ExternalLink size={16} /> </Link> <button onClick={(e) => { e.stopPropagation(); handleOpenEditClientModal(); }} className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors" title="Edit Client Details"> <Edit size={16} /> </button> <button onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors" title="Delete Client"> <Trash2 size={16} /> </button> </div> </> ) : ( <div className="text-center"> {globalLogoUrl ? ( <img src={globalLogoUrl} alt="Global Logo" className="h-8 w-8 object-contain mx-auto mb-1" title={client.client_name}/> ) : ( <Eye size={20} className="text-gray-300 mx-auto mb-1" title={client.client_name} /> )} <p className="text-xs text-gray-300 leading-none">{client.client_name.split(' ')[0]}</p> </div> )} </li> )) )}
            </ul>
          </nav>
        </div>
        
        <div className={`flex-grow bg-[${secondaryBgColor}] rounded-xl shadow-lg p-6 border border-gray-200`}>
          {activeTab === 'clients' && (
            selectedClient ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b pb-4">
                  <h2 className={`text-2xl font-bold text-[${primaryTextColor}] mb-3 sm:mb-0`}>
                    Editing: "{selectedClient.client_name}"
                  </h2>
                  {/* Buttons for Add and Edit Itinerary */}
                  <div className="flex space-x-2">
                    <button onClick={() => { setShowItineraryModal(true); setNewItinerary({ location: '', checkIn: '', checkOut: '' }); setEditingItineraryLeg(null); }} className={`flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out`}>
                          <MapPin size={20} className="mr-2" />
                          Add Itinerary Leg
                      </button>
                      <button onClick={() => { 
                          // Open the list modal regardless of whether itineraries exist initially
                          setShowItineraryListModal(true); 
                      }} className={`flex items-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out`}>
                          <Edit size={20} className="mr-2" />
                          Edit Itinerary
                      </button>
                  </div>
                </div>

                {/* REMOVED: Itinerary Legs List (displayed directly on dashboard) */}
                {/* This block is now handled by the showItineraryListModal */}
                
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveClientTab('summary')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeClientTab === 'summary' ? `border-yellow-500 text-yellow-600` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <ClipboardList size={16} className="mr-2" /> Summary
                        </button>
                        <button onClick={() => setActiveClientTab('property')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeClientTab === 'property' ? `border-yellow-500 text-yellow-600` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <Building size={16} className="mr-2" /> Property
                        </button>
                        <button onClick={() => setActiveClientTab('activities')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeClientTab === 'activities' ? `border-yellow-500 text-yellow-600` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <Activity size={16} className="mr-2" /> Activities
                        </button>
                        <button onClick={() => setActiveClientTab('flights')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeClientTab === 'flights' ? `border-yellow-500 text-yellow-600` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <Plane size={16} className="mr-2" /> Flights
                        </button>
                        <button onClick={() => setActiveClientTab('car')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeClientTab === 'car' ? `border-yellow-500 text-yellow-600` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <Car size={16} className="mr-2" /> Car
                        </button>
                    </nav>
                </div>

                <div>
                    {activeClientTab === 'summary' && <PlaceholderContent title="Selection Summary" />}
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
                            itineraryLegs={clientData.properties} // Pass itinerary structure
                        />
                    )}
                    {activeClientTab === 'flights' && <PlaceholderContent title="Flights" />}
                    {activeClientTab === 'car' && <PlaceholderContent title="Car Rentals" />}
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={handleSaveClientData}
                    disabled={loading}
                    className={`px-6 py-3 bg-[${buttonPrimary}] text-[${buttonTextPrimary}] rounded-lg shadow-md hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading ? 'Saving...' : 'Save All Client Changes'}
                  </button>
                </div>
              </>
            ) : (
              <div className={`text-center py-20 text-[${secondaryTextColor}]`}>
                <Eye size={48} className={`mx-auto mb-4 text-${secondaryTextColor}`} />
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
