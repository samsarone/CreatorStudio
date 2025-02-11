import React, { useState, useEffect } from 'react';
import { FaGoogle } from 'react-icons/fa6';
import LoginButton from './LoginButton.tsx';
import { useColorMode } from '../../contexts/ColorMode.js';
import axios from 'axios';
import './styles.css'; // Import the custom styles

const PROCESSOR_SERVER = process.env.REACT_APP_PROCESSOR_API;

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
  const formBgColor = colorMode === 'light' ? 'bg-neutral-50' : 'bg-neutral-900';
  const formTextColor = colorMode === 'light' ? 'text-neutral-900' : 'text-neutral-50';
  const [error, setError] = useState(null);
  const [isTermsChecked, setIsTermsChecked] = useState(true);
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
      setError('You must agree to the terms and conditions');
      return;
    }
    const email = evt.target.email.value;
    const password = evt.target.password.value;
    const confirmPassword = evt.target.confirmPassword.value;
    const username = evt.target.username.value;
    const captchaInput = evt.target.captcha.value;
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!email || !password || !username) {
      setError('All fields are required');
      return;
    }
    if (!captchaInput) {
      setError('Please solve the CAPTCHA');
      return;
    }
    if (captchaInput !== captchaAnswer) {
      setError('CAPTCHA answer is incorrect');
      generateCaptcha(); // Generate a new CAPTCHA
      return;
    }
    const payload = { email, password, username };

    registerUserWithEmail(payload);

    localStorage.setItem('isPaymentPopupVisible', 'true');
  };

  const handleRegisterWithGoogle = () => {
    if (!isTermsChecked) {
      alert('You must agree to the terms and conditions');
      return;
    }
    registerWithGoogle();
  };

  return (
    <div>
      <div>
        <div className="mt-2 mb-4 text-center font-bold text-2xl">Create a new Account</div>
        {error && <div className="text-red-500 text-center">{error}</div>}

        {/* Terms and Conditions centered with checkbox and text on the same line */}
        <div className="mt-2 mb-4 text-center m-auto">
          <div className="flex flex-row items-center justify-center m-auto text-sm text-center">
            <input
              type="checkbox"
              name="terms"
              className="custom-register-checkbox w-[30px] h-[30px]"
              checked={isTermsChecked}
              onChange={() => setIsTermsChecked(!isTermsChecked)}
            />
            <div className="pl-2 text-left">
              <p>
                By registering you agree to our&nbsp;
                <a
                  href="https://samsar.one/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  terms
                </a>
                </p>

                <p>
                &nbsp;and our&nbsp;
                <a
                  href="https://samsar.one/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  privacy policy
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Google Register Button */}
        <div className="flex flex-row text-center mb-4">
          <div className="basis-full pl-4 pr-4">
            <div
              className="bg-neutral-900 text-neutral-100 p-2 rounded-lg cursor-pointer h-[50px] text-center m-auto"
              onClick={handleRegisterWithGoogle}
            >
              <div className="text-center text-lg font-bold pt-[2px]">
                <FaGoogle className="inline-block mr-2 mb-1 text-green-600" />
                <div className="inline-block">Register with Google</div>
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

        {/* Email Registration Form */}
        <form onSubmit={submitUserRegister} className="w-[250px] m-auto">
          <div className="form-group">
            <div className="text-xs text-left font-bold pl-1">User Name</div>
            <input
              type="text"
              name="username"
              className={`form-control mb-2 mt-2 rounded-lg p-1 pl-4 h-[45px] w-full ${formBgColor} ${formTextColor}`}
              placeholder="User Name"
            />
          </div>
          <div className="form-group">
            <div className="text-xs text-left font-bold pl-1">Email</div>
            <input
              type="email"
              name="email"
              className={`form-control mb-2 mt-2 rounded-lg p-1 pl-4 h-[45px] w-full ${formBgColor} ${formTextColor}`}
              placeholder="Email"
            />
          </div>
          <div>
            <div className="text-xs text-left font-bold pl-1">Password</div>
            <input
              type="password"
              name="password"
              className={`form-control mb-2 mt-2 rounded-lg p-1 pl-4 h-[45px] w-full ${formBgColor} ${formTextColor}`}
              placeholder="Password"
            />
          </div>
          <div>
            <input
              type="password"
              name="confirmPassword"
              className={`form-control mb-2 mt-2 rounded-lg p-1 pl-4 h-[45px] w-full ${formBgColor} ${formTextColor}`}
              placeholder="Confirm Password"
            />
          </div>
          <div className="form-group">
            <div className="text-xs text-left font-bold pl-1">
              CAPTCHA: Solve {captchaQuestion}
            </div>
            <input
              type="text"
              name="captcha"
              className={`form-control mb-2 mt-2 rounded-lg p-1 pl-4 h-[45px] w-full ${formBgColor} ${formTextColor}`}
              placeholder="Your Answer"
            />
          </div>
          <div>
            <LoginButton type="submit">Register</LoginButton>
          </div>
        </form>
        {showLoginButton && (
        <div>
          <div className="mt-4 mb-4 text-center font-bold">
            Already have an account?
          </div>
          <div className="text-center">
            <LoginButton onClick={() => setCurrentLoginView('login')}>
              Login
            </LoginButton>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
