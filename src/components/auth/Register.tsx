import React, { useState, useEffect } from 'react';
import { FaGoogle } from 'react-icons/fa6';
import LoginButton from './LoginButton.tsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import './styles.css'; // Optional: remove if not needed

export default function Register(props) {
  const {
    setCurrentLoginView,
    registerWithGoogle,
    setUser,
    closeAlertDialog,
    getOrCreateUserSession,
    registerUserWithEmail,
    showLoginButton = true
  } = props;

  const { colorMode } = useColorMode();
  const formBgColor = colorMode === 'light' ? 'bg-white' : 'bg-neutral-900';
  const formTextColor = colorMode === 'light' ? 'text-neutral-800' : 'text-neutral-50';
  const inputBg = colorMode === 'light' ? 'bg-neutral-100' : 'bg-neutral-800';

  const [error, setError] = useState(null);
  const [isTermsChecked, setIsTermsChecked] = useState(true);
  const [is18Checked, setIs18Checked] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operator = ['+', '-'][Math.floor(Math.random() * 2)];
    const question = `${num1} ${operator} ${num2}`;
    let answer;
    if (operator === '+') {
      answer = num1 + num2;
    } else {
      answer = num1 - num2;
    }
    setCaptchaQuestion(question);
    setCaptchaAnswer(answer.toString());
  };

  const submitUserRegister = (evt) => {
    evt.preventDefault();
    if (!isTermsChecked) {
      setError('You must agree to the terms and conditions.');
      return;
    }
    if (!is18Checked) {
      setError('You must confirm that you are at least 18 years old.');
      return;
    }
    const email = evt.target.email.value.trim();
    const password = evt.target.password.value;
    const confirmPassword = evt.target.confirmPassword.value;
    const username = evt.target.username.value.trim();

    if (!email || !username || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const payload = { email, password, username };

    // Attempt registration
    registerUserWithEmail(
      payload,
      // Pass a callback (or you can use a promise/async) to handle server error
      (serverErrorMessage) => {
        setError(serverErrorMessage);
      }
    );

    // Example usage: you can remove if not used
    localStorage.setItem('isPaymentPopupVisible', 'true');
  };

  const handleRegisterWithGoogle = () => {
    if (!isTermsChecked) {
      alert('You must agree to the terms and conditions.');
      return;
    }
    if (!is18Checked) {
      alert('You must confirm that you are at least 18 years old.');
      return;
    }
    registerWithGoogle();
  };

  return (
    <div className={`flex items-center justify-center p-4 ${formBgColor} ${formTextColor}`}>
      <div className="w-full max-w-md rounded-lg shadow-lg p-6 pt-2">
        <h2 className="text-2xl font-bold text-center mb-6">Create a new Account</h2>

        {error && (
          <div className="text-red-500 text-center mb-4">
            {error}
          </div>
        )}

        {/* Register with Google */}
        <button
          type="button"
          onClick={handleRegisterWithGoogle}
          className="flex items-center justify-center w-full bg-neutral-900 text-neutral-100 py-3 rounded-lg mb-4 hover:bg-neutral-800 transition-colors border-2 border-neutral-600"
        >
          <FaGoogle className="mr-2 text-green-500" />
          <span className="font-semibold">Register with Google</span>
        </button>

        {/* OR separator */}
        <div className="flex items-center my-4">
          <hr className="flex-grow border-neutral-300" />
          <span className="px-2 text-sm text-neutral-500">OR</span>
          <hr className="flex-grow border-neutral-300" />
        </div>

        {/* Email Registration Form */}
        <form onSubmit={submitUserRegister}>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-bold" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              name="username"
              className={`w-full rounded-md px-3 py-2 ${inputBg} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Your username"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 text-sm font-bold" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              className={`w-full rounded-md px-3 py-2 ${inputBg} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 text-sm font-bold" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              className={`w-full rounded-md px-3 py-2 ${inputBg} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="••••••••"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 text-sm font-bold" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              className={`w-full rounded-md px-3 py-2 ${inputBg} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="••••••••"
            />
          </div>

          {/* Terms & Conditions */}
          <div className="flex items-center justify-center mt-4">
            <input
              type="checkbox"
              id="terms-checkbox"
              className="w-4 h-4 mr-2"
              checked={isTermsChecked}
              onChange={() => setIsTermsChecked(!isTermsChecked)}
            />
            <label htmlFor="terms-checkbox" className="text-sm leading-tight">
              Agree to our{' '}
              <a
                href="https://samsar.one/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                terms
              </a>{' '}
              and{' '}
              <a
                href="https://samsar.one/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                privacy policy
              </a>
              .
            </label>
          </div>

          {/* Age Confirmation */}
          <div className="flex items-center justify-center mt-2">
            <input
              type="checkbox"
              id="age-checkbox"
              className="w-4 h-4 mr-2"
              checked={is18Checked}
              onChange={() => setIs18Checked(!is18Checked)}
            />
            <label htmlFor="age-checkbox" className="text-sm leading-tight">
              You are at least 18 years old
            </label>
          </div>

          <div className="mt-2">
            <LoginButton type="submit" className="w-full">
              Register
            </LoginButton>
          </div>
        </form>

        {/* Switch to Login */}
        {showLoginButton && (
          <div className="text-center mt-6">
            <p className="text-sm mb-2">Already have an account?</p>
            <LoginButton onClick={() => setCurrentLoginView('login')}>
              Login
            </LoginButton>
          </div>
        )}
      </div>
    </div>
  );
}
