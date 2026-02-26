import React, { useState } from 'react';
import { FaGoogle } from 'react-icons/fa6';
import LoginButton from './LoginButton.tsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { persistAuthToken } from '../../utils/web';

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
        persistAuthToken(authToken);
        setUser(userData);
        closeAlertDialog();
        getOrCreateUserSession();
      })
      .catch((err) => {
        if (err.response && err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError('Invalid email or password. Please try again.');
        }
      });
  };

  const cardClasses =
    colorMode === 'light'
      ? 'bg-white text-slate-900 border border-slate-200 shadow-lg'
      : 'bg-slate-950 text-slate-100 border border-slate-800 shadow-xl';
  const tabBase =
    'px-3 py-1.5 text-xs font-semibold rounded-full transition focus:outline-none focus:ring-2 focus:ring-blue-500/40';
  const tabActive = colorMode === 'light' ? 'bg-blue-600 text-white' : 'bg-blue-500/20 text-blue-200';
  const tabInactive =
    colorMode === 'light'
      ? 'text-slate-500 hover:text-slate-900'
      : 'text-slate-400 hover:text-slate-100';

  const inputClasses =
    colorMode === 'light'
      ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-200'
      : 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-500/30';

  const googleButtonClasses =
    colorMode === 'light'
      ? 'bg-white text-slate-900 border border-slate-200 hover:border-blue-400/70 hover:bg-slate-50'
      : 'bg-slate-900 text-slate-100 border border-slate-700 hover:border-blue-400/60 hover:bg-slate-800';

  return (
    <div className={`w-full max-w-md rounded-2xl p-6 space-y-5 ${cardClasses}`}>
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-semibold">Welcome back</h2>
        <p className="text-xs text-slate-400">Sign in to continue</p>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-slate-300/30 bg-black/5 p-1">
          <button type="button" className={`${tabBase} ${tabActive}`}>
            Login
          </button>
          <button
            type="button"
            className={`${tabBase} ${tabInactive}`}
            onClick={() => setCurrentLoginView('register')}
          >
            Sign up
          </button>
        </div>
      </div>

      {error && <div className="text-red-500 text-center text-sm">{error}</div>}

      <button
        className={`flex items-center justify-center w-full py-3 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${googleButtonClasses}`}
        onClick={signInWithGoogle}
      >
        <FaGoogle className="inline-block mr-2 text-blue-600" />
        <span className="font-semibold">Continue with Google</span>
      </button>

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-slate-400">
        <span className="flex-1 h-px bg-slate-300/50" />
        <span>OR</span>
        <span className="flex-1 h-px bg-slate-300/50" />
      </div>

      <form onSubmit={submitUserLogin} className="space-y-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold">Email</div>
          <input
            type="email"
            name="email"
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${inputClasses}`}
            placeholder="Email"
          />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold">Password</div>
          <input
            type="password"
            name="password"
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${inputClasses}`}
            placeholder="Password"
          />
        </div>
        <LoginButton type="submit" extraClasses="w-full">Login</LoginButton>
      </form>

      <div className="text-center text-xs text-slate-500">
        <Link to="/forgot_password" className="text-blue-600 hover:underline">
          Forgot password?
        </Link>
      </div>

      {showSignupButton && (
        <div className="text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => setCurrentLoginView('register')}
            className="text-blue-500 hover:underline"
          >
            Sign up
          </button>
        </div>
      )}
    </div>
  );
}
