import React, { useState, useEffect } from 'react';
import { FaGoogle } from 'react-icons/fa6';
import LoginButton from './LoginButton.tsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import { useLocalization } from '../../contexts/LocalizationContext.jsx';
import { SUPPORTED_LANGUAGES } from '../../constants/supportedLanguages.js';

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
  const { t, language } = useLocalization();

  const [error, setError] = useState(null);
  const [isTermsChecked, setIsTermsChecked] = useState(true);
  const [is18Checked, setIs18Checked] = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState(language || 'en');

  useEffect(() => {
    if (language) {
      setPreferredLanguage(language);
    }
  }, [language]);

  const cardClasses =
    colorMode === 'light'
      ? 'bg-white text-slate-900 border border-slate-200 shadow-lg'
      : 'bg-slate-950 text-slate-100 border border-slate-800 shadow-xl';
  const tabBase =
    'rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/40';
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

  const fieldClasses = 'space-y-1';
  const labelClasses = 'block text-xs font-semibold';
  const controlClasses = `w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${inputClasses}`;

  const validateRegistrationChecks = () => {
    if (!is18Checked) {
      setError('Please confirm you are 18 years or older.');
      return false;
    }

    return true;
  };

  const submitUserRegister = (evt) => {
    evt.preventDefault();
    if (!isTermsChecked) {
      setError('You must agree to the terms and conditions.');
      return;
    }

    if (!validateRegistrationChecks()) {
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

    setError(null);
    const payload = { email, password, username, preferredLanguage };

    registerUserWithEmail(payload, (serverErrorMessage) => {
      setError(serverErrorMessage);
    });

    localStorage.setItem('isPaymentPopupVisible', 'true');
  };

  const handleRegisterWithGoogle = () => {
    if (!isTermsChecked) {
      setError('You must agree to the terms and conditions.');
      return;
    }

    if (!validateRegistrationChecks()) {
      return;
    }

    setError(null);
    registerWithGoogle();
  };

  const ageConfirmationLabel = t(
    'common.auth.ageConfirmation',
    {},
    'I am 18 years or older'
  );

  return (
    <div className={`w-full max-w-[440px] rounded-lg p-4 sm:p-5 space-y-4 ${cardClasses}`}>
      <div className="text-center">
        <h2 className="text-xl font-semibold">Create your account</h2>
      </div>

      <div className="grid grid-cols-2 rounded-lg border border-slate-300/30 bg-black/5 p-1">
        <button
          type="button"
          className={`${tabBase} ${tabInactive}`}
          onClick={() => setCurrentLoginView('login')}
        >
          Login
        </button>
        <button type="button" className={`${tabBase} ${tabActive}`}>
          Sign up
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-center text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleRegisterWithGoogle}
        className={`flex items-center justify-center w-full rounded-md py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${googleButtonClasses}`}
        aria-label="Register with Google"
      >
        <FaGoogle className="mr-2 text-blue-500" />
        <span className="font-semibold">Sign up with Google</span>
      </button>

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-slate-400">
        <span className="flex-1 h-px bg-slate-300/50" />
        <span>OR</span>
        <span className="flex-1 h-px bg-slate-300/50" />
      </div>

      <form onSubmit={submitUserRegister} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={fieldClasses}>
            <label htmlFor="username" className={labelClasses}>
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              className={controlClasses}
              placeholder="Your username"
              required
            />
          </div>

          <div className={fieldClasses}>
            <label htmlFor="email" className={labelClasses}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={controlClasses}
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={fieldClasses}>
            <label htmlFor="password" className={labelClasses}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              className={controlClasses}
              placeholder="Password"
              required
            />
          </div>

          <div className={fieldClasses}>
            <label htmlFor="confirmPassword" className={labelClasses}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              className={controlClasses}
              placeholder="Confirm password"
              required
            />
          </div>
        </div>

        <div className={fieldClasses}>
          <label htmlFor="preferredLanguage" className={labelClasses}>
            Preferred Language
          </label>
          <select
            id="preferredLanguage"
            name="preferredLanguage"
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className={controlClasses}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <input
              id="age-checkbox"
              type="checkbox"
              checked={is18Checked}
              onChange={() => setIs18Checked(!is18Checked)}
              className="mt-0.5 h-4 w-4 outline outline-1 outline-neutral-300 focus:outline-2 focus:outline-blue-500"
            />
            <label htmlFor="age-checkbox" className="text-xs leading-snug">
              {ageConfirmationLabel}
            </label>
          </div>

          <div className="flex items-start gap-2">
            <input
              id="terms-checkbox"
              type="checkbox"
              checked={isTermsChecked}
              onChange={() => setIsTermsChecked(!isTermsChecked)}
              className="mt-0.5 h-4 w-4 outline outline-1 outline-neutral-300 focus:outline-2 focus:outline-blue-500"
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
        </div>

        <LoginButton type="submit" extraClasses="w-full">
          Register
        </LoginButton>
      </form>

      {showLoginButton && (
        <div className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => setCurrentLoginView('login')}
            className="text-blue-500 hover:underline"
          >
            Login
          </button>
        </div>
      )}
    </div>
  );
}
