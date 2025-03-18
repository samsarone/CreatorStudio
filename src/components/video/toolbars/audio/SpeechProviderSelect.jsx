// components/common/SpeechProviderSelect.js
import React from 'react';
import Select, { components } from 'react-select';
import { FaPlay, FaPause } from 'react-icons/fa';
import { TTS_COMBINED_SPEAKER_TYPES } from '../../../../constants/Types.ts';

export default function SpeechProviderSelect(props) {
  const {
    speakerType,
    onSpeakerChange,
    playMusicPreviewForSpeaker,
    currentlyPlayingSpeaker,
    colorMode,
  } = props;

  // Styles for select and dropdowns
  const formSelectBgColor = colorMode === 'dark' ? '#030712' : '#f3f4f6';
  const formSelectTextColor = colorMode === 'dark' ? '#f3f4f6' : '#111827';
  const formSelectSelectedTextColor = colorMode === 'dark' ? '#f3f4f6' : '#111827';
  const formSelectHoverColor = colorMode === 'dark' ? '#1f2937' : '#2563EB';

  // Build speaker options from combined list
  const speakerOptions = TTS_COMBINED_SPEAKER_TYPES.map((speaker) => {
    const isPlaying =
      currentlyPlayingSpeaker && currentlyPlayingSpeaker.value === speaker.value;

    const handleIconClick = (evt) => {
      evt.stopPropagation();
      playMusicPreviewForSpeaker(evt, speaker);
    };

     const IconComponent = isPlaying ? <FaPause /> : <FaPlay />;

 
    return {
      ...speaker,
      icon: IconComponent,
      onClick: handleIconClick,
    };
  });


  // Custom Option Component to include play/pause icons and provider
  const Option = (props) => {
    const { data } = props;
    return (
      <components.Option {...props}>
        <div className="flex items-center justify-between">
          <span>
            {data.label}
            <small className="text-xs text-gray-500">
              {' '}
              ({data.provider.toLowerCase()})
            </small>
          </span>
          {data.icon && (
            <span onClick={(evt) => data.onClick(evt)}>{data.icon}</span>
          )}
        </div>
      </components.Option>
    );
  };

  const SingleValue = (props) => (
    <components.SingleValue {...props}>
      {props.data.label}{' '}
      <small className="text-xs text-gray-500">
        ({props.data.provider.toLowerCase()})
      </small>
    </components.SingleValue>
  );

  return (
    <div>
      <Select
        value={speakerType}
        onChange={onSpeakerChange}
        options={speakerOptions}
        components={{ Option, SingleValue }}
        styles={{
          menu: (provided) => ({
            ...provided,
            backgroundColor: formSelectBgColor,
          }),
          singleValue: (provided) => ({
            ...provided,
            color: formSelectTextColor,
          }),
          control: (provided, state) => ({
            ...provided,
            backgroundColor: formSelectBgColor,
            borderColor: state.isFocused ? '#007BFF' : '#ced4da',
            '&:hover': {
              borderColor: state.isFocused ? '#007BFF' : '#ced4da',
            },
            boxShadow: state.isFocused
              ? '0 0 0 0.2rem rgba(0, 123, 255, 0.25)'
              : null,
            minHeight: '38px',
            height: '38px',
          }),
          option: (provided, state) => ({
            ...provided,
            backgroundColor: formSelectBgColor,
            color: state.isSelected
              ? formSelectSelectedTextColor
              : formSelectTextColor,
            '&:hover': {
              backgroundColor: formSelectHoverColor,
            },
          }),
        }}
      />
    </div>
  );
}