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
      ? 'bg-slate-950 text-slate-100'
      : 'bg-gradient-to-br from-white via-slate-50 to-sky-50 text-slate-900';
  const subtleGradient =
    colorMode === 'dark'
      ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950'
      : 'bg-gradient-to-b from-white via-sky-50 to-slate-100';
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
