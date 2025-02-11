import React from 'react';
import OverflowContainer from '../common/OverflowContainer.tsx';

import MovieGenerator from './MovieGenerator.js';

export default function OneshotEditorContainer() {

  return (
    <div className='bg-gray-900'>
      <OverflowContainer>
        <div className='container m-auto'>
          <MovieGenerator />
        </div>
      </OverflowContainer>
    </div>
  )
}
