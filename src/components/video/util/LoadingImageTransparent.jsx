import React from 'react';
import { FaSpinner } from 'react-icons/fa';
import { useColorMode } from '../../../contexts/ColorMode'; // Adjust the import path as needed
import Loader from '../../common/Loader';

export default function LoadingImageTransparent() {
  const { colorMode } = useColorMode();
  const bgColor = colorMode === 'dark' ? 'text-neutral-50' : 'text-neutral-900';
  
  return (
    <Loader />
  );
}
