import React, { useEffect, useState } from 'react';
import Login from './Login.tsx';
import Register from './Register.tsx';
import ForgotPassword from './ForgotPassword.jsx';
import axios from 'axios';
import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';
import { useUser } from '../../contexts/UserContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { getHeaders } from '../../utils/web.jsx';

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function AuthContainer(props) {
  const { initView } = props;

  const [error, setError] = useState('');
  
  useEffect(() => {
    if (initView) {
      if (initView === 'register') {
        setCurrentLoginView('register');
      } else {
        setCurrentLoginView('login');
      }
    }
  }, [initView]);
  const [currentLoginView, setCurrentLoginView] = useState('login');

  const API_SERVER = import.meta.env.VITE_PROCESSOR_API;
  const navigate = useNavigate();
  const location = useLocation();
  const { closeAlertDialog } = useAlertDialog();
  const { setUser } = useUser();

  const signInWithGoogle = () => {
    let currentMediaFlowPath = 'video';
    if (location.pathname.includes('/quick_video/')) {
      currentMediaFlowPath = 'quick_video';
    }
    localStorage.setItem('currentMediaFlowPath', currentMediaFlowPath);

    const origin = window.location.origin;
    axios.get(`${PROCESSOR_SERVER}/users/google_login?origin=${origin}`)
      .then((dataRes) => {
        const authPayload = dataRes.data;
        const googleAuthUrl = authPayload.loginUrl;
        window.location.href = googleAuthUrl; // Redirect to Google OAuth
      })
      .catch((error) => {
        console.error('Error during Google login:', error);
      });
    closeAlertDialog();
  };

  const registerWithGoogle = () => {
    const origin = window.location.origin;
    axios.get(`${PROCESSOR_SERVER}/users/google_login?origin=${origin}`)
      .then((dataRes) => {
        const authPayload = dataRes.data;
        const googleAuthUrl = authPayload.loginUrl;

        localStorage.setItem("setShowSetPaymentFlow", true);
        
        window.location.href = googleAuthUrl; // Redirect to Google OAuth
      })
      .catch((error) => {
        console.error('Error during Google registration:', error);
      });
    closeAlertDialog();
  };

  const verifyAndSetUserProfile = (profile) => {
    axios.post(`${PROCESSOR_SERVER}/users/verify`, profile)
      .then((dataRes) => {
        const userData = dataRes.data;
        const authToken = userData.authToken;
        localStorage.setItem('authToken', authToken);
        setUser(userData);
        closeAlertDialog();
      })
      .catch((error) => {
        console.error('Error verifying user profile:', error);
      });
  };

  const getOrCreateUserSession = () => {
    const headers = getHeaders();

    axios.get(`${API_SERVER}/video_sessions/get_session`, headers)
      .then((res) => {
        const sessionData = res.data;
        if (sessionData) {
          localStorage.setItem('videoSessionId', sessionData._id);

          // Navigate based on the current path
          if (location.pathname.includes('/video/')) {
            navigate(`/video/${sessionData._id}`);
          } else {
            navigate(`/quick_video/${sessionData._id}`);
          }
        } else {
          navigate('/my_sessions');
        }
      })
      .catch((error) => {
        console.error('Error getting or creating user session:', error);
      });
  };

  const registerUserWithEmail = (payload) => {


    axios.post(`${PROCESSOR_SERVER}/users/register`, payload)
    .then((dataRes) => {
      const userData = dataRes.data;
      const authToken = userData.authToken;
      localStorage.setItem('authToken', authToken);
      setUser(userData);
      closeAlertDialog();
      getOrCreateUserSession();

      localStorage.setItem("setShowSetPaymentFlow", true);
    })
    .catch((error) => {
      console.error('Error during user registration:', error);
      setError('Unable to register user');
    });

  }

  if (currentLoginView === 'login') {
    return (
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
    return (
      <ForgotPassword
        setCurrentLoginView={setCurrentLoginView}
        closeAlertDialog={closeAlertDialog}
      />
    );
  }
  return (
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
