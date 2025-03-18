// UserContext.js
import React, { useState, useContext, createContext } from 'react';
import axios from 'axios';
const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API || 'http://localhost:3002';

// Step 2: Define the User Context
const UserContext = createContext({
  user: null,
  setUser: (profile) => { },
  getUser: () => { },
  setUserApi: (profile) => { },
  resetUser: () => { },
  getUserAPI: () => ({ user: null }),
  userFetching: false,
  userInitiated: false,


});

// Step 3: Create the Context Provider
export const UserProvider = ({ children }) => {

  const [user, setUserState] = useState(null);
  const [userFetching, setUserFetching] = useState(true);

  const [userInitiated, setUserInitiated] = useState(false);
  // Function to update the user state
  const setUserApi = (profile) => {
    // axios.post(`${PROCESSOR_SERVER}/users/set_user`, profile).then((res) => {
    //   const userProfile = res.data;
    //   localStorage.setItem('fid', userProfile.fid);
    //   setUserState(userProfile);
    // }).catch((err) => {
    //   console.log(err);
    // });
  };

  const setUser = (profile) => {
    setUserState(profile);
  }

  // Function to retrieve the current user state
  const getUser = () => {
    return user;
  };

  const resetUser = () => {
    setUserState(null);
    localStorage.clear();
  }

  const getUserAPI = () => {
    let authToken = localStorage.getItem("authToken");
    if (!authToken || authToken === "undefined" || authToken.length === 0) {
      setUserInitiated(true);
      return null;
    }
    setUserFetching(true);
    axios.get(`${PROCESSOR_SERVER}/users/verify_token?authToken=${authToken}`).then((res) => {
      const userProfile = res.data;
      setUserState(userProfile);
      localStorage.setItem('fid', userProfile.fid);
      setUserFetching(false);
      setUserInitiated(true);
      return userProfile;
    }).catch((err) => {
      setUserFetching(false);
      localStorage.clear();
    });
  }

  return (
    <UserContext.Provider value={{ user, setUserApi, getUser, getUserAPI, resetUser, setUser, userFetching, userInitiated }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the UserContext
export const useUser = () => useContext(UserContext);
