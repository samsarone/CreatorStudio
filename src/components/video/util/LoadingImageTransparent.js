import React from 'react';
import { FaSpinner } from 'react-icons/fa';
import { useColorMode } from '../../../contexts/ColorMode'; // Adjust the import path as needed
import Loader from '../../common/Loader';

export default function LoadingImageTransparent() {
  const { colorMode } = useColorMode();
  const bgColor = colorMode === 'dark' ? 'bg-gray-600 text-neutral-50' : 'bg-gray-200 text-neutral-900';
  
  return (
    <Loader />
  );
}
