import React, { useEffect, useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getHeaders, persistAuthToken, getAuthToken } from '../../utils/web';
import './home.css';
import StudioSkeletonLoader from './util/StudioSkeletonLoader.jsx';

const API_SERVER = import.meta.env.VITE_PROCESSOR_API;

const CURRENT_ENV = import.meta.env.VITE_CURRENT_ENV;


export default function VideoEditorLandingHome() {

  const { user, userFetching, userInitiated,  setUser} = useUser();
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
      <StudioSkeletonLoader />
    );
  }

  if (isGuest) {

    if (CURRENT_ENV === 'staging' || CURRENT_ENV === 'docker') {
      axios.get(`${API_SERVER}/license/verify_user_license`).then((res) => {
        const userData = res.data.data;
        if (userData) {
          persistAuthToken(userData.authToken);
          setUser(userData);
          navigate('/my_sessions');
        }

      });
      return;
    }

    axios.get(`${API_SERVER}/video_sessions/fetch_guest_session`).then((res) => {
      const sessionData = res.data;
      if (sessionData && sessionData._id) {
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
          navigate(`/vidgenie/${videoSessionId}`);
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
