// src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient.js'; // Import Supabase client
import PropertyForm from '../components/PropertyForm.jsx'; // Make sure this path is correct
import { Link } from 'react-router-dom';
import { LogOut, Plus, Edit, Trash2, Eye, ExternalLink } from 'lucide-react';

const AdminDashboard = () => {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientLogo, setNewClientLogo] = useState(null);
  const [currentCustomLogoUrl, setCurrentCustomLogoUrl] = useState(null);

  // State for properties of the selected client, passed to PropertyForm
  const [currentClientProperties, setCurrentClientProperties] = useState([]);

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

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error.message);
      setMessage('Error fetching clients: ' + error.message);
    } else {
      setClients(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session) {
      fetchClients();
    } else {
      setClients([]);
      setSelectedClient(null);
      setCurrentClientProperties([]);
    }
  }, [session, fetchClients]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setMessage('Logged in successfully!');
    } catch (error) {
      setMessage(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error.message);
    setSession(null);
    setSelectedClient(null);
    setCurrentClientProperties([]);
    setLoading(false);
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    let logoUrl = null;
    if (newClientLogo) {
      const { data, error: uploadError } = await supabase.storage
        .from('client-logos')
        .upload(`${Date.now()}-${newClientLogo.name}`, newClientLogo, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading logo:', uploadError.message);
        setMessage('Error uploading logo: ' + uploadError.message);
        setLoading(false);
        return;
      }
      logoUrl = `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/client-logos/${data.path}`;
    }

    const { data, error } = await supabase
      .from('clients')
      .insert([
        { client_name: newClientName, custom_logo_url: logoUrl, client_properties: [] },
      ])
      .select();

    if (error) {
      console.error('Error adding client:', error.message);
      setMessage('Error adding client: ' + error.message);
    } else {
      setClients([...clients, data[0]]);
      setMessage('Client added successfully!');
      setNewClientName('');
      setNewClientLogo(null);
      setIsAddingClient(false);
    }
    setLoading(false);
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Are you sure you want to delete this client and all their property selections?')) {
      setLoading(true);
      setMessage('');
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        console.error('Error deleting client:', error.message);
        setMessage('Error deleting client: ' + error.message);
      } else {
        setClients(clients.filter(client => client.id !== clientId));
        if (selectedClient && selectedClient.id === clientId) {
          setSelectedClient(null);
          setCurrentClientProperties([]);
          setCurrentCustomLogoUrl(null);
        }
        setMessage('Client deleted successfully!');
      }
      setLoading(false);
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    // Ensure client_properties is an array, parse if string
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
    setCurrentCustomLogoUrl(client.custom_logo_url);
    setMessage(`Editing properties for ${client.client_name}`);
  };

  // This function will be passed to PropertyForm to save changes
  // It now expects the updated properties array and potentially an updated logo URL
  const handleSaveProperties = async (updatedProperties, updatedLogoUrl) => {
    if (!selectedClient) {
      setMessage('No client selected to save properties.');
      return;
    }
    setLoading(true);
    setMessage('');

    // Convert updatedProperties to JSON string for Supabase
    const propertiesJson = JSON.stringify(updatedProperties);

    const { data, error } = await supabase
      .from('clients')
      .update({ client_properties: propertiesJson, custom_logo_url: updatedLogoUrl })
      .eq('id', selectedClient.id)
      .select(); // Select the updated row to get the latest data

    if (error) {
      console.error('Error saving properties:', error.message);
      setMessage('Error saving properties: ' + error.message);
    } else {
      // Update the clients state to reflect the saved changes
      setClients(clients.map(client =>
        client.id === selectedClient.id
          ? { ...client, client_properties: propertiesJson, custom_logo_url: updatedLogoUrl }
          : client
      ));
      // Update selectedClient and currentCustomLogoUrl to reflect the latest saved state
      setSelectedClient(prev => ({ ...prev, client_properties: propertiesJson, custom_logo_url: updatedLogoUrl }));
      setCurrentClientProperties(updatedProperties); // Keep as array in state
      setCurrentCustomLogoUrl(updatedLogoUrl);
      setMessage('Properties saved successfully!');
    }
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-century-gothic text-xl">Loading...</div>;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4 font-century-gothic">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
          <h2 className="text-4xl font-extrabold text-white text-center mb-8">Veeha Travels Admin</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-gray-300 text-sm font-bold mb-2">Email:</label>
              <input
                type="email"
                id="email"
                className="shadow appearance-none border border-gray-600 rounded w-full py-3 px-4 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-700 placeholder-gray-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-gray-300 text-sm font-bold mb-2">Password:</label>
              <input
                type="password"
                id="password"
                className="shadow appearance-none border border-gray-600 rounded w-full py-3 px-4 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-700 placeholder-gray-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out transform hover:scale-105"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          {message && <p className="mt-6 text-center text-red-400 text-sm">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-['Century_Gothic'] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white rounded-xl shadow-md p-4">
          <div className="text-left mb-4 md:mb-0">
            <h1 className="text-3xl font-extrabold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-700">Manage Clients and their Property Selections</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600"
            disabled={loading}
          >
            <LogOut size={20} className="mr-2" /> {loading ? 'Logging out...' : 'Logout'}
          </button>
        </div>

        {message && <p className="mb-4 text-center text-sm text-blue-600">{message}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Client Management Panel */}
          <div className="md:col-span-1 bg-white rounded-xl shadow-lg p-6 h-fit sticky top-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Clients</h2>
            <button
              onClick={() => setIsAddingClient(!isAddingClient)}
              className="flex items-center w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 px-4 rounded-lg mb-4 justify-center transition duration-200"
            >
              <Plus size={20} className="mr-2" /> {isAddingClient ? 'Cancel Add Client' : 'Add New Client'}
            </button>

            {isAddingClient && (
              <form onSubmit={handleAddClient} className="space-y-4 mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="text-xl font-semibold text-gray-800">New Client Details</h3>
                <div>
                  <label htmlFor="newClientName" className="block text-gray-700 text-sm font-bold mb-2">Client Name:</label>
                  <input
                    type="text"
                    id="newClientName"
                    className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Enter client name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="newClientLogo" className="block text-gray-700 text-sm font-bold mb-2">Custom Logo (Optional):</label>
                  <input
                    type="file"
                    id="newClientLogo"
                    accept="image/*"
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
                    onChange={(e) => setNewClientLogo(e.target.files[0])}
                  />
                  {newClientLogo && <p className="text-xs text-gray-500 mt-1">Selected: {newClientLogo.name}</p>}
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                  disabled={loading}
                >
                  Create Client
                </button>
              </form>
            )}

            <ul className="space-y-3">
              {clients.length === 0 ? (
                <li className="text-gray-500 text-center py-4">No clients added yet.</li>
              ) : (
                clients.map((client) => (
                  <li
                    key={client.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition duration-200 ease-in-out
                      ${selectedClient && selectedClient.id === client.id ? 'bg-yellow-100 border-yellow-500 shadow-md' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'}`}
                    onClick={() => handleSelectClient(client)}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-semibold text-gray-800 truncate">{client.client_name}</p>
                      <p className="text-sm text-gray-500 truncate">ID: {client.id.substring(0, 8)}...</p>
                    </div>
                    <div className="flex space-x-2 flex-shrink-0">
                      <Link
                        to={`/client/${client.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                        title="View Client Page"
                        onClick={(e) => e.stopPropagation()} // Prevent selecting client when clicking link
                      >
                        <ExternalLink size={16} />
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                        className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                        title="Delete Client"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Property Management Panel */}
          <div className="md:col-span-2 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            {selectedClient ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Properties for "{selectedClient.client_name}"
                  </h2>
                </div>
                <PropertyForm
                  properties={currentClientProperties}
                  setProperties={setCurrentClientProperties}
                  customLogoUrl={currentCustomLogoUrl}
                  setCustomLogoUrl={setCurrentCustomLogoUrl} // Pass setter for logo to PropertyForm
                  onSave={handleSaveProperties} // Pass the save handler
                  adminMode={true} // Enable admin features in PropertyForm
                />
              </>
            ) : (
              <div className="text-center py-20 text-gray-500">
                <Eye size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-xl">Select a client from the left panel to manage their properties.</p>
                <p className="text-md mt-2">Or add a new client if none exist.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;