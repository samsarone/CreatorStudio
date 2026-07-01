import React, { useEffect, useRef } from 'react';
import { useUser } from '../../contexts/UserContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getHeaders, persistAuthToken, getAuthToken } from '../../utils/web';
import './home.css';
import StudioSkeletonLoader from './util/StudioSkeletonLoader.jsx';

const API_SERVER = import.meta.env.VITE_PROCESSOR_API;

const CURRENT_ENV = import.meta.env.VITE_CURRENT_ENV;


export default function VideoEditorLandingHome() {

  const { user, userFetching, userInitiated, setUser } = useUser();
  const navigate = useNavigate();
  const redirectStartedRef = useRef(false);

  useEffect(() => {
    if (!userInitiated || userFetching || redirectStartedRef.current) {
      return;
    }

    redirectStartedRef.current = true;

    const run = async () => {
      const userToken = getAuthToken();
      const isGuest = !userToken || !user || !user._id;

      const createNewSession = async () => {
        const headers = getHeaders();
        const res = await axios.get(`${API_SERVER}/video_sessions/create_video_session`, headers);
        const sessionData = res.data;
        localStorage.setItem('videoSessionId', sessionData._id);
        navigate(`/video/${sessionData._id}`, { replace: true });
      };

      if (isGuest) {
        if (CURRENT_ENV === 'staging' || CURRENT_ENV === 'docker') {
          try {
            const res = await axios.get(`${API_SERVER}/license/verify_user_license`);
            const userData = res.data.data;
            if (userData) {
              persistAuthToken(userData.authToken);
              setUser(userData);
              navigate('/my_sessions', { replace: true });
            }
          } catch (err) {
            
          }
          return;
        }

        try {
          const res = await axios.get(`${API_SERVER}/video_sessions/fetch_guest_session`);
          const sessionData = res.data;
          if (sessionData && sessionData._id) {
            navigate(`/video/${sessionData._id}`, { replace: true });
          }
        } catch (err) {
          
        }
        return;
      }

      const videoSessionId = localStorage.getItem('videoSessionId');
      if (videoSessionId) {
        const headers = getHeaders();
        try {
          const res = await axios.get(
            `${API_SERVER}/video_sessions/validate_session?sessionId=${videoSessionId}`,
            headers
          );
          const sessionData = res.data;
          if (sessionData) {
            navigate(`/vidgenie/${videoSessionId}`, { replace: true });
            return;
          }
        } catch (err) {
          
        }

        localStorage.removeItem('videoSessionId');
        await createNewSession();
        return;
      }

      const headers = getHeaders();
      try {
        const res = await axios.get(`${API_SERVER}/video_sessions/get_session`, headers);
        const sessionData = res.data;
        if (sessionData) {
          localStorage.setItem('videoSessionId', sessionData._id);
          navigate(`/video/${sessionData._id}`, { replace: true });
        } else {
          navigate('/my_sessions', { replace: true });
        }
      } catch (err) {
        
      }
    };

    run();
  }, [userInitiated, userFetching, user, navigate, setUser]);



  return (
    <StudioSkeletonLoader />
  );
}
