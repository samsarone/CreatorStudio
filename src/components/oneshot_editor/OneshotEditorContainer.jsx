import React, { useEffect } from 'react';
import OverflowContainer from '../common/OverflowContainer.tsx';
import { useParams, useNavigate } from 'react-router-dom';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import axios from 'axios';
import { getHeaders } from '../../utils/web';

import OneshotEditor from './OneshotEditor.jsx';
const API_SERVER = import.meta.env.VITE_PROCESSOR_API;
const CDN_URI = import.meta.env.VITE_STATIC_CDN_URL;

export default function OneshotEditorContainer() {

  const { id } = useParams();
  const navigate = useNavigate();

  const { colorMode } = useColorMode();

  useEffect(() => {

    if (!id) {
      const headers = getHeaders();
      axios.post(`${API_SERVER}/vidgenie/create_blank`, {}, headers).then(function (response) {
        const {sessionId} = response.data;
        navigate(`/vidgenie/${sessionId}`);
      });
    }
  }, []);

  useEffect(() => {


    if (id) {
      // navigate(`/vidgpt/quick_editor/${id}`);
    }
  }, [id]);

  const bgColor = colorMode === 'dark' ? 'bg-gray-900' : 'bg-gray-100';
  const textColor = colorMode === 'dark' ? 'text-gray-200' : 'text-gray-900';
  return (
    <div className={`${bgColor}`}>
      <OverflowContainer>
        <div className='container m-auto'>
          <OneshotEditor />
        </div>
      </OverflowContainer>
    </div>
  )
}