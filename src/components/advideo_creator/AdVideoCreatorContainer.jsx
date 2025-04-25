import React from 'react';
import OverflowContainer from '../common/OverflowContainer.tsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import AdVideoCreator from './AdVideoCreator';

export default function AdVideoCreatorContainer() {


  const { colorMode } = useColorMode();

  const bgColor = colorMode === 'dark' ? 'bg-gray-900' : 'bg-gray-100';
  return (
    <div className={`${bgColor}`}>
      <OverflowContainer>
        <div className='container m-auto'>
          <AdVideoCreator />
        </div>
      </OverflowContainer>
    </div>
  )
}