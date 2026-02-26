import React, { useEffect } from 'react';
import axios from 'axios';
import { FaSpinner } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import Loader from '../common/Loader';
import { persistAuthToken, consumePostAuthRedirect } from '../../utils/web';
import { useUser } from '../../contexts/UserContext.jsx';

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API || 'http://localhost:3002';

export default function VerificationHome() {
  const navigate = useNavigate();
  const { getUserAPI } = useUser();

  const query = new URLSearchParams(window.location.search);
  const authToken = query.get('authToken');
  const loginToken = query.get('loginToken');
  const redirectParam = query.get('redirect');
  const safeRedirect =
    typeof redirectParam === 'string' &&
    redirectParam.startsWith('/') &&
    !redirectParam.startsWith('//')
      ? redirectParam
      : null;
  useEffect(() => {
    const finalizeAuth = async (resolvedAuthToken: string) => {
      if (!resolvedAuthToken) {
        return;
      }

      persistAuthToken(resolvedAuthToken);

      const isPopup = typeof window !== 'undefined' && window.opener && window.opener !== window;
      if (isPopup) {
        const channel = new BroadcastChannel('oauth_channel');
        channel.postMessage('oauth_complete');
        window.close();
        return;
      }

      await getUserAPI();
      const storedRedirect = consumePostAuthRedirect();
      const redirectTarget = safeRedirect || storedRedirect;
      if (redirectTarget) {
        navigate(redirectTarget, { replace: true });
        return;
      }

      navigate('/', { replace: true });
    };

    if (authToken) {
      void finalizeAuth(authToken);
      return;
    }

    if (loginToken) {
      const exchangeLoginToken = async () => {
        try {
          const response = await axios.get(`${PROCESSOR_SERVER}/users/verify_token`, {
            params: { loginToken },
          });
          const resolvedAuthToken = response?.data?.authToken;
          if (resolvedAuthToken) {
            await finalizeAuth(resolvedAuthToken);
            return;
          }
        } catch (error) {
          
        }

        navigate('/', { replace: true });
      };

      void exchangeLoginToken();
    }
  }, [authToken, getUserAPI, loginToken, navigate, safeRedirect]);

  if (!authToken && !loginToken) {
    return <FaSpinner className="animate-spin" />;
  }

  return (
    <div className='bg-gray-800 h-full absolute w-full'>
      <div className='m-auto text-center min-w-16 h-full mt-8 text-neutral-100'>

        <div>
          Verification Completed.
        </div>
        <div className='m-auto'>
          Redirecting to Home 
          <Loader />
        </div>

      </div>
    </div>
  );
}
