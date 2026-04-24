import React from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext.jsx';
import { getHeaders, persistAuthToken, hasAcceptedCookies } from '../../../utils/web.jsx';
import Register from '../Register.tsx';
import OverflowContainer from '../../common/OverflowContainer.tsx';

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function RegisterPage() {
  const { setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  // No-op if you don't need a dialog close
  const closeAlertDialog = () => { };

  const handleViewChange = (view) => {
    const targetPath = view === 'register' ? '/register' : '/login';
    if (location.pathname !== targetPath) {
      navigate({ pathname: targetPath, search: location.search });
    }
  };

  const registerWithGoogle = () => {
    const origin = window.location.origin;
    const cookieConsent = hasAcceptedCookies() ? 'accepted' : 'rejected';
    const params = new URLSearchParams({ origin, cookieConsent });
    params.set('responseMode', 'redirect');
    localStorage.setItem('setShowSetPaymentFlow', true);
    window.location.href = `${PROCESSOR_SERVER}/users/google_login?${params.toString()}`;
  };

  const getOrCreateUserSession = () => {
    const headers = getHeaders();
    axios
      .get(`${PROCESSOR_SERVER}/video_sessions/get_session`, headers)
      .then((res) => {
        const sessionData = res.data;
        if (sessionData) {
          localStorage.setItem('videoSessionId', sessionData._id);
          const currentMediaFlowPath = localStorage.getItem('currentMediaFlowPath');
          if (currentMediaFlowPath === 'quick_video') {
            navigate(`/vidgenie/${sessionData._id}`);
          } else {
            navigate(`/video/${sessionData._id}`);
          }
        } else {
          navigate('/my_sessions');
        }
      })
      .catch((error) => {
        
      });
  };

  // Register with email, same as AuthContainer
  const registerUserWithEmail = (payload, onError = () => {}) => {
    axios
      .post(`${PROCESSOR_SERVER}/users/register`, payload)
      .then((dataRes) => {
        const userData = dataRes.data;
        const authToken = userData.authToken;
        persistAuthToken(authToken);
        setUser(userData);
        closeAlertDialog(); // no-op here
        getOrCreateUserSession();
        localStorage.setItem('setShowSetPaymentFlow', 'true');
      })
      .catch((error) => {
        if (error.response && error.response.data && error.response.data.message) {
          onError(error.response.data.message);
        } else {
          onError('Unable to register user at this time. Please try again.');
        }
      });
  };

  return (
    <OverflowContainer>
      <div className="flex min-h-[calc(100vh-96px)] w-full items-center justify-center px-4 py-6 sm:py-8">
        <Register
          registerWithGoogle={registerWithGoogle}
          registerUserWithEmail={registerUserWithEmail}
          setUser={setUser}
          getOrCreateUserSession={getOrCreateUserSession}
          closeAlertDialog={closeAlertDialog}
          setCurrentLoginView={handleViewChange}
          showLoginButton={false}
        />
      </div>
    </OverflowContainer>
  );
}
