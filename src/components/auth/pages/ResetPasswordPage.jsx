// src/components/auth/ResetPasswordPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import OverflowContainer from '../../common/OverflowContainer.tsx'; // keep as‑is if TSX

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function ResetPasswordPage() {
  const navigate  = useNavigate();
  const location  = useLocation();

  /* ——— grab url params ——— */
  const params  = new URLSearchParams(location.search);
  const urlEmail = params.get('email') || '';          // ?email=jane@doe.com
  const urlCode  = params.get('code');                 // ?code=ABC123

  /* ——— component state ——— */
  const [email,           setEmail]           = useState(urlEmail);
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState(null);
  const [success,         setSuccess]         = useState(false);

  /* ——— form submit ——— */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // minimal checks
    if (!email)                     { setError('Email is required'); return; }
    if (!password)                  { setError('New password is required'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (!urlCode)                   { setError('Reset code is missing or invalid'); return; }

    try {
      setSubmitting(true);

      await axios.post(
        `${PROCESSOR_SERVER}/users/submit_reset_password`,
        { email, code: urlCode, password }      // <── include both email & code
      );

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Something went wrong';
      setError(msg);
      setSubmitting(false);
    }
  };

  /* ——— render ——— */
  return (
    <OverflowContainer>
      <div className="w-full flex flex-col items-center justify-center pt-20">
        <div className="bg-gray-800 text-white rounded-lg p-6 max-w-md w-full">
          <h1 className="text-2xl font-semibold text-center mb-6">
            Reset your password
          </h1>

          {error && (
            <div className="bg-red-600/20 text-red-300 rounded p-2 mb-4">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-green-400 text-center">
              ✔️ Password updated! Redirecting to login…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field (pre‑filled but editable) */}
              <div>
                <label className="block mb-1 text-sm">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-500"
                />
              </div>

              {/* New password */}
              <div>
                <label className="block mb-1 text-sm">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-500"
                />
              </div>

              {/* Confirm */}
              <div>
                <label className="block mb-1 text-sm">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full rounded bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full rounded py-2 font-medium
                            ${submitting ? 'bg-indigo-400' : 'bg-indigo-500 hover:bg-indigo-600'}
                            transition-colors`}
              >
                {submitting ? 'Submitting…' : 'Reset password'}
              </button>
            </form>
          )}

          {!success && (
            <div className="text-center mt-4">
              Remembered your password?{' '}
              <Link to="/login" className="underline">
                Log in
              </Link>
            </div>
          )}
        </div>
      </div>
    </OverflowContainer>
  );
}
