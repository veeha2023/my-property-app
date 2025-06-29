// src/pages/AdminDashboard.jsx - Version 6.16 (Single Global Logo)
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';
import PropertyForm from '../components/PropertyForm.jsx';
import {
  Link
} from 'react-router-dom';
import {
  LogOut, Plus, Edit, Trash2, Eye, ExternalLink, // Existing functional icons
  ChevronLeft, ChevronRight, Settings, X // Added X for modal close, Chevron icons for sidebar, Settings icon
}
from 'lucide-react';

const AdminDashboard = () => {
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
  // newClientLogo state and related logic for individual client logos are now redundant and removed from usage.
  // Kept here for state declaration consistency but will not be used for individual client logos.
  const [newClientLogo, setNewClientLogo] = useState(null);
  const [currentCustomLogoUrl, setCurrentCustomLogoUrl] = useState(null);
  const [currentClientProperties, setCurrentClientProperties] = useState([]);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [editingClientName, setEditingClientName] = useState('');
  // editingClientLogoFile state and related logic for individual client logos are now redundant and removed from usage.
  const [editingClientLogoFile, setEditingClientLogoFile] = useState(null);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [globalLogoUrl, setGlobalLogoUrl] = useState(null);
  const [newGlobalLogoFile, setNewGlobalLogoFile] = useState(null); // State for global logo file upload
  const [companyName, setCompanyName] = useState('Veeha Travels');
  const [activeTab, setActiveTab] = useState('clients'); // State for managing active tab

  // Define colors consistent with the theme from provided website images
  const accentColor = '#FFD700'; // Vibrant Yellow from the website
  const primaryBgColor = '#F7F7F7'; // Light gray/off-white for main content background, similar to the white sections in the landing pages
  const secondaryBgColor = '#FFFFFF'; // White for cards/panels within the main content
  const sidebarBg = '#1A202C'; // Very dark grey/black for sidebar, similar to the footer in the landing pages
  const headerBg = '#1A202C'; // Very dark grey/black for the top banner/header
  const primaryTextColor = '#2D3748'; // Dark grey for general text on light backgrounds
  const secondaryTextColor = '#718096'; // Medium grey for secondary text
  const buttonPrimary = accentColor;
  const buttonTextPrimary = '#1A202C'; // Dark text for yellow buttons

  // A fixed ID for global settings in 'clients' table to store company-wide data
  // Using a valid UUID string to avoid "invalid input syntax for type uuid" error,
  // as the Supabase 'id' column is expected to be UUID type and not being adjusted.
  const GLOBAL_SETTINGS_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  // Helper function to convert a File object to a Base64 Data URL
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Function to fetch global settings (company name and logo)
  const fetchGlobalSettings = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('client_name, custom_logo_url')
        .eq('id', GLOBAL_SETTINGS_ID)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error fetching global settings:", fetchError.message);
      } else if (data) {
        setCompanyName(data.client_name || 'Veeha Travels');
        // The globalLogoUrl is set directly from the database; it will now store Base64 data.
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
        .select('*') // Select all columns for initial client list display and selectedClient state
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }
      // Filter out the global settings entry from the regular client list
      const regularClients = data.filter(client => client.id !== GLOBAL_SETTINGS_ID);
      setClients(regularClients);

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


  // Supabase Realtime Subscription for client data
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('public:clients')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        (payload) => {
          console.log('Realtime change received!', payload);

          if (payload.eventType === 'INSERT') {
            if (payload.new.id === GLOBAL_SETTINGS_ID) {
              setCompanyName(payload.new.client_name || 'Veeha Travels');
              setGlobalLogoUrl(payload.new.custom_logo_url || null);
            } else {
              setClients((prevClients) => [...prevClients, payload.new]);
            }
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.id === GLOBAL_SETTINGS_ID) {
              setCompanyName(payload.new.client_name || 'Veeha Travels');
              setGlobalLogoUrl(payload.new.custom_logo_url || null);
            } else {
              setClients((prevClients) =>
                prevClients.map((client) =>
                  client.id === payload.new.id ? payload.new : client
                )
              );
              if (selectedClient && selectedClient.id === payload.new.id) {
                let parsedProperties = [];
                if (typeof payload.new.client_properties === 'string') {
                  try {
                    parsedProperties = JSON.parse(payload.new.client_properties);
                  } catch (e) {
                    console.error("Error parsing realtime client_properties:", e);
                    parsedProperties = [];
                  }
                } else if (Array.isArray(payload.new.client_properties)) {
                  parsedProperties = payload.new.client_properties;
                }
                setCurrentClientProperties(parsedProperties);
                // currentCustomLogoUrl is now for display only, not individual client logo management
                setCurrentCustomLogoUrl(payload.new.custom_logo_url);
                setSelectedClient(payload.new);
                setMessage(`Properties for ${payload.new.client_name} updated.`);
              }
            }
          } else if (payload.eventType === 'DELETE') {
            if (payload.old.id === GLOBAL_SETTINGS_ID) {
              setCompanyName('Veeha Travels');
              setGlobalLogoUrl(null);
            } else {
              setClients((prevClients) =>
                prevClients.filter((client) => client.id !== payload.old.id)
              );
              if (selectedClient && selectedClient.id === payload.old.id) {
                setSelectedClient(null);
                setCurrentClientProperties([]);
                setCurrentCustomLogoUrl(null);
                setMessage('Selected client was deleted.');
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, selectedClient]);


  useEffect(() => {
    if (session) {
      fetchClients();
      fetchGlobalSettings();
    } else {
      setClients([]);
      setSelectedClient(null);
      setCurrentClientProperties([]);
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
    setCurrentClientProperties([]);
    setLoading(false);
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError(null);

    // MODIFIED: custom_logo_url is NOT included in client insertion, as clients will use global logo.
    const { error: insertError } = await supabase
      .from('clients')
      .insert([
        { client_name: newClientName, client_properties: [] }, // Removed custom_logo_url from here
      ])
      .select();

    if (insertError) {
      console.error('Error adding client:', insertError.message);
      setError('Error adding client: ' + insertError.message);
    } else {
      setMessage('Client added successfully!');
      setNewClientName('');
      setIsAddingClient(false);
    }
    setLoading(false);
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Are you sure you want to delete this client and all their property selections?')) {
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
      }
      setLoading(false);
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    let parsedProperties = [];
    if (typeof client.client_properties === 'string') {
      try {
        parsedProperties = JSON.parse(client.client_properties);
      } catch (e) {
        console.error("Error parsing client_properties:", e);
        parsedProperties = [];
      }
    } else if (Array.isArray(client.client_properties)) {
      parsedProperties = client.client_properties;
    }
    setCurrentClientProperties(parsedProperties);
    // currentCustomLogoUrl no longer relevant for individual client logo management
    // but can be kept if the database column still exists and we want to preserve old data.
    // For display in the client list, we will use globalLogoUrl.
    setCurrentCustomLogoUrl(client.custom_logo_url);
    setEditingClientName(client.client_name);
    setEditingClientLogoFile(null); // Clear any pending file selection
    setMessage(`Editing properties for ${client.client_name}`);
    setError(null);
  };

  const handleSaveProperties = async (updatedProperties = currentClientProperties) => {
    if (!selectedClient) {
      setMessage('No client selected to save properties.');
      return;
    }
    setLoading(true);
    setMessage('');
    setError(null);

    const propertiesJson = JSON.stringify(updatedProperties);

    const { error: updateError } = await supabase
      .from('clients')
      .update({ client_properties: propertiesJson })
      .eq('id', selectedClient.id);

    if (updateError) {
      console.error('Error saving properties:', updateError.message);
      setError('Error saving properties: ' + updateError.message);
    } else {
      setMessage('Properties saved successfully!');
    }
    setLoading(false);
  };

  const handleOpenEditClientModal = useCallback(() => {
    if (selectedClient) {
      setEditingClientName(selectedClient.client_name);
      // No longer setting currentCustomLogoUrl for individual client logo edit
      setShowEditClientModal(true);
    }
  }, [selectedClient]);

  // MODIFIED: handleUpdateClientDetails no longer updates custom_logo_url
  const handleUpdateClientDetails = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;

    setLoading(true);
    setMessage('');
    setError(null);

    // Removed all logic related to editingClientLogoFile and custom_logo_url upload
    // as individual client logos are no longer managed here.

    const { error: updateError } = await supabase
      .from('clients')
      .update({ client_name: editingClientName }) // Only update client_name
      .eq('id', selectedClient.id)
      .select();

    if (updateError) {
      console.error('Error updating client details:', updateError.message);
      setError('Error updating client details: ' + updateError.message);
    } else {
      setMessage('Client details updated successfully!');
      setShowEditClientModal(false);
      // Removed clearing editingClientLogoFile as it's no longer used
    }
    setLoading(false);
  };

  // handleUpdateGlobalSettings remains the same, storing Base64 logo in database
  const handleUpdateGlobalSettings = async (newCompanyName, newLogoFileFromInput = null) => {
    setLoading(true);
    setError(null);
    setMessage('');

    let logoData = globalLogoUrl; // This will now store Base64 string or null

    try {
      if (newLogoFileFromInput) {
        // Convert file to Base64 Data URL for storage in the database
        logoData = await fileToBase64(newLogoFileFromInput);
      } else if (newLogoFileFromInput === null && globalLogoUrl) {
          // If the user explicitly clears the file input AND there was a logo before, set to null
          logoData = null;
      }

      const { error: upsertError } = await supabase
        .from('clients')
        .upsert(
          {
            id: GLOBAL_SETTINGS_ID,
            client_name: newCompanyName,
            custom_logo_url: logoData, // Store Base64 data directly in this column
            client_properties: [] // client_properties not relevant for global settings row
          },
          { onConflict: 'id' }
        );

      if (upsertError) {
        throw upsertError;
      }
      setCompanyName(newCompanyName);
      setGlobalLogoUrl(logoData); // Update globalLogoUrl state to reflect the Base64 data
      setNewGlobalLogoFile(null); // Clear file input after successful update
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
              <input
                type="email"
                id="email"
                className={`shadow appearance-none border border-gray-600 rounded w-full py-3 px-4 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-[${accentColor}] bg-gray-700 placeholder-gray-500`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className={`block text-gray-400 text-sm font-bold mb-2`}>Password:</label>
              <input
                type="password"
                id="password"
                className={`shadow appearance-none border border-gray-600 rounded w-full py-3 px-4 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-[${accentColor}] bg-gray-700 placeholder-gray-500`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
              />
            </div>
            <button
              type="submit"
              className={`w-full bg-[${buttonPrimary}] hover:bg-yellow-600 text-[${buttonTextPrimary}] font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out transform hover:scale-105`}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          {error && <p className="mt-6 text-center text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    // Changed main container to flex-col to stack header and content vertically
    <div className={`flex flex-col min-h-screen bg-[${primaryBgColor}] font-['Century_Gothic']`}>
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-xl flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving changes...
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className={`bg-[${secondaryBgColor}] rounded-lg shadow-xl p-6 w-full max-w-md relative text-[${primaryTextColor}]`}>
            <button
              onClick={() => setShowSettingsModal(false)}
              className={`absolute top-3 right-3 text-[${secondaryTextColor}] hover:text-[${primaryTextColor}]`}
              aria-label="Close settings"
            >
              <X size={24} />
            </button>
            <h2 className={`text-2xl font-bold text-[${accentColor}] mb-6`}>Global Settings</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="companyNameInput" className={`block text-sm font-medium text-[${primaryTextColor}] mb-1`}>Company Name</label>
                <input
                  type="text"
                  id="companyNameInput"
                  value={companyName || ''}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={`w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-[${primaryTextColor}] focus:ring-[${accentColor}] focus:border-[${accentColor}]`}
                />
              </div>
              <div>
                <label htmlFor="globalLogoFileUpload" className={`block text-sm font-medium text-[${primaryTextColor}] mb-1`}>Company Logo (Upload File)</label>
                <input
                  type="file"
                  id="globalLogoFileUpload"
                  accept="image/*"
                  onChange={(e) => setNewGlobalLogoFile(e.target.files[0])}
                  className={`mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100`}
                />
                {newGlobalLogoFile && <p className={`text-xs text-[${secondaryTextColor}] mt-1`}>Selected new file: {newGlobalLogoFile.name}</p>}
                {globalLogoUrl && !newGlobalLogoFile && ( // Only show current logo if no new file is selected
                  <div className={`mt-2 text-sm text-[${secondaryTextColor}] flex items-center`}>
                    {/* Display the Base64 encoded image directly */}
                    <img src={globalLogoUrl} alt="Current Global Logo" className="h-8 w-auto ml-2 rounded-md" />
                    <button type="button" onClick={() => { setGlobalLogoUrl(null); setNewGlobalLogoFile(null); }} className="ml-2 text-red-600 hover:text-red-700 text-xs">
                      Clear current
                    </button>
                  </div>
                )}
                {!globalLogoUrl && !newGlobalLogoFile && ( // If no logo is set and no new file is selected
                  <p className={`mt-2 text-sm text-[${secondaryTextColor}]`}>No global logo currently set.</p>
                )}
              </div>
              <button
                onClick={() => handleUpdateGlobalSettings(companyName, newGlobalLogoFile)}
                className={`w-full bg-[${buttonPrimary}] hover:bg-yellow-600 text-[${buttonTextPrimary}] font-bold py-2 px-4 rounded-md transition duration-200`}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
            {message && <p className="text-green-600 text-sm mt-4">{message}</p>}
          </div>
        </div>
      )}

      {/* Edit Client Details Modal */}
      {showEditClientModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className={`bg-[${secondaryBgColor}] rounded-lg shadow-xl p-6 w-full max-w-md relative text-[${primaryTextColor}]`}>
            <button
              onClick={() => setShowEditClientModal(false)}
              className={`absolute top-3 right-3 text-[${secondaryTextColor}] hover:text-[${primaryTextColor}]`}
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
            <h2 className={`text-2xl font-bold text-[${accentColor}] mb-6`}>Edit Client: {selectedClient.client_name}</h2>
            <form onSubmit={handleUpdateClientDetails} className="space-y-4">
              <div>
                <label htmlFor="editingClientName" className={`block text-sm font-medium text-[${primaryTextColor}]`}>Client Name</label>
                <input
                  type="text"
                  id="editingClientName"
                  value={editingClientName}
                  onChange={(e) => setEditingClientName(e.target.value)}
                  className={`mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-[${primaryTextColor}] focus:ring-[${accentColor}] focus:border-[${accentColor}]`}
                  required
                />
              </div>
              {/* Removed custom logo upload section for individual client */}
              <button
                type="submit"
                className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200`}
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Details'}
              </button>
            </form>
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
            {message && <p className="text-green-600 text-sm mt-4">{message}</p>}
          </div>
        </div>
      )}

      {/* Top Banner/Header - This is now consistently at the top */}
      <div className={`w-full flex flex-col sm:flex-row justify-between items-center py-4 px-8 mb-8 rounded-xl shadow-lg bg-[${headerBg}] text-white`}>
        <div className="flex items-center mb-4 sm:mb-0">
          {globalLogoUrl ? (
            // The globalLogoUrl now directly contains the Base64 data if uploaded via file, or a URL if retrieved from storage.
            // The <img> tag handles both data: URLs and standard URLs automatically.
            <img src={globalLogoUrl} alt="Company Logo" className="h-12 w-auto object-contain rounded-lg mr-4" />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-gray-700 flex items-center justify-center text-gray-400 text-xs mr-4">Logo</div>
          )}
          <h1 className={`text-3xl font-extrabold text-[${accentColor}]`}>{companyName}</h1>
        </div>
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('clients')}
            className={`text-lg font-semibold px-4 py-2 rounded-lg transition-colors duration-200
                        ${activeTab === 'clients' ? `bg-[${accentColor}] text-[${buttonTextPrimary}] shadow-md` : 'text-gray-300 hover:text-white'}`}
          >
            Clients
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className={`text-lg font-semibold px-4 py-2 rounded-lg transition-colors duration-200
                        ${activeTab === 'settings' ? `bg-[${accentColor}] text-[${buttonTextPrimary}] shadow-md` : 'text-gray-300 hover:text-white'}`}
          >
            Settings
          </button>
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500"
          disabled={loading}
        >
          <LogOut size={20} className="mr-2" /> {loading ? 'Logging out...' : 'Logout'}
        </button>
      </div>


      {/* Main Content Area BELOW the Banner */}
      <div className={`flex-grow flex p-4 md:p-8 pt-0`}>
        {/* Sidebar for Clients */}
        {activeTab === 'clients' && ( // Only show sidebar if clients tab is active
          <div className={`bg-[${sidebarBg}] text-white transition-all duration-300 ease-in-out
                          ${isSidebarMinimized ? 'w-16' : 'w-72'} flex-shrink-0 relative shadow-lg z-10 rounded-xl mr-8`}>
            <div className={`flex items-center justify-between p-4 border-b border-gray-700
                            ${isSidebarMinimized ? 'justify-center' : ''}`}>
              {!isSidebarMinimized && (
                <h2 className={`text-2xl font-bold text-[${accentColor}]`}>Clients</h2>
              )}
              <button
                onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
                className={`p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-[${accentColor}]`}
                aria-label={isSidebarMinimized ? "Expand sidebar" : "Minimize sidebar"}
              >
                {isSidebarMinimized ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
            </div>
            <nav className="flex-grow overflow-y-auto custom-scrollbar p-4">
              <button
                onClick={() => setIsAddingClient(!isAddingClient)}
                className={`flex items-center w-full bg-[${accentColor}] hover:bg-yellow-600 text-[${buttonTextPrimary}] font-bold py-2 px-4 rounded-lg mb-4 justify-center transition duration-200
                            ${isSidebarMinimized ? 'p-2 w-12 h-12 rounded-full mx-auto flex-shrink-0' : ''}`}
                title={isAddingClient ? 'Cancel Add Client' : 'Add New Client'}
              >
                <Plus size={20} className={`${isSidebarMinimized ? '' : 'mr-2'}`} />
                {!isSidebarMinimized && (isAddingClient ? 'Cancel Add Client' : 'Add New Client')}
              </button>

              {isAddingClient && !isSidebarMinimized && (
                <form onSubmit={handleAddClient} className={`space-y-4 mb-6 p-4 border border-gray-700 rounded-lg bg-[${headerBg}] text-[${secondaryTextColor}]`}>
                  <h3 className={`text-xl font-semibold text-[${accentColor}]`}>New Client Details</h3>
                  <div>
                    <label htmlFor="newClientName" className="block text-sm font-bold mb-2">Client Name:</label>
                    <input
                      type="text"
                      id="newClientName"
                      className={`shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-[${accentColor}]`}
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Enter client name"
                      required
                    />
                  </div>
                  {/* Removed custom logo input for Add New Client */}
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                    disabled={loading}
                  >
                    Create Client
                  </button>
                </form>
              )}

              <ul className="py-2 space-y-2">
                {clients.length === 0 ? (
                  <li className={`text-gray-400 text-center py-4 ${isSidebarMinimized ? 'hidden' : ''}`}>No clients added yet.</li>
                ) : (
                  clients.map((client) => (
                    <li
                      key={client.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition duration-200 ease-in-out
                        ${selectedClient && selectedClient.id === client.id ? `bg-gray-700 border-[${accentColor}] shadow-lg` : 'bg-gray-800 hover:bg-gray-700 border-gray-700'}
                        ${isSidebarMinimized ? 'justify-center p-2' : ''}`}
                      onClick={() => handleSelectClient(client)}
                    >
                      {!isSidebarMinimized ? (
                        <>
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="font-semibold text-gray-100 truncate">{client.client_name}</p>
                            <p className="text-sm text-gray-400 truncate">ID: {client.id.substring(0, 8)}...</p>
                          </div>
                          <div className="flex space-x-2 flex-shrink-0">
                            <Link
                              to={`/client/${client.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                              title="View Client Page"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={16} />
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenEditClientModal(); }}
                              className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                              title="Edit Client Details"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                              className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                              title="Delete Client"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center">
                          {/* MODIFIED: Always show global logo in sidebar minimized view */}
                          {globalLogoUrl ? (
                            <img src={globalLogoUrl} alt="Global Logo" className="h-8 w-8 object-contain mx-auto mb-1" title={client.client_name}/>
                          ) : (
                            <Eye size={20} className="text-gray-300 mx-auto mb-1" title={client.client_name} />
                          )}
                          <p className="text-xs text-gray-300 leading-none">{client.client_name.split(' ')[0]}</p>
                        </div>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </nav>
          </div>
        )}

        {/* Main Content Panel - Conditional Rendering based on activeTab */}
        <div className={`flex-grow bg-[${secondaryBgColor}] rounded-xl shadow-lg p-6 border border-gray-200`}>
          {activeTab === 'clients' && (
            selectedClient ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b pb-4">
                  <h2 className={`text-2xl font-bold text-[${primaryTextColor}] mb-3 sm:mb-0`}>
                    Properties for "{selectedClient.client_name}"
                  </h2>
                </div>
                <PropertyForm
                  properties={currentClientProperties}
                  setProperties={setCurrentClientProperties}
                  onSave={handleSaveProperties}
                  adminMode={true}
                />
                {/* Added the button at the bottom */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => handleSaveProperties(currentClientProperties)}
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
                <p className="text-xl">Select a client from the sidebar to manage their properties.</p>
                <p className="text-md mt-2">Or add a new client if none exist.</p>
              </div>
            )
          )}
          {/* Settings content is handled by the modal */}
          {/* This section would be for other tabs if they were full-page content */}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
