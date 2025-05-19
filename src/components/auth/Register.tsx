import React, { useState, useEffect } from 'react';
import { FaGoogle } from 'react-icons/fa6';
import LoginButton from './LoginButton.tsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
// styles.css import removed – Tailwind handles all styling

export default function Register(props) {
  const {
    setCurrentLoginView,
    registerWithGoogle,
    setUser,
    closeAlertDialog,
    getOrCreateUserSession,
    registerUserWithEmail,
    showLoginButton = true,
  } = props;

  const { colorMode } = useColorMode();
  const formBgColor = colorMode === 'light' ? 'bg-white' : 'bg-gray-900';
  const formTextColor = colorMode === 'light' ? 'text-neutral-800' : 'text-neutral-50';
  const inputBg = colorMode === 'light' ? 'bg-neutral-100' : 'bg-gray-800';

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
    const answer = operator === '+' ? num1 + num2 : num1 - num2;
    setCaptchaQuestion(question);
    setCaptchaAnswer(answer.toString());
  };

  const inputClasses =
    `w-full rounded-md px-3 py-2 ${inputBg} outline outline-1 outline-neutral-300 ` +
    `focus:outline-2 focus:outline-blue-500 placeholder:text-neutral-500`;

  const submitUserRegister = (evt) => {
    evt.preventDefault();
    if (!isTermsChecked) {
      setError('You must agree to the terms and conditions.');
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

    registerUserWithEmail(payload, (serverErrorMessage) => {
      setError(serverErrorMessage);
    });

    localStorage.setItem('isPaymentPopupVisible', 'true');
  };

  const handleRegisterWithGoogle = () => {
    if (!isTermsChecked) {
      alert('You must agree to the terms and conditions.');
      return;
    }

    registerWithGoogle();
  };

  return (
    <div>      
      <div className={`w-full max-w-md ${formBgColor} rounded-lg shadow-lg p-8 space-y-6`}>
        <h2 className="text-2xl font-bold text-center">Create a new Account</h2>

        {error && <p className="text-red-500 text-center" role="alert">{error}</p>}

        {/* Register with Google */}
        <button
          type="button"
          onClick={handleRegisterWithGoogle}
          className="flex items-center justify-center w-full text-neutral-100 py-3 rounded-lg hover:bg-gray-800 transition-colors border border-neutral-600 outline outline-1 outline-neutral-300 focus:outline-2 focus:outline-blue-500"
          aria-label="Register with Google"
        >
          <FaGoogle className="mr-2 text-blue-500" />
          <span className="font-semibold">Register with Google</span>
        </button>

        {/* OR separator */}
        <div className="flex items-center">
          <hr className="flex-grow border-neutral-300" />
          <span className="px-2 text-xs text-neutral-500">OR</span>
          <hr className="flex-grow border-neutral-300" />
        </div>

        {/* Email Registration Form */}
        <form onSubmit={submitUserRegister} className="space-y-4">
          <div>
            <label htmlFor="username" className="block mb-1 text-sm font-semibold">
              Username
            </label>
            <input id="username" name="username" type="text" className={inputClasses} placeholder="Your username" />
          </div>

          <div>
            <label htmlFor="email" className="block mb-1 text-sm font-semibold">
              Email
            </label>
            <input id="email" name="email" type="email" className={inputClasses} placeholder="you@example.com" />
          </div>

          <div>
            <label htmlFor="password" className="block mb-1 text-sm font-semibold">
              Password
            </label>
            <input id="password" name="password" type="password" className={inputClasses} placeholder="••••••••" />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block mb-1 text-sm font-semibold">
              Confirm Password
            </label>
            <input id="confirmPassword" name="confirmPassword" type="password" className={inputClasses} placeholder="••••••••" />
          </div>

          {/* Terms & Conditions */}
          <div className="flex items-start gap-2 pt-2">
            <input
              id="terms-checkbox"
              type="checkbox"
              checked={isTermsChecked}
              onChange={() => setIsTermsChecked(!isTermsChecked)}
              className="mt-1 w-4 h-4 outline outline-1 outline-neutral-300 focus:outline-2 focus:outline-blue-500"
            />
            <label htmlFor="terms-checkbox" className="text-xs leading-snug">
              I agree to the{' '}
              <a href="https://samsar.one/terms" target="_blank" rel="noopener noreferrer" className="underline">
                terms
              </a>{' '}
              &{' '}
              <a href="https://samsar.one/privacy" target="_blank" rel="noopener noreferrer" className="underline">
                privacy policy
              </a>
              .
            </label>
          </div>

          <LoginButton type="submit" className="w-full">
            Register
          </LoginButton>
        </form>

        {/* Switch to Login */}
        {showLoginButton && (
          <div className="text-center">
            <p className="text-sm mb-1">Already have an account?</p>
            <LoginButton onClick={() => setCurrentLoginView('login')}>Login</LoginButton>
          </div>
        )}
      </div>
    </div>
  );
}
