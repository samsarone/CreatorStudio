import React, { useEffect, useState } from 'react';
import { useColorMode } from '../../../contexts/ColorMode.jsx';
import axios from 'axios';
import { Link } from 'react-router-dom';
import OverflowContainer from '../../common/OverflowContainer.tsx';

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

const translations = {
  en: {
    title: 'Forgot Password',
    intro: 'Enter your email address below to reset your password.',
    emailLabel: 'Email',
    submit: 'Reset Password',
    success: 'Check your email for password reset instructions.',
    error: 'Failed to send reset email. Please try again.',
    back: 'Back to Login',
    language: 'Language',
  },
  es: {
    title: 'Olvidaste tu contraseña',
    intro: 'Ingresa tu correo electrónico para restablecer tu contraseña.',
    emailLabel: 'Correo electrónico',
    submit: 'Restablecer contraseña',
    success: 'Revisa tu correo para las instrucciones de restablecimiento.',
    error: 'No se pudo enviar el correo. Inténtalo nuevamente.',
    back: 'Volver al inicio de sesión',
    language: 'Idioma',
  },
  fr: {
    title: 'Mot de passe oublié',
    intro: 'Entrez votre adresse e-mail pour réinitialiser votre mot de passe.',
    emailLabel: 'E-mail',
    submit: 'Réinitialiser le mot de passe',
    success: 'Vérifiez vos e-mails pour les instructions.',
    error: "Impossible d'envoyer l'e-mail. Veuillez réessayer.",
    back: 'Retour à la connexion',
    language: 'Langue',
  },
};

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
];

const getInitialLanguage = () => {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('preferredLanguage') : null;
  const browser = typeof navigator !== 'undefined' && navigator.language ? navigator.language.split('-')[0] : null;
  return (saved || browser || 'en').toLowerCase();
};

export default function ForgotPassword(props) {
  const { setCurrentLoginView } = props;
  const { colorMode } = useColorMode();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [language, setLanguage] = useState(getInitialLanguage());

  const formBgColor = colorMode === 'light' ? 'bg-neutral-50' : 'bg-neutral-900';
  const formTextColor = colorMode === 'light' ? 'text-neutral-900' : 'text-neutral-50';
  const copy = translations[language] || translations.en;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLanguage', language);
    }
  }, [language]);

  const handleForgotPassword = (e) => {
    e.preventDefault();
    const email = e.target.email.value;

    axios
      .post(`${PROCESSOR_SERVER}/users/forgot_password`, { email, language })
      .then(() => {
        setSuccess(copy.success);
        setError(null);
      })
      .catch((err) => {
        
        setError(copy.error);
        setSuccess(null);
      });
  };

  return (
    <OverflowContainer>
    <div className={`w-[300px] m-auto mt-16`}>
      <div className={`text-center font-bold text-2xl mb-4 ${formTextColor}`}>{copy.title}</div>
      {error && <div className="text-red-500 text-center mb-4">{error}</div>}
      {success && <div className="text-blue-500 text-center mb-4">{success}</div>}
      <div className="mb-4">
        <label className="block text-sm mb-1 text-neutral-400">{copy.language}</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full rounded-lg p-2 bg-neutral-800 text-white"
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-neutral-400 text-center mb-6">{copy.intro}</p>
      <form onSubmit={handleForgotPassword} className={`w-full ${formTextColor}` }>
        <div className="form-group">
          <div className="text-xs text-left font-bold pl-1">{copy.emailLabel}</div>
          <input
            type="email"
            name="email"
            className={`form-control mb-4 mt-2 rounded-lg p-1 pl-4 h-[45px] w-full ${formBgColor} ${formTextColor}`}
            placeholder={copy.emailLabel}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg"
        >
          {copy.submit}
        </button>
      </form>
      <div className="mt-4 text-center text-xs text-neutral-500">
        <Link to="/login" className="text-blue-500 hover:text-blue-600">
          {copy.back}
        </Link>
      </div>
    </div>
    </OverflowContainer>
  );
}
