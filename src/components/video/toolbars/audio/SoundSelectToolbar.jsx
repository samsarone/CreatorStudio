import React, { useState } from 'react';
import SecondaryButton from '../../../common/SecondaryButton.tsx';
import { TOOLBAR_ACTION_VIEW } from '../../../../constants/Types.ts';
import { useColorMode } from '../../../../contexts/ColorMode.jsx';

const PROCESSOR_API_URL = import.meta.env.VITE_PROCESSOR_API;

export default function SoundSelectToolbar(props) {
  const { audioLayer, submitAddTrackToProject, setCurrentCanvasAction ,
    currentSelectedLayer
  } = props;


  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(audioLayer.duration || 5); // Default duration from audioLayer or 5
  const [volume, setVolume] = useState(100); // Default volume is 100

  const { colorMode } = useColorMode();

  let bgColor = "bg-gray-900";
  if (colorMode === 'light') {
    bgColor = "bg-neutral-50 text-neutral-900";
  }
  const text2Color = colorMode === 'dark' ? 'text-neutral-100' : 'text-neutral-900';

  // Construct the full audio URL
  const audioUrl = `${PROCESSOR_API_URL}/${audioLayer.localAudioLinks[0]}`;

  const handleSubmit = (evt) => {
    evt.preventDefault();
    const payload = {
      startTime: parseFloat(startTime),
      duration: parseFloat(duration),
      volume: parseFloat(volume),
      endTime: parseFloat(startTime) + parseFloat(duration),
    };


    submitAddTrackToProject(0, payload); // Pass 0 as index
  };

  return (
    <div className={`${bgColor} ${text2Color}`}>
      <div className="mt-2">
        <audio controls className="w-full">
          <source src={audioUrl} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      </div>
      <div className="mt-2">
        <form onSubmit={handleSubmit} className={`${bgColor}`}>
          <div className="grid grid-cols-3 gap-2 items-center">
            <div>
              <input
                type="number"
                name="startTime"
                placeholder="Start Time (secs)"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={`h-[30px] ${bgColor} w-[80px] m-auto border-2 border-gray-200 pl-2`}
              />
              <div className="text-xs text-center">Start Time</div>
            </div>
            <div>
              <input
                type="number"
                name="duration"
                placeholder="Duration (secs)"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className={`h-[30px] ${bgColor} w-[80px] m-auto border-2 border-gray-200 pl-2`}
              />
              <div className="text-xs text-center">Duration</div>
            </div>
            <div>
              <input
                type="number"
                name="volume"
                placeholder="Volume"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className={`h-[30px] ${bgColor} w-[60px] m-auto border-2 border-gray-200 pl-2`}
              />
              <div className="text-xs text-center">Volume</div>
            </div>
          </div>
          <div className="mt-2">
            <SecondaryButton type="submit">Add</SecondaryButton>
          </div>
        </form>
      </div>
      <div className="mt-2">
        <SecondaryButton onClick={() => setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_DEFAULT_DISPLAY)}>
          Cancel
        </SecondaryButton>
      </div>
    </div>
  );
}
