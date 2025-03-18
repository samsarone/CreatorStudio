


import React from 'react';
import Select from 'react-select';
import { TTS_PROVIDERS } from '../../../../constants/Types.ts';

export default function TTSTypeSelect(props) {
  const { ttsProvider, onChange } = props;


  return (
    <Select
      value={ttsProvider}
      onChange={onChange}
      options={TTS_PROVIDERS}
      // Include any styles you want
    />
  );
}