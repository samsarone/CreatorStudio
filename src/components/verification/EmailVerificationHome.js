import React, { useEffect } from 'react';
import axios from 'axios';
import OverflowContainer from '../common/OverflowContainer.tsx';
import { FaSpinner } from 'react-icons/fa6';

const PROCESSOR_API = process.env.REACT_APP_PROCESSOR_API;

export default function EmailVerificationHome() {
  useEffect(() => {
    // fetch the verification code from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const verificationCode = urlParams.get('code');
    const email = urlParams.get('email');
    console.log(verificationCode);

    // send the verification code to the server
    const payload = {
      verificationCode,
      email,
    };

    axios.post(`${PROCESSOR_API}/users/verify_email`, payload).then(function(dataRes) {
      const response = dataRes.data;
      if (response && response.authToken) {
        localStorage.setItem('authToken', response.authToken);
        window.location.href = '/';
      }
    });

  }, []);
  
  return (
    <OverflowContainer>
      <div className='bg-gray-800 h-[100vh] w-full align-center pt-[60px]'>
      <div className='text-neutral-100 text-lg'>
        <FaSpinner className='animate-spin inline-flex mr-2' />
        Verifying email</div>
      </div>
     

    </OverflowContainer>  
  )
}