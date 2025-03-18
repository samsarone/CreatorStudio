import React, { useEffect, useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getHeaders } from '../../utils/web';
import { FaSpinner } from 'react-icons/fa';
import './home.css';
import LoadingImage from './util/LoadingImage';

const API_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function VideoEditorLandingHome() {

  const { user, userFetching, userInitiated } = useUser();
  const [isGuest, setIsGuest] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userToken = localStorage.getItem('authToken');
    if (!userToken || ((!user || !user._id) && !userFetching)) {
      console.log('User not found, redirecting to login');
      setIsGuest(true);
    }
  }, [user, userFetching]);

  if (!userInitiated) {
    return (
      <LoadingImage />
    );
  }

  if (isGuest) {
    axios.get(`${API_SERVER}/video_sessions/fetch_guest_session`).then((res) => {
      const sessionData = res.data;
      if (sessionData) {
        navigate(`/video/${sessionData._id}`);
      }
    });
  } else {
    const videoSessionId = localStorage.getItem('videoSessionId');
    if (videoSessionId) {

      const headers = getHeaders();
      axios.get(`${API_SERVER}/video_sessions/validate_session?sessionId=${videoSessionId}`, headers).then((res) => {
        const sessionData = res.data;
        if (sessionData) {
          navigate(`/video/${videoSessionId}`);
        } else {
          localStorage.removeItem('videoSessionId');
          createNewSession();
        }
      }).catch(() => {
        localStorage.removeItem('videoSessionId');
        createNewSession();
      });

    } else {
      const headers = getHeaders();

      axios.get(`${API_SERVER}/video_sessions/get_session`, headers).then((res) => {
        const sessionData = res.data;
        if (sessionData) {
          localStorage.setItem('videoSessionId', sessionData._id);
          navigate(`/video/${sessionData._id}`);
        } else {

          navigate('/my_sessions');
        }

      });
    }
  }

  const createNewSession = () => {
    const headers = getHeaders();

    axios.get(`${API_SERVER}/video_sessions/create_video_session`, headers).then((res) => {
      const sessionData = res.data;
      localStorage.setItem('videoSessionId', sessionData._id);
      navigate(`/video/${sessionData._id}`);
    });
  }



  return (
    <div className=''>

    </div>
  );
}
