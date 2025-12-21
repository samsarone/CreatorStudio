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

  const outerShell =
    colorMode === 'dark'
      ? 'bg-[#0b1021] text-slate-100'
      : 'bg-gradient-to-br from-[#e9edf7] via-[#eef3fb] to-white text-slate-900';
  const subtleGradient =
    colorMode === 'dark'
      ? 'bg-gradient-to-b from-[#080f21] via-[#0d1830] to-[#0b1226]'
      : 'bg-gradient-to-b from-[#eef3fb] via-[#e4ebf8] to-[#f7fbff]';
  return (
    <div className={`${outerShell} ${subtleGradient} min-h-screen`}>
      <OverflowContainer>
        <div className='container m-auto py-6 md:py-10'>
          <OneshotEditor />
        </div>
      </OverflowContainer>
    </div>
  )
}
