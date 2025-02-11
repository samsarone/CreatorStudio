import React, { useEffect } from 'react';
import { FaS, FaSpinner } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import Loader from '../common/Loader';


export default function VerificationHome() {
  const navigate = useNavigate();

  const query = new URLSearchParams(window.location.search);
  const authToken = query.get('authToken');
  useEffect(() => {
    if (authToken) {
      localStorage.setItem('authToken', authToken);
      const channel = new BroadcastChannel('oauth_channel');
      channel.postMessage('oauth_complete');
      window.close();

    }
  }, [authToken]);

  if (!authToken) {
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