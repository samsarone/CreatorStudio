import React from 'react';
import OverflowContainer from '../common/OverflowContainer.tsx';


import OneshotEditorContainer from  '../oneshot_editor/OneshotEditorContainer.jsx';

export default function MobileVideoHome(props) {




  return (
    <div className='bg-gray-900'>
      <OverflowContainer>
          <OneshotEditorContainer />
      </OverflowContainer>
    </div>

  );
}
