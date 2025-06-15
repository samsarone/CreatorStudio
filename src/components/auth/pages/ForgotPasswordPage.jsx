import React, { useState } from 'react';
import { useColorMode } from '../../../contexts/ColorMode.jsx';
import axios from 'axios';
import { Link } from 'react-router-dom';
import OverflowContainer from '../../common/OverflowContainer.tsx';

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function ForgotPassword(props) {
  const { setCurrentLoginView } = props;
  const { colorMode } = useColorMode();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const formBgColor = colorMode === 'light' ? 'bg-neutral-50' : 'bg-neutral-900';
  const formTextColor = colorMode === 'light' ? 'text-neutral-900' : 'text-neutral-50';

  const handleForgotPassword = (e) => {
    e.preventDefault();
    const email = e.target.email.value;

    axios
      .post(`${PROCESSOR_SERVER}/users/forgot_password`, { email })
      .then(() => {
        setSuccess('Check your email for password reset instructions.');
        setError(null);
      })
      .catch((err) => {
        console.error('Error sending password reset email:', err);
        setError('Failed to send reset email. Please try again.');
        setSuccess(null);
      });
  };

  return (
    <OverflowContainer>
    <div className={`w-[300px] m-auto mt-16`}>
      <div className={`text-center font-bold text-2xl mb-4 ${formTextColor}`}>Forgot Password</div>
      {error && <div className="text-red-500 text-center mb-4">{error}</div>}
      {success && <div className="text-blue-500 text-center mb-4">{success}</div>}
      <p className="text-neutral-400 text-center mb-6">
        Enter your email address below to reset your password.
      </p>
      <form onSubmit={handleForgotPassword} className={`w-full ${formTextColor}` }>
        <div className="form-group">
          <input
            type="email"
            name="email"
            className={`form-control mb-4 mt-2 rounded-lg p-1 pl-4 h-[45px] w-full ${formBgColor} ${formTextColor}`}
            placeholder="Email"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg"
        >
          Reset Password
        </button>
      </form>
      <div className="mt-4 text-center text-xs text-neutral-500">
        <Link to="/login" className="text-blue-500 hover:text-blue-600">
          Back to Login
        </Link>
      </div>
    </div>
    </OverflowContainer>
  );
}
