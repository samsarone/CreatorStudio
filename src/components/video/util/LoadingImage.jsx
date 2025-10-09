import React from 'react';
import { FaSpinner } from 'react-icons/fa';
import { useColorMode } from '../../../contexts/ColorMode'; // Adjust the import path as needed
import Loader from '../../common/Loader';

export default function LoadingImage() {
  const { colorMode } = useColorMode();
  
  return (
    <Loader />
  );
}
