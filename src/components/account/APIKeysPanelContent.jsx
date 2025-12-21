// src/components/account/APIKeysPanelContent.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEye, FaEyeSlash, FaTrash } from 'react-icons/fa';
import SecondaryButton from '../common/SecondaryButton.tsx';
import { getHeaders } from '../../utils/web.jsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useUser } from '../../contexts/UserContext.jsx';
const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function APIKeysPanelContent() {
  const { colorMode } = useColorMode();
  const { user } = useUser();

  const textColor = colorMode === 'dark' ? 'text-neutral-100' : 'text-neutral-800';
  const secondaryTextColor = colorMode === 'dark' ? 'text-neutral-400' : 'text-neutral-500';
  const cardBgColor = colorMode === 'dark' ? 'bg-[#0f1629]' : 'bg-white';
  const borderColor = colorMode === 'dark' ? 'border-[#1f2a3d]' : 'border-slate-200';
  const headerBg = colorMode === 'dark' ? 'bg-[#0b1224]' : 'bg-slate-50';

  const [apiKeys, setApiKeys] = useState([]);
  const [showKey, setShowKey] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAPIKeys();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchAPIKeys = async () => {
    setLoading(true);
    try {

      
      const headers = getHeaders();
      const response = await axios.get(`${PROCESSOR_SERVER}/users/api_keys`, headers);
      const apiKeyResponse = response.data.apiKeys || [];
      setApiKeys(apiKeyResponse);
    } catch (error) {
      
      toast.error('Failed to fetch API keys', {
        position: 'bottom-center',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    try {
      const headers = getHeaders();
      const response = await axios.post(`${PROCESSOR_SERVER}/users/api_keys`, {}, headers);
      const newKey = response.data.apiKey;
      setApiKeys((prevKeys) => [...prevKeys, newKey]);
      toast.success('API key created successfully!', {
        position: 'bottom-center',
      });
    } catch (error) {
      
      toast.error('Failed to create API key', {
        position: 'bottom-center',
      });
    }
  };

  const handleDeleteKey = async (keyId) => {
    try {
      const headers = getHeaders();
      await axios.delete(`${PROCESSOR_SERVER}/users/api_keys/${keyId}`, headers);
      setApiKeys((prevKeys) => prevKeys.filter((key) => key._id !== keyId));
      toast.success('API key deleted successfully!', {
        position: 'bottom-center',
      });
    } catch (error) {
      
      toast.error('Failed to delete API key', {
        position: 'bottom-center',
      });
    }
  };

  const toggleShowKey = (keyId) => {
    setShowKey((prevState) => ({
      ...prevState,
      [keyId]: !prevState[keyId],
    }));
  };

  const maskedKey = (key) => {
    const visibleChars = 6;
    if (key.length <= visibleChars * 2) {
      return '*'.repeat(key.length);
    }
    const start = key.slice(0, visibleChars);
    const end = key.slice(-visibleChars);
    const middle = '*'.repeat(key.length - visibleChars * 2);
    return `${start}${middle}${end}`;
  };

  return (
    <div className={`flex flex-col flex-grow gap-4 ${textColor}`}>
      <ToastContainer />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">API Keys</h2>
        <SecondaryButton onClick={handleCreateKey}>Create Key</SecondaryButton>
      </div>
      {loading ? (
        <p className={secondaryTextColor}>Loading...</p>
      ) : apiKeys.length === 0 ? (
        <p className={`text-lg ${secondaryTextColor}`}>No API keys found.</p>
      ) : (
        <div className={`rounded-2xl border ${borderColor} ${cardBgColor} overflow-hidden shadow-sm`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${borderColor} ${headerBg}`}>
            <p className="text-lg font-semibold">Manage your API keys</p>
            <p className={`text-sm ${secondaryTextColor}`}>Store and rotate keys securely.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className={headerBg}>
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Index</th>
                  <th className="px-4 py-3 text-left font-semibold">Key</th>
                  <th className="px-4 py-3 text-left font-semibold">Created At</th>
                  <th className="px-4 py-3 text-left font-semibold">Expires At</th>
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((keyItem, index) => {
                  const rowBg =
                    index % 2 === 0
                      ? colorMode === 'dark'
                        ? 'bg-[#0b1224]'
                        : 'bg-slate-50'
                      : '';
                  return (
                    <tr key={keyItem._id} className={`border-t ${borderColor} ${rowBg}`}>
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>
                            {showKey[keyItem._id]
                              ? keyItem.apiKey
                              : maskedKey(keyItem.apiKey)}
                          </span>
                          <button
                            onClick={() => toggleShowKey(keyItem._id)}
                            className={`rounded-md px-2 py-1 text-xs font-semibold border ${borderColor} ${colorMode === 'dark' ? 'hover:bg-[#0f1629]' : 'hover:bg-slate-100'}`}
                          >
                            {showKey[keyItem._id] ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${secondaryTextColor}`}>
                        {new Date(keyItem.createdAt).toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 ${secondaryTextColor}`}>
                        {keyItem.expiresAt
                          ? new Date(keyItem.expiresAt).toLocaleString()
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteKey(keyItem._id)}
                          className="text-red-500 hover:text-red-600 focus:outline-none"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
