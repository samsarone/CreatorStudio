import React from 'react';
import axios from 'axios';
import { useUser } from '../../../contexts/UserContext.js';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { getHeaders } from '../../../utils/web.js';
import Login from '../Login.tsx';  // <-- Reuse your existing Login component
import OverflowContainer from '../../common/OverflowContainer.tsx';

const PROCESSOR_SERVER = process.env.REACT_APP_PROCESSOR_API;

export default function LoginPage() {
  const { setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  // In a page (vs. a modal), we can define a no-op or minimal function:
  const closeAlertDialog = () => {
    // No-op in a full page context
  };

  // signInWithGoogle logic copied from your AuthContainer
  const signInWithGoogle = () => {
    let currentMediaFlowPath = 'video';
    if (location.pathname.includes('/quick_video/')) {
      currentMediaFlowPath = 'quick_video';
    }
    localStorage.setItem('currentMediaFlowPath', currentMediaFlowPath);

    const origin = window.location.origin;
    axios
      .get(`${PROCESSOR_SERVER}/users/google_login?origin=${origin}`)
      .then((dataRes) => {
        const authPayload = dataRes.data;
        window.location.href = authPayload.loginUrl; // Redirect to Google OAuth
      })
      .catch((error) => {
        console.error('Error during Google login:', error);
      });
  };

  // Similar to AuthContainer
  const getOrCreateUserSession = () => {
    const headers = getHeaders();
    axios
      .get(`${PROCESSOR_SERVER}/video_sessions/get_session`, headers)
      .then((res) => {
        const sessionData = res.data;
        if (sessionData) {
          localStorage.setItem('videoSessionId', sessionData._id);
          // If user wanted quick_video, navigate there; else normal /video route
          const currentMediaFlow = localStorage.getItem('currentMediaFlowPath');
          if (currentMediaFlow === 'quick_video') {
            navigate(`/quick_video/${sessionData._id}`);
          } else {
            navigate(`/video/${sessionData._id}`);
          }
        } else {
          navigate('/my_sessions');
        }
      })
      .catch((error) => {
        console.error('Error getting or creating user session:', error);
      });
  };

  return (
    <OverflowContainer>


    <div className="w-full flex flex-col items-center justify-center pt-20">
      {/* You can style the container as you prefer */}
      <div className="bg-neutral-800 text-white rounded-lg p-6 max-w-md w-full">
        {/* Reuse your existing <Login> component. 
            Pass in only the props it needs. */}
        <Login
          signInWithGoogle={signInWithGoogle}
          setUser={setUser}
          closeAlertDialog={closeAlertDialog}
          getOrCreateUserSession={getOrCreateUserSession}
          showSignupButton={false}
          // setCurrentLoginView is no longer needed, we do not toggle views
        />
        
        {/* If you want to transform 
            “Don’t have an account? -> Sign up” 
            so it navigates to /register, you can remove or override in the <Login> component 
            OR just display a link below: */}
        <div className="text-center mt-4">
          <p>
            Don’t have an account?{' '}
            <Link to="/register" className="underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
    </OverflowContainer>
  );
}

