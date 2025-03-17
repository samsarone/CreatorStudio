// src/components/account/APIKeysPanelContent.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEye, FaEyeSlash, FaTrash, FaTimes } from 'react-icons/fa';
import SecondaryButton from '../common/SecondaryButton.tsx';
import { getHeaders } from '../../utils/web.js';
import { useColorMode } from '../../contexts/ColorMode.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useUser } from '../../contexts/UserContext.js';
import { useAlertDialog } from '../../contexts/AlertDialogContext.js';
import UpgradePlan from '../payments/UpgradePlan.tsx';

const PROCESSOR_SERVER = process.env.REACT_APP_PROCESSOR_API;

export default function APIKeysPanelContent() {
  const { colorMode } = useColorMode();
  const { user } = useUser();
  const { openAlertDialog, closeAlertDialog } = useAlertDialog();

  const textColor = colorMode === 'dark' ? 'text-neutral-100' : 'text-neutral-800';
  const bgColor = colorMode === 'dark' ? 'bg-neutral-900' : 'bg-neutral-100';
  const secondaryTextColor = colorMode === 'dark' ? 'text-neutral-400' : 'text-neutral-500';
  const cardBgColor = colorMode === 'dark' ? 'bg-neutral-800' : 'bg-white';
  const borderColor = colorMode === 'dark' ? 'border-neutral-700' : 'border-neutral-300';

  const [apiKeys, setApiKeys] = useState([]);
  const [showKey, setShowKey] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.isPremiumUser) {
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

      setApiKeys(response.data.apiKeys || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
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
      console.error('Error creating API key:', error);
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
      console.error('Error deleting API key:', error);
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

  const handleUpgradeToPremium = () => {
    const alertDialogComponent = <UpgradePlan />;
    openAlertDialog(
      <div>
        <FaTimes
          className="absolute top-2 right-2 cursor-pointer"
          onClick={closeAlertDialog}
        />
        {alertDialogComponent}
      </div>
    );
  };

  // If user is not a premium user, show message and upgrade button
  if (!user || (!user.isPremiumUser && !user.isPartnerUser )) {
    return (
      <div
        className={`flex flex-col flex-grow items-center justify-center ${bgColor} ${textColor}`}
      >
        <p className="text-lg mb-4">
          Sign up for a premium or professional plan to create API keys.
        </p>
        <SecondaryButton onClick={handleUpgradeToPremium}>
          Upgrade Plan
        </SecondaryButton>
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-grow ${bgColor} ${textColor}`}>
      <ToastContainer />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">API Keys</h2>
        <SecondaryButton onClick={handleCreateKey}>Create Key</SecondaryButton>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : apiKeys.length === 0 ? (
        <p className={`text-lg ${secondaryTextColor}`}>No API keys found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={`min-w-full border ${borderColor}`}>
            <thead>
              <tr className={`${cardBgColor}`}>
                <th className="px-4 py-2 border-b text-left">Index</th>
                <th className="px-4 py-2 border-b text-left">Key</th>
                <th className="px-4 py-2 border-b text-left">Created At</th>
                <th className="px-4 py-2 border-b text-left">Expires At</th>
                <th className="px-4 py-2 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((keyItem, index) => (
                <tr
                  key={keyItem._id}
                  className={`${index % 2 === 0 ? 'bg-neutral-800' : ''}`}
                >
                  <td className="px-4 py-2 border-b">{index + 1}</td>
                  <td className="px-4 py-2 border-b">
                    <div className="flex items-center">
                      <span className="mr-2">
                        {showKey[keyItem._id]
                          ? keyItem.apiKey
                          : maskedKey(keyItem.apiKey)}
                      </span>
                      <button
                        onClick={() => toggleShowKey(keyItem._id)}
                        className="focus:outline-none"
                      >
                        {showKey[keyItem._id] ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2 border-b">
                    {new Date(keyItem.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 border-b">
                    {keyItem.expiresAt
                      ? new Date(keyItem.expiresAt).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-2 border-b">
                    <button
                      onClick={() => handleDeleteKey(keyItem._id)}
                      className="text-red-500 hover:text-red-700 focus:outline-none"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}