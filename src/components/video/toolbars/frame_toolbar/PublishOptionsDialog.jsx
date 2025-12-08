// PublishOptionsDialog.js
import React, { useState } from 'react';
import axios from 'axios';
import { getHeaders } from '../../../../utils/web';

const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;

export default function PublishOptionsDialog(props) {
  const { onSubmit, onClose, extraProps } = props;

  const [sessionMetadata, setSessionMetadata] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  const generateMeta = async () => {
    try {
      const sessionId = extraProps.sessionId;
      const payload = { sessionId: sessionId };
      const headers = getHeaders();
      const resData = await axios.post(
        `${PROCESSOR_API_URL}/video_sessions/generate_meta`,
        payload,
        headers
      );

      const sessionMeta = resData.data;
      setSessionMetadata(sessionMeta);

      // Populate fields if present
      setTitle(sessionMeta.title || '');
      setDescription(sessionMeta.description || '');
      // Convert tags array to a comma-separated string if present
      setTags(sessionMeta.tags ? sessionMeta.tags.join(', ') : '');
    } catch (error) {
      
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ title, description, tags, id: extraProps.sessionId });
  };

  return (
    <div className="p-4 w-full max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-white">Publish Options</h2>
        {/* Button in the top-right corner */}
        <button
          type="button"
          onClick={generateMeta}
          className="px-3 py-1 rounded text-sm bg-blue-600 text-white"
        >
          Generate Meta
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1 text-white">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-600 rounded p-1 bg-gray-800 text-white"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1 text-white">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-600 rounded p-1 bg-gray-800 text-white"
            rows={3}
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1 text-white">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full border border-gray-600 rounded p-1 bg-gray-800 text-white"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="mr-2 px-3 py-1 rounded text-sm bg-gray-700 text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 rounded text-sm bg-blue-600 text-white"
          >
            Publish
          </button>
        </div>
      </form>
    </div>
  );
}
