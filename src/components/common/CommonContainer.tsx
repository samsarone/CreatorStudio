import React, { useEffect , useState } from "react";
import TopNav from "./TopNav.tsx";
import { AlertDialog } from "./AlertDialog.tsx";
import { useUser } from "../../contexts/UserContext";
import { getHeaders } from '../../utils/web.js';

import axios from 'axios';
const API_SERVER = process.env.REACT_APP_PROCESSOR_API;


export default function CommonContainer(props) {
  const { children , isVideoPreviewPlaying, setIsVideoPreviewPlaying } = props;

  console.log(props);
  
  const { getUserAPI , user, setUser} = useUser();



  const resetCurrentSession = () => {
    if (props.resetSession) {
      props.resetSession();
    
    }
  }




  return (
    <div className='h-[100vh] overflow-hidden bg-cyber-black'>
      <TopNav 
      resetCurrentSession={resetCurrentSession}
      isVideoPreviewPlaying={isVideoPreviewPlaying}
      setIsVideoPreviewPlaying={setIsVideoPreviewPlaying}

/>
      <div>
        <AlertDialog />
        {children}
      </div>
    </div>
  )
}