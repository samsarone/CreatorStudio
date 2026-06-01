import React from 'react';
import axios from 'axios';
import { useUser } from '../../../contexts/UserContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { getHeaders, hasAcceptedCookies } from '../../../utils/web.jsx';
import { getDefaultAuthenticatedPath } from '../../../utils/defaultRoutes.js';
import { resolveAuthenticatedEntryPath } from '../../../utils/vidgenieRouting.js';
import Login from '../Login.tsx';  // <-- Reuse your existing Login component
import OverflowContainer from '../../common/OverflowContainer.tsx';
import { useMediaQuery } from 'react-responsive';

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function LoginPage() {
  const { setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery({ query: '(max-width: 767px)' });

  // In a page (vs. a modal), we can define a no-op or minimal function:
  const closeAlertDialog = () => {
    // No-op in a full page context
  };

  const handleViewChange = (view) => {
    const targetPath = view === 'register' ? '/register' : '/login';
    if (location.pathname !== targetPath) {
      navigate({ pathname: targetPath, search: location.search });
    }
  };

  // signInWithGoogle logic copied from your AuthContainer
  const signInWithGoogle = () => {
    let currentMediaFlowPath = isMobile ? 'quick_video' : 'video';
    if (location.pathname.includes('/vidgenie/')) {
      currentMediaFlowPath = 'quick_video';
    }
    localStorage.setItem('currentMediaFlowPath', currentMediaFlowPath);

    const origin = window.location.origin;
    const cookieConsent = hasAcceptedCookies() ? 'accepted' : 'rejected';
    const params = new URLSearchParams({ origin, cookieConsent });
    params.set('responseMode', 'redirect');
    window.location.href = `${PROCESSOR_SERVER}/users/google_login?${params.toString()}`;
  };

  // Similar to AuthContainer
  const getOrCreateUserSession = async (resolvedUser = null) => {
    const headers = getHeaders();
    const currentMediaFlow = localStorage.getItem('currentMediaFlowPath');
    const defaultPath = getDefaultAuthenticatedPath(resolvedUser, { isMobile });
    const shouldOpenVidgenie =
      currentMediaFlow === 'quick_video' ||
      currentMediaFlow === 'vidgpt' ||
      defaultPath === '/vidgenie';

    if (shouldOpenVidgenie) {
      try {
        const targetPath = await resolveAuthenticatedEntryPath({
          user: resolvedUser,
          isMobile,
          apiServer: PROCESSOR_SERVER,
          headers,
          search: location.search,
          createIfMissing: true,
        });
        navigate(targetPath || defaultPath, { replace: true });
      } catch (error) {
        navigate(defaultPath, { replace: true });
      }
      return;
    }

    axios
      .get(`${PROCESSOR_SERVER}/video_sessions/get_session`, headers)
      .then((res) => {
        const sessionData = res.data;
        if (sessionData) {
          localStorage.setItem('videoSessionId', sessionData._id);
          // If user wanted quick_video, navigate there; else normal /video route
          navigate(`/video/${sessionData._id}`);
        } else {
          navigate(defaultPath, { replace: true });
        }
      })
      .catch((error) => {
        
      });
  };

  return (
    <OverflowContainer>
      <div className="flex min-h-[calc(100vh-96px)] w-full flex-col items-center justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-md">
          <Login
            signInWithGoogle={signInWithGoogle}
            setUser={setUser}
            closeAlertDialog={closeAlertDialog}
            getOrCreateUserSession={getOrCreateUserSession}
            showSignupButton={false}
            setCurrentLoginView={handleViewChange}
          />
        </div>
      </div>
    </OverflowContainer>
  );
}
