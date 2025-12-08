import React, { useEffect, useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

import { getHeaders, getAuthToken } from '../../utils/web';


const API_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function QuickEditorLandingHome() {

  const { user, userFetching, userInitiated } = useUser();
  const [isGuest, setIsGuest] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();



  useEffect(() => {
    const userToken = getAuthToken();
    if (!userToken || ((!user || !user._id) && !userFetching)) {

      setIsGuest(true);
    }
  }, [user, userFetching]);

  useEffect(() => {
    if (user) {
      const headers = getHeaders();
      const payload = {
        prompts: [],
      };
      axios.post(`${API_SERVER}/video_sessions/create_video_session`, payload, headers).then(function (response) {
        const session = response.data;
        const sessionId = session._id.toString();
        localStorage.setItem('videoSessionId', sessionId);

        navigate(`/videogpt/${session._id}`);

      });
    }


  }, []);


  useEffect(() => {
    if (user) {
      const headers = getHeaders();
      const payload = {
        prompts: [],
      };
      axios.post(`${API_SERVER}/video_sessions/create_video_session`, payload, headers).then(function (response) {
        const session = response.data;
        const sessionId = session._id.toString();
        localStorage.setItem('videoSessionId', sessionId);

        navigate(`/videogpt/${session._id}`);

      });
    }


  }, [user]);


  useEffect(() => {
    const userToken = getAuthToken();
    if (!userToken || ((!user || !user._id) && !userFetching)) {
      setIsGuest(true);
    }
  }, [user, userFetching]);

  useEffect(() => {

    if (isGuest) {
      axios.get(`${API_SERVER}/video_sessions/fetch_guest_session`).then((res) => {
        const sessionData = res.data;
        if (sessionData) {
          navigate(`/videogpt/${sessionData._id}`);
        }
      });
    }
  }, [isGuest]);



  return (
    <div>

    </div>
  );
}
