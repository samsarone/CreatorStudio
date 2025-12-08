import React from 'react';
import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext.jsx';
import { getHeaders, persistAuthToken } from '../../../utils/web.jsx';
import Register from '../Register.tsx';
import OverflowContainer from '../../common/OverflowContainer.tsx';

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function RegisterPage() {
  const { setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  // No-op if you don't need a dialog close
  const closeAlertDialog = () => { };

  const registerWithGoogle = () => {
    const origin = window.location.origin;
    axios
      .get(`${PROCESSOR_SERVER}/users/google_login?origin=${origin}`)
      .then((dataRes) => {
        const authPayload = dataRes.data;
        localStorage.setItem('setShowSetPaymentFlow', true);
        window.location.href = authPayload.loginUrl; // Redirect to Google OAuth
      })
      .catch((error) => {
        
      });
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
  const registerUserWithEmail = (payload) => {
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
        
        // If you need to handle the error inside <Register />, 
        // you might consider setting some error state here or pass a callback.
      });
  };

  return (
    <OverflowContainer>


      <div className="w-full flex flex-col items-center justify-center pt-20">
        <div className="bg-gray-800 text-white rounded-lg p-6 max-w-md w-full">
          <Register
            registerWithGoogle={registerWithGoogle}
            registerUserWithEmail={registerUserWithEmail}
            setUser={setUser}
            getOrCreateUserSession={getOrCreateUserSession}
            closeAlertDialog={closeAlertDialog}
            showLoginButton={false}
          // setCurrentLoginView not needed anymore
          />

          <div className="text-center mt-4">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="underline">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </OverflowContainer>
  );
}
