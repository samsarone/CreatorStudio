import React from 'react';
import CommonContainer from '../common/CommonContainer.tsx';

export default function ImageHome() {
  return (
    <CommonContainer >
      <div className='m-auto'>
        <div className='block'>
          <div className='w-[5%] bg-[#0f1629] inline-block'>
             Video Frames
          </div>
          <EditorHome />
        </div>
      </div>      

    </CommonContainer>
  )
}
