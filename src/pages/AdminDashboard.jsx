// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js'; // Import Supabase client
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

import PropertyForm from '../components/PropertyForm.jsx'; // Import the refactored form

import {
  User, Lock, Plus, Trash2, Edit3, Share2, ClipboardCopy, LogOut // Lucide icons
} from 'lucide-react';


const AdminDashboard = () => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [clients, setClients] = useState([]); // List of all client selections
  const [editingClient, setEditingClient] = useState(null); // The client currently being edited
  const [customLogoUrl, setCustomLogoUrl] = useState(null); // Logo for the current client selection being edited/created

  const accentColor = '#FFD700'; // Define accent color

  useEffect(() => {
    // Listen for authentication state changes from Supabase
    // Destructure `data` to get `subscription`
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdminLoggedIn(!!session); // True if session exists (user is logged in)
      if (session) {
        fetchClients(); // Fetch clients if logged in
      } else {
        setClients([]); // Clear clients if logged out
      }
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdminLoggedIn(!!session);
      if (session) {
        fetchClients();
      }
    });

    return () => {
      if (authListener) { // Ensure authListener exists before trying to unsubscribe
        authListener.unsubscribe(); // Cleanup subscription on unmount
      }
    };
  }, []);


  // Fetch all client selections from Supabase
  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false }); // Order by creation time

      if (error) {
        console.error("Error fetching clients:", error);
        // Optionally, set an error state
      } else {
        const fetchedClients = (data || []).map(client => {
          let parsedProperties = [];
          if (typeof client.client_properties === 'string') {
            try {
              parsedProperties = JSON.parse(client.client_properties);
              if (!Array.isArray(parsedProperties)) {
                // If parsing results in non-array (e.g., an empty object string "{}"), default to empty array
                parsedProperties = [];
              }
            } catch (parseError) {
              console.error("Error parsing client_properties for client ID", client.id, ":", parseError);
              parsedProperties = []; // Default to empty array on parse error
            }
          } else if (Array.isArray(client.client_properties)) {
            parsedProperties = client.client_properties;
          }
          return {
            ...client,
            client_properties: parsedProperties
          };
        });
        setClients(fetchedClients);
      }
    } catch (error) {
      console.error("Unexpected error fetching clients: ", error);
    }
  };


  const handleLogin = async () => {
    setLoginError(''); // Clear previous errors
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoginError(error.message);
        console.error("Login error:", error);
      } else {
        console.log("Logged in:", data.user);
        // isAdminLoggedIn state updated by onAuthStateChange listener
      }
    } catch (error) {
      console.error("Unexpected login error:", error);
      setLoginError('An unexpected error occurred during login.');
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
      } else {
        // isAdminLoggedIn state updated by onAuthStateChange listener
        setEmail('');
        setPassword('');
      }
    } catch (error) {
      console.error("Unexpected logout error:", error);
    }
  };

  const createNewClientSelection = () => {
    setEditingClient({
      id: null,
      client_name: 'New Client Selection', // Matches Supabase column name
      client_properties: [], // Starts with a blank array for properties
      custom_logo_url: null
    });
    setCustomLogoUrl(null); // Clear custom logo state for the form
  };

  const saveClientSelection = async () => {
    // Ensure editingClient exists and client_properties is an array
    if (!editingClient) {
      alert("No client selection to save or editing client is null.");
      return;
    }
    const propertiesToSave = Array.isArray(editingClient.client_properties) ? editingClient.client_properties : [];

    try {
      const clientDataToSave = {
        client_name: editingClient.client_name || 'Unnamed Client',
        // IMPORTANT FIX: Stringify client_properties before saving to JSONB column
        client_properties: JSON.stringify(propertiesToSave),
        custom_logo_url: customLogoUrl,
        last_updated: new Date().toISOString() // Supabase timestamp format
      };

      const { data: userAuthData, error: userError } = await supabase.auth.getUser();
      if (userError || !userAuthData?.user?.id) {
          throw new Error("User not authenticated. Cannot save client selection.");
      }
      clientDataToSave.user_id = userAuthData.user.id; // Assign current admin's user_id

      let error = null;
      let data = null;

      if (editingClient.id) { // Existing client, update
        const response = await supabase
          .from('clients')
          .update(clientDataToSave)
          .eq('id', editingClient.id)
          .select(); // Add .select() to get the updated data back
        data = response.data;
        error = response.error;
      } else { // New client, insert
        const response = await supabase
          .from('clients')
          .insert(clientDataToSave)
          .select(); // Add .select() to get the inserted data back
        data = response.data;
        error = response.error;
      }

      if (error) {
        throw error; // Throw error to be caught by the catch block
      }

      alert(`Client selection ${editingClient.id ? 'updated' : 'created'} successfully!`);
      setEditingClient(null); // Exit editing mode
      setCustomLogoUrl(null); // Clear logo after saving
      fetchClients(); // Refresh the list of clients
    } catch (error) {
      console.error("Error saving client selection:", error.message);
      alert("Failed to save client selection: " + error.message + ". Please check Supabase RLS policies and server logs.");
    }
  };

  const editClient = (client) => {
    // IMPORTANT FIX: Ensure client_properties is always an array and parsed when setting editingClient
    let parsedProperties = [];
    if (typeof client.client_properties === 'string') {
      try {
        parsedProperties = JSON.parse(client.client_properties);
        if (!Array.isArray(parsedProperties)) {
          parsedProperties = [];
        }
      } catch (e) {
        console.error("Error parsing client_properties during edit:", e);
        parsedProperties = [];
      }
    } else if (Array.isArray(client.client_properties)) {
      parsedProperties = client.client_properties;
    }

    setEditingClient({
      id: client.id,
      client_name: client.client_name,
      client_properties: parsedProperties,
      custom_logo_url: client.custom_logo_url
    });
    setCustomLogoUrl(client.custom_logo_url || null); // Load client's specific logo into form state
  };

  const deleteClient = async (clientId) => {
    if (!window.confirm("Are you sure you want to delete this client selection?")) {
      return; // User cancelled
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        throw error;
      }

      alert("Client selection deleted successfully!");
      if (editingClient && editingClient.id === clientId) {
        setEditingClient(null); // Clear editing if the deleted client was being edited
      }
      fetchClients(); // Refresh the list
    } catch (error) {
      console.error("Error deleting client:", error.message);
      alert("Failed to delete client: " + error.message + ". Please check Supabase RLS policies and server logs.");
    }
  };

  const copyClientLink = (clientId) => {
    const baseUrl = window.location.origin;
    const clientLink = `${baseUrl}/client/${clientId}`;
    navigator.clipboard.writeText(clientLink).then(() => {
      alert(`Client link copied: ${clientLink}`);
    }).catch(err => {
      console.error('Could not copy text: ', err);
      alert(`Failed to copy link. Please manually copy: ${clientLink}`);
    });
  };


  return (
    <div className="min-h-screen bg-gray-50 font-['Century_Gothic'] p-4 md:p-6 lg:p-8">
      <style>{`
        .font-century-gothic { font-family: 'Century Gothic', sans-serif; }
      `}</style>

      {!isAdminLoggedIn ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md font-century-gothic text-center">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Admin Login</h3>
            <div className="space-y-4">
              <div className="relative">
                <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="Admin Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-base"
                />
              </div>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-base"
                />
              </div>
              {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
              <button
                onClick={handleLogin}
                className="w-full px-5 py-3 rounded-lg text-white font-semibold shadow-md transition-all"
                style={{ backgroundColor: accentColor, color: '#333' }}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Admin Dashboard Header */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 font-century-gothic">Admin Dashboard</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center shadow-sm"
            >
              <LogOut size={18} className="mr-2" /> Logout
            </button>
          </div>

          {/* Client Selection Management */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8 font-century-gothic">
            <h2 className="text-2xl font-bold mb-5 text-gray-800 text-left">Manage Client Selections</h2>
            <button
              onClick={createNewClientSelection}
              className="mb-6 px-6 py-3 rounded-lg text-white font-semibold shadow-md transition-all flex items-center"
              style={{ backgroundColor: accentColor, color: '#333' }}
            >
              <Plus size={20} className="mr-2" /> Create New Client Selection
            </button>

            {editingClient && (
              <div className="mb-8 p-6 border border-gray-200 rounded-xl bg-blue-50">
                <h3 className="text-xl font-bold mb-4 text-blue-800">
                  {editingClient.id ? `Editing Client: ${editingClient.client_name}` : 'New Client Selection'}
                </h3>
                <input
                  type="text"
                  placeholder="Client Name"
                  // Use client_name for the input value as it maps to the Supabase column
                  value={editingClient.client_name || ''} // Ensure default to empty string if null/undefined
                  onChange={(e) => setEditingClient(prev => ({ ...prev, client_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-base mb-4"
                />
                <PropertyForm
                  // IMPORTANT FIX: properties prop is already parsed to array in editClient/fetchClients
                  properties={editingClient.client_properties || []}
                  // Pass setProperties as a callback function
                  // IMPORTANT FIX: Ensure newProps is always an array when updating client_properties
                  setProperties={(newProps) => setEditingClient(prev => ({ ...prev, client_properties: Array.isArray(newProps) ? newProps : [] }))}
                  customLogoUrl={customLogoUrl}
                  setCustomLogoUrl={setCustomLogoUrl}
                  adminMode={true} // Pass adminMode as true for the admin view
                />
                <div className="flex gap-4 mt-6 justify-end">
                  <button
                    onClick={() => setEditingClient(null)}
                    className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveClientSelection}
                    className="px-6 py-2 rounded-lg text-white font-semibold shadow-md transition-all"
                    style={{ backgroundColor: accentColor, color: '#333' }}
                  >
                    Save Client Selection
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clients.length === 0 ? (
                <p className="text-gray-500 col-span-full text-center py-4">No client selections created yet.</p>
              ) : (
                clients.map((client) => (
                  <div key={client.id} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                      {/* Use client.client_name to display */}
                      <h3 className="font-semibold text-lg text-gray-900">{client.client_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">ID: {client.id}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Last Updated: {client.last_updated ? new Date(client.last_updated).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={() => editClient(client)}
                        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm shadow-sm"
                      >
                        <Edit3 size={16} className="mr-2" /> Edit
                      </button>
                      <button
                        onClick={() => copyClientLink(client.id)}
                        className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm shadow-sm"
                      >
                        <Share2 size={16} className="mr-2" /> Share Link
                      </button>
                      <button
                        onClick={() => deleteClient(client.id)}
                        className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm shadow-sm"
                      >
                        <Trash2 size={16} className="mr-2" /> Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
