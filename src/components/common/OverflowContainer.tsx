import React, { useEffect, useState } from "react";
import { useMediaQuery } from 'react-responsive';
import TopNav from "./TopNav.tsx";

import MobileTopNav from "./MobileTopNav.tsx";
import { AlertDialog } from "./AlertDialog.tsx";
import { useUser } from "../../contexts/UserContext";


import { getHeaders } from "../../utils/web.jsx";
import axios from "axios";
import { useNavigate } from "react-router-dom";


const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function OverflowContainer(props) {
  const { children } = props;
  const { getUserAPI } = useUser();

  const navigate = useNavigate();

  const resetCurrentSession = () => {
    if (props.resetSession) {
      props.resetSession();
    }
  }

  const addCustodyAddress = (address) => {
    // Function to add custody address
  }


    const addNewVidGPTSession = () => {
      const headers = getHeaders();
      const payload = {
        prompts: [],
      };
      axios.post(`${PROCESSOR_SERVER}/video_sessions/create_video_session`, payload, headers).then(function (response) {
        const session = response.data;
        const sessionId = session._id.toString();
        localStorage.setItem('videoSessionId', sessionId);
  
        navigate(`/vidgenie/${session._id}`);
  
      });
    }





  const isMobile = useMediaQuery({ maxWidth: 767 });

  return (
    <div className='min-h-[100vh] overflow-y-auto pb-8' >
      {isMobile ? (
        <MobileTopNav
          resetCurrentSession={resetCurrentSession}
          addCustodyAddress={addCustodyAddress}
          addNewVidGPTSession={addNewVidGPTSession}
        />
      ) : (
        <TopNav
          resetCurrentSession={resetCurrentSession}
          addCustodyAddress={addCustodyAddress}


        />
      )}
      <div>
        <AlertDialog />
        {children}
      </div>
    </div>
  )
}
