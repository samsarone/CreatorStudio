import React, { useState, useEffect } from 'react';
import OverflowContainer from '../common/OverflowContainer.tsx';


import OneshotEditorContainer from  '../oneshot_editor/OneshotEditorContainer.jsx';

const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;

export default function MobileVideoHome(props) {




  return (
    <div className='bg-gray-900'>
      <OverflowContainer>
          <OneshotEditorContainer />
      </OverflowContainer>
    </div>

  );
}