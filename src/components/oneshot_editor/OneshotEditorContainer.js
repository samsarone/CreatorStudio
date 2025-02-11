import React, { useEffect } from 'react';
import OverflowContainer from '../common/OverflowContainer.tsx';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getHeaders } from '../../utils/web';

import OneshotEditor from './OneshotEditor.js';
const API_SERVER = process.env.REACT_APP_PROCESSOR_API;
const CDN_URI = process.env.REACT_APP_STATIC_CDN_URL;

export default function OneshotEditorContainer() {




  const { id } = useParams();
  const navigate = useNavigate();



  useEffect(() => {


    if (!id) {
      const headers = getHeaders();
      axios.post(`${API_SERVER}/vidgpt/create_blank`, {}, headers).then(function (response) {
        const {sessionId} = response.data;

        navigate(`/vidgpt/${sessionId}`);


      });
    }
  }, []);

  useEffect(() => {


    if (id) {
      // navigate(`/vidgpt/quick_editor/${id}`);
    }
  }, [id]);

  return (
    <div className='bg-gray-900'>
      <OverflowContainer>
        <div className='container m-auto'>
          <OneshotEditor />
        </div>
      </OverflowContainer>
    </div>
  )
}