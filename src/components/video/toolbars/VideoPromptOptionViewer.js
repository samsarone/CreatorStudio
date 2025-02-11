import React from 'react';

export default function VideoPromptOptionViewer(props) {
  const { option, onSelect } = props;

  return (
    <div className="video-prompt-option-viewer" onClick={() => onSelect(option)}>
      <div className="video-prompt-option-viewer__image">
        <img src={option.image} alt={option.title} />
      </div>
      <div className="video-prompt-option-viewer__title">{option.title}</div>
    </div>
  );
}