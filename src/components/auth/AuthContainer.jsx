import React, { useEffect, useState } from 'react';
import Login from './Login.tsx';
import Register from './Register.tsx';
import ForgotPassword from './ForgotPassword.jsx';
import axios from 'axios';
import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';
import { useUser } from '../../contexts/UserContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { getHeaders, persistAuthToken, hasAcceptedCookies } from '../../utils/web.jsx';
import { FaTimes } from 'react-icons/fa';

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function AuthContainer(props) {
  const { initView } = props;

  const [error, setError] = useState('');
  const [currentLoginView, setCurrentLoginView] = useState('login');
  
  const API_SERVER = import.meta.env.VITE_PROCESSOR_API;
  const navigate = useNavigate();
  const location = useLocation();
  const { closeAlertDialog } = useAlertDialog();
  const { setUser } = useUser();

  const buildGoogleLoginUrl = () => {
    const origin = window.location.origin;
    const cookieConsent = hasAcceptedCookies() ? 'accepted' : 'rejected';
    const params = new URLSearchParams({ origin, cookieConsent });
    return `${PROCESSOR_SERVER}/users/google_login?${params.toString()}`;
  };

  useEffect(() => {
    if (initView) {
      if (initView === 'register') {
        setCurrentLoginView('register');
      } else {
        setCurrentLoginView('login');
      }
    }
  }, [initView]);

  const signInWithGoogle = () => {
    let currentMediaFlowPath = 'video';
    if (location.pathname.includes('/vidgenie/')) {
      currentMediaFlowPath = 'quick_video';
    }
    localStorage.setItem('currentMediaFlowPath', currentMediaFlowPath);

    axios.get(buildGoogleLoginUrl())
      .then((dataRes) => {
        const authPayload = dataRes.data;
        const googleAuthUrl = authPayload.loginUrl;
        window.location.href = googleAuthUrl; // Redirect to Google OAuth
      })
      .catch((error) => {
        
        setError('Unable to initiate Google login at this time.');
      });
    closeAlertDialog();
  };

  const registerWithGoogle = () => {
    axios.get(buildGoogleLoginUrl())
      .then((dataRes) => {
        const authPayload = dataRes.data;
        const googleAuthUrl = authPayload.loginUrl;

        localStorage.setItem("setShowSetPaymentFlow", true);

        window.location.href = googleAuthUrl; // Redirect to Google OAuth
      })
      .catch((error) => {
        
        setError('Unable to initiate Google registration at this time.');
      });
    closeAlertDialog();
  };

  const verifyAndSetUserProfile = (profile) => {
    axios.post(`${PROCESSOR_SERVER}/users/verify`, profile)
      .then((dataRes) => {
        const userData = dataRes.data;
        const authToken = userData.authToken;
        persistAuthToken(authToken);
        setUser(userData);
        closeAlertDialog();
      })
      .catch((error) => {
        
        setError('Unable to verify user profile.');
      });
  };

  const getOrCreateUserSession = () => {
    const headers = getHeaders();

    axios.get(`${API_SERVER}/video_sessions/get_session`, headers)
      .then((res) => {
        const sessionData = res.data;

        if (sessionData && sessionData._id) {
          localStorage.setItem('videoSessionId', sessionData._id);

          // Navigate based on the current path
          if (location.pathname.includes('/video/')) {
            navigate(`/video/${sessionData._id}`);
          } else {
            navigate(`/vidgenie/${sessionData._id}`);
          }
        } else {
          navigate('/my_sessions');
        }
      })
      .catch((error) => {
        
        setError('Unable to create or get a session.');
      });
  };

  /**
   * Register user with email and bubble up server errors if any
   */
  const registerUserWithEmail = async (payload, onError) => {
    try {
      const { data } = await axios.post(`${PROCESSOR_SERVER}/users/register`, payload);
      const userData = data;
      const authToken = userData.authToken;

      persistAuthToken(authToken);
      setUser(userData);
      closeAlertDialog();
      getOrCreateUserSession();

      localStorage.setItem("setShowSetPaymentFlow", true);
    } catch (error) {
      

      // Attempt to bubble server error back to <Register />
      if (error.response && error.response.data && error.response.data.message) {
        onError(error.response.data.message);
      } else {
        onError('Unable to register user at this time. Please try again.');
      }
    }
  };

  let authoComponent;



  if (currentLoginView === 'login') {
    authoComponent = (
      <Login
        setCurrentLoginView={setCurrentLoginView}
        signInWithGoogle={signInWithGoogle}
        verifyAndSetUserProfile={verifyAndSetUserProfile}
        setUser={setUser}
        closeAlertDialog={closeAlertDialog}
        getOrCreateUserSession={getOrCreateUserSession}
        showSignupButton={true}
      />
    );
  } else if (currentLoginView === 'forgotPassword') {
    authoComponent = (
      <ForgotPassword
        setCurrentLoginView={setCurrentLoginView}
        closeAlertDialog={closeAlertDialog}
      />
    );
  } else {
    authoComponent = (
      <Register
        setCurrentLoginView={setCurrentLoginView}
        registerWithGoogle={registerWithGoogle}
        verifyAndSetUserProfile={verifyAndSetUserProfile}
        setUser={setUser}
        getOrCreateUserSession={getOrCreateUserSession}
        closeAlertDialog={closeAlertDialog}
        registerUserWithEmail={registerUserWithEmail}
        showLoginButton={true}
      />
    );
  }

  return (
    <div>
      {/* If you'd like to display container-level errors */}
      {error && (
        <div className="text-center text-red-500">
          {error}
        </div>
      )}

      <FaTimes className='absolute top-2 right-2 cursor-pointer' onClick={closeAlertDialog} />
      {authoComponent}
    </div>
  );
}
