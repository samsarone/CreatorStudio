import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useColorMode } from '../../../contexts/ColorMode.js';
import { getHeaders } from '../../../utils/web';
import { useNavigate } from 'react-router-dom';

import { FaVideo, FaForward, FaStar, FaQuestionCircle } from "react-icons/fa";

// 1) Import react-tooltip
import 'react-tooltip/dist/react-tooltip.css';
import { Tooltip } from 'react-tooltip';

const API_SERVER = process.env.REACT_APP_PROCESSOR_API;

export default function ShowNewUserIntroDisplay(props) {
  const { createNewStudioSession, createNewQuickSession, createNewVidGPTSession, handleImportClick } = props;

  const [introSessionList, setIntroSessionList] = useState([]);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const headers = getHeaders();
    axios.get(`${API_SERVER}/video_sessions/intro_sessions`, headers).then((dataRes) => {
      const introSessionList = dataRes.data;
      if (introSessionList.length > 0) {
        setIntroSessionList(introSessionList);
      }
    });
  }, []);

  const { colorMode } = useColorMode();
  const bgColor = colorMode === 'dark' ? `bg-gray-900` : `bg-neutral-300`;
  const textColor = colorMode === 'dark' ? `text-white` : `text-black`;

  const handleSessionClick = (index) => {
    setSelectedSessionIndex(index === selectedSessionIndex ? null : index);
  };

  let introSessionsListDisplay = <span />;


  return (
    <div>
      <div className={`${bgColor} ${textColor} p-4`}>

        <div className='bg-gray-800 mt-4 mb-4 pb-4 pt-2'>
          <div className='text-lg font-bold mb-4 '>
            Create New Project
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 justify-items-center">
            {/* Studio Session */}
            <div
              onClick={() => createNewStudioSession()}
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <FaVideo className="text-4xl mb-2" />
              <span className="flex items-center">
                Studio Session
                {/* 2) Add FaQuestionCircle with tooltip props */}
                <FaQuestionCircle
                  data-tooltip-id="studioSessionTooltip"
                  data-tooltip-content="Studio creator and editor. Create And Edit."
                  className="ml-2"
                />
              </span>
            </div>


            <div
              onClick={() => createNewVidGPTSession()}
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <FaStar className="text-4xl mb-2" />
              <span className="flex items-center">
                VidGPT Session
                <FaQuestionCircle
                  data-tooltip-id="vidgptSessionTooltip"
                  data-tooltip-content="1-Shot Feature film creator. Edit in Studio."
                  className="ml-2"
                />
              </span>
            </div>
          </div>
        </div>
        {introSessionsListDisplay}
      </div>

      {/* 3) Render the Tooltip components, each with its matching ID */}
      <Tooltip id="studioSessionTooltip" place="top" effect="solid" />
      <Tooltip id="expressSessionTooltip" place="top" effect="solid" />
      <Tooltip id="vidgptSessionTooltip" place="top" effect="solid" />
    </div>
  );
}
