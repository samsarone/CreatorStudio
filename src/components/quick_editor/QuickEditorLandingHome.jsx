import React, { useEffect, useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getHeaders, getAuthToken } from '../../utils/web';
import { FaSpinner } from 'react-icons/fa';


const API_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function QuickEditorLandingHome() {

  const { user, userFetching, userInitiated } = useUser();
  const [isGuest, setIsGuest] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userToken = getAuthToken();
    if (!userToken || ((!user || !user._id) && !userFetching)) {
      setIsGuest(true);
    }
  }, [user, userFetching]);

  if (!userInitiated) {
    return (
      <div className="spinner-container">
        <FaSpinner className="spinner" />
      </div>
    );
  }

  if (isGuest) {
    axios.get(`${API_SERVER}/video_sessions/fetch_guest_session`).then((res) => {
      const sessionData = res.data;
      if (sessionData) {
        navigate(`/quick_video/${sessionData._id}`);
      }
    });
  } else {



    const videoSessionId = localStorage.getItem('videoSessionId');
    if (videoSessionId) {
      navigate(`/quick_video/${videoSessionId}`);
    } else {
      const headers = getHeaders();

      axios.get(`${API_SERVER}/video_sessions/get_session`, headers).then((res) => {
        const sessionData = res.data;
        if (sessionData) {
          localStorage.setItem('videoSessionId', sessionData._id);
          navigate(`/quick_video/${sessionData._id}`);
        } else {
          navigate('/my_sessions');
        }
      });
    }
    
  }

  return (
    <div>

    </div>
  );
}
