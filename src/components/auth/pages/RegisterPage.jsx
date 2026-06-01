import React from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext.jsx';
import { getHeaders, persistAuthToken, hasAcceptedCookies } from '../../../utils/web.jsx';
import { getDefaultAuthenticatedPath } from '../../../utils/defaultRoutes.js';
import { resolveAuthenticatedEntryPath } from '../../../utils/vidgenieRouting.js';
import Register from '../Register.tsx';
import OverflowContainer from '../../common/OverflowContainer.tsx';
import { useMediaQuery } from 'react-responsive';
import { PURCHASE_CREDITS_PROMPT_STORAGE_KEY } from '../../account/PurchaseCreditsPromptDialog.jsx';

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function RegisterPage() {
  const { setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery({ query: '(max-width: 767px)' });

  // No-op if you don't need a dialog close
  const closeAlertDialog = () => { };

  const handleViewChange = (view) => {
    const targetPath = view === 'register' ? '/register' : '/login';
    if (location.pathname !== targetPath) {
      navigate({ pathname: targetPath, search: location.search });
    }
  };

  const registerWithGoogle = ({ subscribeToWeeklyNewsletter = true } = {}) => {
    const origin = window.location.origin;
    const cookieConsent = hasAcceptedCookies() ? 'accepted' : 'rejected';
    const params = new URLSearchParams({ origin, cookieConsent });
    params.set('responseMode', 'redirect');
    params.set('subscribeToWeeklyNewsletter', String(subscribeToWeeklyNewsletter));
    localStorage.setItem('setShowSetPaymentFlow', true);
    localStorage.setItem(PURCHASE_CREDITS_PROMPT_STORAGE_KEY, 'true');
    localStorage.setItem('currentMediaFlowPath', isMobile ? 'quick_video' : 'video');
    window.location.href = `${PROCESSOR_SERVER}/users/google_login?${params.toString()}`;
  };

  const getOrCreateUserSession = async (resolvedUser = null) => {
    const headers = getHeaders();
    const currentMediaFlowPath = localStorage.getItem('currentMediaFlowPath');
    const defaultPath = getDefaultAuthenticatedPath(resolvedUser, { isMobile });
    const shouldOpenVidgenie =
      currentMediaFlowPath === 'quick_video' ||
      currentMediaFlowPath === 'vidgpt' ||
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
          navigate(`/video/${sessionData._id}`);
        } else {
          navigate(defaultPath, { replace: true });
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
        localStorage.setItem(PURCHASE_CREDITS_PROMPT_STORAGE_KEY, 'true');
        getOrCreateUserSession(userData);
        localStorage.setItem('setShowSetPaymentFlow', 'true');
      })
      .catch((error) => {
        const serverMessage = error.response?.data?.message || error.response?.data?.error;
        if (serverMessage) {
          onError(serverMessage);
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
