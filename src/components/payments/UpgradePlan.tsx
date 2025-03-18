import React, { useState } from 'react';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext.jsx';
import { getHeaders } from '../../utils/web.jsx';
import { FaTimes } from 'react-icons/fa';
import { useAlertDialog } from '../../contexts/AlertDialogContext.jsx';
import SecondaryButton from '../common/SecondaryButton.tsx';

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function UpgradePlan() {
  const { user } = useUser();
  const { closeAlertDialog } = useAlertDialog();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const startFreeTrial = async () => {
    // 1) Open a blank tab immediately (in the same call stack as the button click).
    const trialWindow = window.open('', '_blank');
    
    try {
      if (!user || !user._id) {
        console.error('User not found');
        // Optionally close the blank tab if there's no user
        if (trialWindow && !trialWindow.closed) {
          trialWindow.close();
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      // You can store or track any required state before redirecting
      localStorage.setItem("setShowSetPaymentFlow", "false");

      // Adjust the payload according to your backend’s expected format
      const payload = {
        email: user.email,
        plan: 'free_trial', // or however your backend expects the plan name
      };

      const headers = getHeaders();
      const { data: response } = await axios.post(
        `${PROCESSOR_SERVER}/users/start_free_trial`,
        payload,
        headers
      );

      // 2) Once you have the URL, redirect the newly opened tab
      if (trialWindow && !trialWindow.closed) {
        trialWindow.location.href = response.url;
      }
    } catch (error) {
      console.error('Start free trial error:', error);
      setErrorMessage('Failed to start the free trial. Please try again.');
      
      // Close the blank tab if there’s an error
      if (trialWindow && !trialWindow.closed) {
        trialWindow.close();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const upgradePlan = async () => {
    // 1) Open a blank tab immediately (in the same call stack as the button click).
    const upgradeWindow = window.open('', '_blank');

    try {
      if (!user || !user._id) {
        console.error('User not found');
        // Optionally close the blank tab if there's no user
        if (upgradeWindow && !upgradeWindow.closed) {
          upgradeWindow.close();
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      // You can store or track any required state before redirecting
      localStorage.setItem("setShowSetPaymentFlow", "false");

      // Adjust the payload according to your backend’s expected format
      const payload = {
        email: user.email,
        plan: 'creator', // or however your backend expects the plan name
      };

      const headers = getHeaders();
      const { data } = await axios.post(
        `${PROCESSOR_SERVER}/users/upgrade_plan`,
        payload,
        headers
      );

      // 2) Redirect the newly opened tab
      if (upgradeWindow && !upgradeWindow.closed) {
        upgradeWindow.location.href = data.url;
      }
    } catch (error) {
      console.error('Upgrade plan error:', error);
      setErrorMessage('Failed to upgrade the plan. Please try again.');

      // Close the blank tab if there’s an error
      if (upgradeWindow && !upgradeWindow.closed) {
        upgradeWindow.close();
      }
    } finally {
      setIsLoading(false);
    }
  };

  let freeTrialButton = null;
  if (user && !user.hasUserChosenPaymentMethod && !user.hasFreeTrialClaimed) {
    freeTrialButton = (
      <div className='mt-4 mb-2'>
        <div className="text-center text-gray-300 text-sm mb-2">
          Just want to try it out? Start a 15 day free trial.
        </div>
        <SecondaryButton onClick={startFreeTrial} isPending={isLoading}>
          Start Free Trial
        </SecondaryButton>
      </div>
    );
  }

  return (
    <div className="relative max-w-2xl mx-auto p-6 bg-gray-900 text-neutral-100 rounded-md shadow-lg">
      {/* Close dialog icon */}
      <FaTimes
        className="absolute top-2 right-2 cursor-pointer"
        onClick={closeAlertDialog}
      />

      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold">Upgrade to Creators Plan</h1>
        <p className="mt-2 text-gray-300">
          Priced at $49.99/month.
        </p>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">What’s included:</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>5,000 credits per month</li>
          <li>Access to all models</li>
          <li>Full generative workflow suite</li>
          <li>Free Cloud storage for renders up to 50GB</li>
          <li>Commercial usage rights</li>
          <li>No watermarks</li>
          <li>Discord support</li>
        </ul>
      </div>

      {errorMessage && (
        <div className="text-center text-red-500 text-sm mb-4">
          {errorMessage}
        </div>
      )}

      <button
        onClick={upgradePlan}
        disabled={isLoading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold text-white disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : 'Upgrade to Creators Plan'}
      </button>
      {freeTrialButton}
    </div>
  );
}
