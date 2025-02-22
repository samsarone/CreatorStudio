// SpeechSelectToolbar.js
import React, { useEffect, useState } from 'react';
import SecondaryButton from '../../../common/SecondaryButton.tsx';
import { TOOLBAR_ACTION_VIEW } from '../../../../constants/Types.ts';
import { useColorMode } from '../../../../contexts/ColorMode.js';
import SingleSelect from '../../../common/SingleSelect.js';

const PROCESSOR_API_URL = process.env.REACT_APP_PROCESSOR_API;

export default function SpeechSelectToolbar(props) {
  const { audioLayer, submitAddTrackToProject, setCurrentCanvasAction,
    currentLayer
   } = props;
  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(audioLayer.duration || 5); // Default duration from audioLayer or 5
  const [volume, setVolume] = useState(100); // Default volume is 100
  const [addSubtitles, setAddSubtitles] = useState(true);



const subtitleOptions = [
  { value: 'groupRows', label: 'Group Rows' },
  { value: 'groupWords', label: 'Group Words' },
  { value: 'highlightWords', label: 'Highlight Words' },
];

useEffect(() => {
  setStartTime(currentLayer.durationOffset);
  setDuration(audioLayer.duration);

}, [currentLayer, audioLayer]);

const [selectedSubtitleOption, setSelectedSubtitleOption] = useState(subtitleOptions[0]);

  const { colorMode } = useColorMode();

  let bgColor = "bg-gray-900";
  if (colorMode === 'light') {
    bgColor = "bg-neutral-50 text-neutral-900";
  }
  const text2Color = colorMode === 'dark' ? 'text-neutral-100' : 'text-neutral-900';

  // Construct the full audio URL for speech
  // Assuming that speech audio is stored in audioLayer.localAudioLinks[0]
  const audioUrl = `${PROCESSOR_API_URL}/${audioLayer.localAudioLinks[0]}`;


  const handleSubmit = (evt) => {
    evt.preventDefault();
    const payload = {
      startTime: parseFloat(startTime),
      duration: parseFloat(duration),
      volume: parseFloat(volume),
      endTime: parseFloat(startTime) + parseFloat(duration),
     // selectedSubtitleOption: selectedSubtitleOption.value,
      addSubtitles: addSubtitles,
      speakerCharacterName: audioLayer.speakerCharacterName,

    };

    submitAddTrackToProject(0, payload); // Pass 0 as index
  };

  return (
    <div className={`${bgColor} ${text2Color} p-2`}>
      <div className="mt-2">
        <audio controls className="w-full">
          <source src={audioUrl} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      </div>
      <form onSubmit={handleSubmit} className={`${bgColor} mt-4`}>
        <div className="grid grid-cols-3 gap-2 items-center">
          <div>
            <input
              type="number"
              name="startTime"
              placeholder="Start Time (secs)"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={`h-[30px] ${bgColor} w-full border-2 border-gray-200 pl-2`}
            />
            <div className="text-xs text-center mt-1">Start</div>
          </div>
          <div>
            <input
              type="number"
              name="duration"
              placeholder="Duration (secs)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={`h-[30px] ${bgColor} w-full border-2 border-gray-200 pl-2`}
            />
            <div className="text-xs text-center mt-1">Duration</div>
          </div>
          <div>
            <input
              type="number"
              name="volume"
              placeholder="Volume"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className={`h-[30px] ${bgColor} w-full border-2 border-gray-200 pl-2`}
            />
            <div className="text-xs text-center mt-1">Volume</div>
          </div>
        </div>
        <div>

        <div className="inline-flex">
                  <input
                    type="checkbox"
                    checked={addSubtitles}
                    onChange={(e) => setAddSubtitles(e.target.checked)}
                    className="mr-2"
                  />
                  <label className={`text-xs ${text2Color}`}>Subtitles</label>
                </div>




                {addSubtitles && (
          <div className="mb-2">
            <label htmlFor="subtitleOptionSelect" className="block">
              Subtitle Options:
            </label>

          </div>
        )}



        </div>

        <div className="mt-4 flex justify-between">
          <SecondaryButton type="submit">Add to Project</SecondaryButton>
          <SecondaryButton onClick={() => setCurrentCanvasAction(TOOLBAR_ACTION_VIEW.SHOW_DEFAULT_DISPLAY)}>
            Cancel
          </SecondaryButton>
        </div>
      </form>
    </div>
  );
}