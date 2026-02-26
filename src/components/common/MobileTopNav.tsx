import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext';
import CommonButton from './CommonButton.tsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAlertDialog } from '../../contexts/AlertDialogContext';
import { IoMdLogIn } from 'react-icons/io';
import ToggleButton from './ToggleButton.tsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import Login from '../auth/Login.tsx';
import UpgradePlan from '../payments/UpgradePlan.tsx';
import AddSessionDropdown from './AddSessionDropdown.jsx';
import './common.css';
import { FaStar } from 'react-icons/fa6';
import AuthContainer, { AUTH_DIALOG_OPTIONS } from '../auth/AuthContainer.jsx';
import { getHeaders } from '../../utils/web.jsx';
import BrandLogo from './BrandLogo.tsx';
import { imageAspectRatioOptions } from '../../constants/ImageAspectRatios.js';
import { getCanvasDimensionsForAspectRatio } from '../../utils/canvas.jsx';

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function MobileTopNav(props) {
  const { resetCurrentSession, addCustodyAddress, addNewVidGPTSession } = props;
  const farcasterSignInButtonRef = useRef(null);
  const { colorMode } = useColorMode();
  const { openAlertDialog, closeAlertDialog } = useAlertDialog();
  const location = useLocation();

  const isImageEditor =
    location.pathname.includes('/image/') ||
    location.pathname.includes('/iamge/') ||
    location.pathname.includes('/image_sessions');
  const isVideoEditor = location.pathname.includes('/video/') || location.pathname.includes('/vidgenie/') || location.pathname.includes('/vidgpt/') || location.pathname.includes('/adcreator/') || location.pathname.includes('/infovidcreator/');

  const navShell =
    colorMode === 'dark'
      ? 'bg-gradient-to-r from-[#071223] via-[#0d1d35] to-[#0a1b2d] text-slate-100 border-b border-[#2a4e70] shadow-[0_14px_32px_rgba(0,0,0,0.38)]'
      : 'bg-gradient-to-r from-[#e9edf7] via-[#dfe7f5] to-[#eef3fb] text-slate-900 border-b border-[#d7deef] shadow-[0_8px_22px_rgba(15,23,42,0.08)]';

  const resetSession = () => {
    closeAlertDialog();
    if (isImageEditor) {
      createNewImageSession();
      return;
    }
    createNewSession();
  };

  const alertDialogComponent = (
    <div>
      <div>This will reset your current session. Are you sure you want to proceed?</div>
      <div className="mt-4 mb-4 m-auto">
        <div className="inline-flex ml-2 mr-2">
          <CommonButton
            onClick={() => {
              resetSession();
            }}
          >
            Yes
          </CommonButton>
        </div>
        <div className="inline-flex ml-2 mr-2">
          <CommonButton
            onClick={() => {
              closeAlertDialog();
            }}
          >
            No
          </CommonButton>
        </div>
      </div>
    </div>
  );

  const { user, setUser } = useUser();
  const navigate = useNavigate();

  const [userProfileData, setUserProfileData] = useState({});

  let userProfile = <span />;

  const gotoUserAccount = () => {
    navigate('/account');
  };

  const showLoginDialog = () => {
    const loginComponent = <AuthContainer />;
    openAlertDialog(loginComponent, undefined, false, AUTH_DIALOG_OPTIONS);
  };

  const upgradeToPremiumTier = () => {
    const alertDialogComponent = <UpgradePlan />;

  };

  const createNewSession = () => {
    const headers = getHeaders();
    const payload = {
      prompts: [],
    };
    axios.post(`${PROCESSOR_SERVER}/video_sessions/create_video_session`, payload, headers).then(function (response) {
      const session = response.data;
      const sessionId = session._id.toString();
      localStorage.setItem('videoSessionId', sessionId);
      navigate(`/video/${session._id}`);
    });
  };

  const createNewImageSession = (
    sessionConfig:
      | string
      | {
          aspectRatio?: string;
          sessionName?: string;
          canvasDimensions?: { width?: number; height?: number };
          addBackgroundLayer?: boolean;
          backgroundLayerColor?: string;
        } = '1:1'
  ) => {
    const normalizedSessionConfig = typeof sessionConfig === 'string'
      ? { aspectRatio: sessionConfig }
      : (sessionConfig || {});
    const selectedAspectRatio = normalizedSessionConfig.aspectRatio || localStorage.getItem('defaultImageAspectRatio') || '1:1';
    const fallbackCanvasDimensions = getCanvasDimensionsForAspectRatio(selectedAspectRatio);
    const rawWidth = Number(normalizedSessionConfig.canvasDimensions?.width);
    const rawHeight = Number(normalizedSessionConfig.canvasDimensions?.height);
    const canvasDimensions = {
      width: Number.isFinite(rawWidth) && rawWidth > 0 ? Math.round(rawWidth) : fallbackCanvasDimensions.width,
      height: Number.isFinite(rawHeight) && rawHeight > 0 ? Math.round(rawHeight) : fallbackCanvasDimensions.height,
    };
    const normalizedSessionName = typeof normalizedSessionConfig.sessionName === 'string'
      ? normalizedSessionConfig.sessionName.trim()
      : '';
    const shouldAddBackgroundLayer = Boolean(normalizedSessionConfig.addBackgroundLayer);
    const backgroundLayerColor =
      typeof normalizedSessionConfig.backgroundLayerColor === 'string'
        ? normalizedSessionConfig.backgroundLayerColor
        : '#ffffff';

    const headers = getHeaders();
    const payload: {
      prompts: string[];
      aspectRatio: string;
      canvasDimensions: { width: number; height: number };
      sessionName?: string;
      addBackgroundLayer?: boolean;
      backgroundLayerColor?: string;
    } = {
      prompts: [],
      aspectRatio: selectedAspectRatio,
      canvasDimensions,
    };
    if (normalizedSessionName) {
      payload.sessionName = normalizedSessionName;
    }
    if (shouldAddBackgroundLayer) {
      payload.addBackgroundLayer = true;
      payload.backgroundLayerColor = backgroundLayerColor;
    }
    axios.post(`${PROCESSOR_SERVER}/image_sessions/create_session`, payload, headers).then(function (response) {
      const session = response.data;
      const sessionId = session._id.toString();
      localStorage.setItem('imageSessionId', sessionId);
      navigate(`/image/studio/${session._id}`);
    });
  };

  const gotoViewSessionsPage = () => {
    if (isImageEditor) {
      navigate('/image_sessions');
      return;
    }
    navigate('/my_sessions');
  };

  const openImageEditor = () => {
    const storedSessionId = localStorage.getItem('imageSessionId');
    if (storedSessionId) {
      navigate(`/image/studio/${storedSessionId}`);
      return;
    }
    createNewImageSession();
  };

  const openVideoEditor = () => {
    const storedSessionId = localStorage.getItem('videoSessionId') || localStorage.getItem('sessionId');
    if (storedSessionId) {
      navigate(`/video/${storedSessionId}`);
      return;
    }
    createNewSession();
  };

  const createNewSessionDialog = () => {
    openAlertDialog(alertDialogComponent);
  };

  let userTierDisplay = <span />;

  let bottomToggleDisplay = <span />;

  let userCredits;
  let nextUpdate;

  if (user && user._id) {
    if (user.isPremiumUser) {
      userTierDisplay = (
        <div className="text-[#d7ffeb]">
          <FaStar className="inline-flex text-[#39d881]" /> Premium
        </div>
      );
    } else {
      userTierDisplay = (
        <div className="text-slate-400">
          <FaStar className="inline-flex text-slate-500" /> Upgrade
        </div>
      );
    }

    userCredits = user.generationCredits;

    if (user.isPremiumUser) {
      const now = new Date();
      const lastUpdated = new Date(user.premiumUserCreditsLastUpdated);
      const nextUpdateDate = new Date(lastUpdated);
      nextUpdateDate.setMonth(nextUpdateDate.getMonth() + 1);
      const timeDiff = nextUpdateDate.getTime() - now.getTime();
      nextUpdate = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    userProfile = (
      <div className="flex items-center justify-end cursor-pointer" onClick={gotoUserAccount}>
        <div className="flex flex-col text-left mr-2">
          <div className="text-md max-w-[90px] whitespace-nowrap overflow-hidden text-ellipsis">
            <h1>{user.displayName ? user.displayName : user.email}</h1>
          </div>
          <div onClick={upgradeToPremiumTier} className="cursor-pointer">
            {userTierDisplay}
          </div>
        </div>

      </div>
    );

    bottomToggleDisplay = (
      <div className="flex justify-end">
        <ToggleButton />
      </div>
    );
  } else {
    userProfile = (
      <div className="mt-1 flex justify-end">
        <button
          className="m-auto text-center min-w-16 rounded-lg text-slate-100 bg-[#111a2f] pl-8 pr-8 pt-1 pb-2 font-bold text-lg shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-[#162744] hover:text-[#d7ffeb] hover:shadow-[0_12px_24px_rgba(70,191,255,0.2)] active:translate-y-0"
          onClick={showLoginDialog}
        >
          <IoMdLogIn className="inline-flex" /> Login
        </button>
      </div>
    );
  }

  const gotoHome = () => {
    openAlertDialog(alertDialogComponent);
  };

  let addSessionButton = <span />;

  if (user && user._id) {
    addSessionButton = (

      <div className="">
        <AddSessionDropdown
          createNewSession={isImageEditor ? createNewImageSession : createNewSessionDialog}
          gotoViewSessionsPage={gotoViewSessionsPage}
          addNewVidGPTSession={addNewVidGPTSession}
          aspectRatioOptions={isImageEditor ? imageAspectRatioOptions : undefined}
          aspectRatioStorageKey={isImageEditor ? 'defaultImageAspectRatio' : 'defaultAspectRatio'}
          useImageProjectModal={isImageEditor}
          switchEditorLabel={isImageEditor ? 'Video Editor' : (isVideoEditor ? 'Image Editor' : null)}
          onSwitchEditor={isImageEditor ? openVideoEditor : (isVideoEditor ? openImageEditor : null)}
          showVideoOptions={!isImageEditor}
        />
      </div>

    );
  }

  let daysToUpdate = <span />;
  let userCreditsDisplay = <span />;
  if (user && user._id) {
    if (user.isPremiumUser) {
      daysToUpdate = <div>{nextUpdate} days until update</div>;
    } else {
      daysToUpdate = <div>Free Tier</div>;
    }
    userCreditsDisplay = <div>{userCredits} credits</div>;
  }



  return (
    <div className={`${navShell} h-[50px] fixed w-[100vw] z-10`}>
      <div className="flex flex-basis items-center h-full">
        <div className='basis-1/3 pl-2'>
          <BrandLogo onClick={gotoHome} className="mt-1" />
        </div>
        <div className="basis-2/3">
          <div className="text-xs inline-flex">
            <div>{addSessionButton}</div>
          </div>
          <div className=" inline-flex float-right mr-2">{userProfile}</div>
        </div>

      </div>
    </div>
  );
}
