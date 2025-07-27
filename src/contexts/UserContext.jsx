import React, { useState, useContext, createContext } from 'react';
import axios from 'axios';
import { getHeaders, getAuthToken } from '../utils/web'; // Adjust the path if needed

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API || 'http://localhost:3002';

const UserContext = createContext({
  user: null,
  setUser: () => {},
  getUser: () => {},
  setUserApi: () => {},
  resetUser: () => {},
  getUserAPI: () => null,
  userFetching: false,
  userInitiated: false,
});

export const UserProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [userFetching, setUserFetching] = useState(true);
  const [userInitiated, setUserInitiated] = useState(false);

  const setUserApi = (profile) => {
    // Placeholder for future use
  };

  const setUser = (profile) => {
    setUserState(profile);
  };

  const getUser = () => user;

  const resetUser = () => {
    setUserState(null);
    localStorage.clear();
    // Clear authToken cookie
    document.cookie = `authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
  };

  const getUserAPI = async () => {
    const authToken = getAuthToken();

    if (!authToken || authToken === 'undefined') {
      setUserInitiated(true);
      return null;
    }

    setUserFetching(true);

    try {
      const res = await axios.get(`${PROCESSOR_SERVER}/users/verify_token`, getHeaders());
      const userProfile = res.data;
      setUserState(userProfile);
      setUserInitiated(true);
      return userProfile;
    } catch (err) {
      console.error('Error verifying user token:', err);
      resetUser();
    } finally {
      setUserFetching(false);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUserApi,
        getUser,
        getUserAPI,
        resetUser,
        setUser,
        userFetching,
        userInitiated,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
