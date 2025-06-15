import React, { useState } from 'react';
import { FaGoogle } from 'react-icons/fa6';
import LoginButton from './LoginButton.tsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';

import { Link } from 'react-router-dom';

import axios from 'axios';

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function Login(props) {
  const {
    setCurrentLoginView,
    signInWithGoogle,
    setUser,
    closeAlertDialog,
    getOrCreateUserSession,
    showSignupButton = true
  } = props;

  const { colorMode } = useColorMode();
  const [error, setError] = useState(null);

  const submitUserLogin = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const payload = { email, password };

    axios
      .post(`${PROCESSOR_SERVER}/users/login`, payload)
      .then((dataRes) => {
        const userData = dataRes.data;
        const authToken = userData.authToken;
        localStorage.setItem('authToken', authToken);
        setUser(userData);
        closeAlertDialog();
        getOrCreateUserSession();
      })
      .catch((err) => {
        console.error('Error during user login:', err);

        // Attempt to grab server error message
        if (err.response && err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError('Invalid email or password. Please try again.');
        }
      });
  };

  const formBgColor = colorMode === 'light' ? 'bg-neutral-50' : 'bg-neutral-900';
  const formTextColor = colorMode === 'light' ? 'text-neutral-900' : 'text-neutral-50';

  return (
    <div>
      <div>
        <div className="mt-2 mb-4 text-center font-bold text-2xl">Please Login To Continue</div>
        {error && <div className="text-red-500 text-center">{error}</div>}

        {/* Google Sign-in Button */}
        <div className="flex flex-row text-center mb-4">
          <div className="basis-full pl-4 pr-4">
            <div
              className="bg-neutral-900 text-neutral-100 p-2 rounded-lg cursor-pointer h-[50px] text-center m-auto"
              onClick={signInWithGoogle}
            >
              <div className="text-center text-lg font-bold pt-[2px]">
                <FaGoogle className="inline-block mr-2 mb-1 text-blue-600" />
                <div className="inline-block">Login with Google</div>
              </div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="flex items-center justify-center mb-4">
          <hr className="w-1/4 border-neutral-300" />
          <span className="mx-2 text-neutral-500">OR</span>
          <hr className="w-1/4 border-neutral-300" />
        </div>

        {/* Email Login Form */}
        <form onSubmit={submitUserLogin} className="w-[250px] m-auto">
          <div className="form-group">
            <div className="text-xs text-left font-bold pl-1">Email</div>
            <input
              type="email"
              name="email"
              className={`form-control mb-2 mt-2 rounded-lg p-1 pl-4 h-[45px] w-full ${formBgColor} ${formTextColor}`}
              placeholder="Email"
            />
          </div>
          <div className="form-group">
            <div className="text-xs text-left font-bold pl-1">Password</div>
            <input
              type="password"
              name="password"
              className={`form-control mb-2 mt-2 rounded-lg p-1 pl-4 h-[45px] w-full ${formBgColor} ${formTextColor}`}
              placeholder="Password"
            />
          </div>
          <div className="mt-2 mb-2">
            <LoginButton type="submit">Login</LoginButton>
          </div>
        </form>
        <div>
          <div className="text-center text-xs text-neutral-500">
          <Link to="/forgot_password" className="text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        {showSignupButton && (
          <div>
            <div className="mt-4 mb-4 text-center font-bold">Don't have an account?</div>
            <div className="text-center">
              <LoginButton onClick={() => setCurrentLoginView('register')}>Sign up</LoginButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
