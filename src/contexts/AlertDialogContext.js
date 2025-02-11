// UserContext.js
import React, { useState, useContext, createContext } from 'react';


const AlertDialogContext = createContext({
  isAlertDialogOpen: false,
  alertDialogContent: null,
  openAlertDialog: (data, fn) => {},
  closeAlertDialog: () => {},
  alertDialogSubmit: null,
  setAlertComponentHTML: (data) => {},
  isAlertActionPending: false,
  setIsAlertActionPending: (data) => {},
  useXL: false,

});

export const AlertDialogProvider = ({ children }) => {
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [alertDialogContent, setDialogContent] = useState(null);
  const [alertDialogSubmit, setAlertDialogSubmit] = useState(null);
  const [isAlertActionPending, setIsAlertActionPending] = useState(false);
  const [alertComponentData, setAlertComponentData] = useState(<span />);

  const [useXL, setUseXL] = useState(false);

  const openAlertDialog = (content, onsubmit, useXLValue = false) => {

    setDialogContent(content);
    setAlertDialogSubmit(onsubmit);
    setUseXL(useXLValue);
    setIsAlertDialogOpen(true);
  };

  const closeAlertDialog = () => {
    setIsAlertDialogOpen(false);
    setDialogContent(null);
    setUseXL(false);
  };

  const setAlertComponentHTML = (html) => {
    setAlertComponentData(html);
  }

  return (
    <AlertDialogContext.Provider value={{ isAlertDialogOpen, alertDialogContent, openAlertDialog,
     closeAlertDialog,  setAlertComponentHTML , isAlertActionPending, setIsAlertActionPending,   useXL, }}>
      {children}
    </AlertDialogContext.Provider>
  );
};


export const useAlertDialog = () => useContext(AlertDialogContext);