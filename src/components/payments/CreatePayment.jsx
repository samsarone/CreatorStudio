import React, { useState } from 'react';
import OverflowContainer from '../common/OverflowContainer.tsx';
import UpgradePlan from './UpgradePlan.tsx';
import AddCreditsDialog from '../account/AddCreditsDialog.jsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';

export default function CreatePayment() {
  const [selectedTab, setSelectedTab] = useState('upgradePlan');
  const { colorMode } = useColorMode();

  // Helper function to derive button styles based on selection and theme
  const getButtonClass = (isActive) => {
    const baseClasses = `px-4 py-2 rounded transition-colors duration-150 focus:outline-none`;
    if (isActive) {
      // Active / Selected button styles
      return colorMode === 'dark'
        ? `${baseClasses} bg-indigo-500 text-white hover:bg-indigo-600`
        : `${baseClasses} bg-indigo-600 text-white hover:bg-indigo-700`;
    } else {
      // Inactive / Unselected button styles
      return colorMode === 'dark'
        ? `${baseClasses} bg-gray-700 text-gray-300 hover:bg-gray-600`
        : `${baseClasses} bg-gray-200 text-gray-700 hover:bg-gray-300`;
    }
  };

  return (
    <OverflowContainer>
      {/* Page background + text color based on colorMode */}
      <div
        className={`min-h-screen pt-16 ${
          colorMode === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
        }`}
      >
        {/* Centered container so it doesn't span the entire width */}
        <div className="max-w-2xl mx-auto w-full px-4">
          {/* Top toggle + link row */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setSelectedTab('upgradePlan')}
                className={getButtonClass(selectedTab === 'upgradePlan')}
              >
                Upgrade Plan
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab('purchaseCredits')}
                className={getButtonClass(selectedTab === 'purchaseCredits')}
              >
                Purchase Credits
              </button>
            </div>

            <a
              href="https://docs.samsar.one/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className={`underline ${
                colorMode === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'
              }`}
            >
              Pricing
            </a>
          </div>

          {/* Content section with a modern card look */}
          <div
            className={`mt-4 p-4 rounded-lg shadow-md ${
              colorMode === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            }`}
          >
            {selectedTab === 'upgradePlan' ? (
              <UpgradePlan />
            ) : (
              <AddCreditsDialog />
            )}
          </div>
        </div>
      </div>
    </OverflowContainer>
  );
}
