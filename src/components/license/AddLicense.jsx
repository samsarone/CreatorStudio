import React, { useState } from 'react';

export default function AddLicense() {
  const [licenseKey, setLicenseKey] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

  const handleSubmit = async () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(licenseKey)) {
      setError('Invalid license key format. Please enter a valid key.');
      return;
    }

    try {
      setError('');
      const res = await fetch(`${PROCESSOR_SERVER}/license/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: licenseKey })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to activate license');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message);
      setSubmitted(false);
    }
  };



  return (
    <div className="max-w-md mx-auto p-6 mt-10 bg-white dark:bg-zinc-900 shadow-lg rounded-xl">
      <h2 className="text-xl font-semibold mb-4 text-zinc-800 dark:text-zinc-100">
        Activate Your Professional License
      </h2>
      <p className="text-sm mb-4 text-zinc-600 dark:text-zinc-300">
        Enter your license key below to activate your professional license.
      </p>
      <input
        type="text"
        className="w-full px-4 py-2 mb-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
        placeholder="xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        value={licenseKey}
        onChange={(e) => setLicenseKey(e.target.value)}
      />
      {error && (
        <div className="text-red-500 text-sm mb-2">{error}</div>
      )}
      {submitted ? (
        <div className="text-green-600 text-sm font-medium">License activated successfully!</div>
      ) : (
        <button
          onClick={handleSubmit}
          className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
        >
          Activate License
        </button>
      )}
    </div>
  );
}
