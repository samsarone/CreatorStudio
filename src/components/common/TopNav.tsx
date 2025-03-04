import React, { useEffect, useState, useRef, useContext } from 'react';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext';
import CommonButton from './CommonButton.tsx';
import { useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { useAlertDialog } from '../../contexts/AlertDialogContext';
import MusicLibraryHome from '../library/audio/MusicLibraryHome.js';
import { IoMdLogIn } from 'react-icons/io';

import { useColorMode } from '../../contexts/ColorMode.js';
import { IoMdWallet } from 'react-icons/io';
import Login from '../auth/Login.tsx';
import UpgradePlan from '../payments/UpgradePlan.tsx';
import AddSessionDropdown from './AddSessionDropdown.js';
import './common.css';
import { FaTwitter, FaStar } from 'react-icons/fa6';
import AuthContainer from '../auth/AuthContainer.js';
import { getHeaders } from '../../utils/web.js';
import AddCreditsDialog from "../account/AddCreditsDialog.js";

import CanvasControlBar from '../video/toolbars/CanvasControlBar.js';

import { NavCanvasControlContext } from '../../contexts/NavCanvasControlContext.js';
import { FaCog, FaTimes } from 'react-icons/fa';


const PROCESSOR_SERVER = process.env.REACT_APP_PROCESSOR_API;

export default function TopNav(props) {
  const { resetCurrentSession, addCustodyAddress, isVideoPreviewPlaying, setIsVideoPreviewPlaying } = props;
  const farcasterSignInButtonRef = useRef(null);
  const { colorMode } = useColorMode();
  const location = useLocation();
  const { openAlertDialog, closeAlertDialog } = useAlertDialog();

  const {
    downloadCurrentFrame,
    isExpressGeneration,
    sessionId,
    toggleStageZoom,
    requestRegenerateSubtitles,
    displayZoomType,
    stageZoomScale,
    requestRegenerateAnimations,
    requestRealignLayers,
    requestRealignToAiVideoAndLayers,
    canvasActualDimensions,
    totalEffectiveDuration,

  } = useContext(NavCanvasControlContext);

  let bgColor = 'from-cyber-black via-blue-900 to-neutral-900 text-neutral-50';

  if (colorMode === 'light') {
    bgColor = 'from-green-700 to-green-400 text-neutral-900';
  }

  const textColor =
    colorMode === "dark" ? "text-neutral-100" : "text-neutral-800";

  const resetSession = () => {
    closeAlertDialog();
    createNewSession();
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const register = queryParams.get('register');
    const login = queryParams.get('login');
    const plan = queryParams.get('plan');

    if (!user || !user._id) {

      if (register === 'true') {

        showRegisterDialog();
      }

      if (login === 'true') {
        showLoginDialog();
      }
    }



    if (user && !user.isPremiumUser) {
      const setPaymentFlowShown = localStorage.getItem("setPaymentFlowShown");

      if (!setPaymentFlowShown || setPaymentFlowShown === 'false') {
        localStorage.setItem("setPaymentFlowShown", "true");
        setTimeout(() => {
          openAlertDialog(
            <div className='relative '>
              <UpgradePlan />
            </div>
          );
        }, 10 * 1000);


      }

    }

  }, [location.search]);


  useEffect(() => {
    // listen to local storage setShowSetPaymentFlow
    // if set then show timeouts 2 min the payment flow and set it to false in local storage

    if (localStorage.getItem("setShowSetPaymentFlow") === 'true') {
      setTimeout(() => {
        openAlertDialog(
          <div className='relative '>
            <UpgradePlan />
          </div>

        );
      }, 500);
      localStorage.setItem("setShowSetPaymentFlow", "false");
    }

    const handleStorageChange = (event) => {
      if (event.key === "setShowSetPaymentFlow" && event.newValue === 'true') {

        setTimeout(() => {
          if (user && !user.isPremiumUser) {
            openAlertDialog(
              <div className='relative'>
                <UpgradePlan />
              </div>
            );
          }

        }, 1000 * 2);
        localStorage.setItem("setShowSetPaymentFlow", "false");
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);



  const homeAlertDialogComponent = (
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
    navigate('/login');
  };

  const showRegisterDialog = () => {
    const registerComponent = <AuthContainer initView="register" />;
    openAlertDialog(
      <div>
        <FaTimes className="absolute top-2 right-2 cursor-pointer" onClick={closeAlertDialog} />
        {registerComponent}
      </div>
    );
  }

  const upgradeToPremiumTier = () => {

    navigate('/create_payment');
  };

  const createNewSession = (aspectRatio = '1:1') => {
    const headers = getHeaders();
    const payload = {
      prompts: [],
      aspectRatio: aspectRatio,
    };
    axios.post(`${PROCESSOR_SERVER}/video_sessions/create_video_session`, payload, headers).then(function (response) {
      const session = response.data;
      const sessionId = session._id.toString();
      localStorage.setItem('videoSessionId', sessionId);

      navigate(`/video/${session._id}`);

    });
  };

  const gotoViewSessionsPage = () => {
    navigate('/my_sessions');
  };


  const addNewExpressSession = () => {
    const headers = getHeaders();
    const payload = {
      prompts: [],
    };
    axios.post(`${PROCESSOR_SERVER}/video_sessions/create_video_session`, payload, headers).then(function (response) {
      const session = response.data;
      const sessionId = session._id.toString();
      localStorage.setItem('videoSessionId', sessionId);

      navigate(`/quick_video/${session._id}`);

    });
  }

  const addNewVidGPTSession = () => {
    const headers = getHeaders();
    const payload = {
      prompts: [],
    };
    axios.post(`${PROCESSOR_SERVER}/video_sessions/create_video_session`, payload, headers).then(function (response) {
      const session = response.data;
      const sessionId = session._id.toString();
      localStorage.setItem('videoSessionId', sessionId);

      navigate(`/videogpt/${session._id}`);

    });
  }

  let userTierDisplay = <span />;

  let userCredits;
  let nextUpdate;

  if (user && user._id) {
    if (user.isPremiumUser) {
      let premiumUserType = 'Premium';
      if (user.premiumUserType) {
        premiumUserType = user.premiumUserType;
      }
      userTierDisplay = (
        <div className='text-xs'>
          <FaStar className="inline-flex text-neutral-100" /> {premiumUserType}
        </div>
      );
    } else {
      userTierDisplay = (
        <div className='text-xs'>
          <FaStar className="inline-flex text-neutral-700" /> Upgrade
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
      <div className="flex items-center justify-end cursor-pointer" >
        <div className="flex flex-col text-left mr-2">
          <div className="text-md max-w-[90px] whitespace-nowrap overflow-hidden text-ellipsis">
            <h1 className='text-center '>{user.username ? user.username : user.email}</h1>
          </div>
          <div onClick={upgradeToPremiumTier} className="cursor-pointer">
            {userTierDisplay}
          </div>
        </div>
        <FaCog className='inline-flex text-2lg ' onClick={gotoUserAccount}/>
      </div>
    );


  } else {
    userProfile = (
      <div className="mt-1 flex justify-end">
        <button
          className="m-auto text-center min-w-16 rounded-lg shadow-lg text-neutral-100 bg-cyber-black pl-8 pr-8 pt-1 pb-2 font-bold text-lg"
          onClick={showLoginDialog}
        >
          <IoMdLogIn className="inline-flex" /> Login
        </button>
      </div>
    );
  }

  const gotoHome = () => {

    const currentPath = location.pathname;
    if (currentPath.includes('video')) {
      openAlertDialog(homeAlertDialogComponent);
    } else {
      const lastActiveSession = localStorage.getItem('videoSessionId');
      if (lastActiveSession) {
        navigate(`/video/${lastActiveSession}`);
      } else {
        navigate('/');
      }
    }
  };

  const purchaseCreditsForUser = (amountToPurchase) => {
    const purchaseAmountRequest = parseInt(amountToPurchase);
    const headers = getHeaders();

    const payload = {
      amount: purchaseAmountRequest,
    };

    axios
      .post(`${PROCESSOR_SERVER}/users/purchase_credits`, payload, headers)
      .then(function (dataRes) {

        const data = dataRes.data;

        if (data.url) {
          window.open(data.url, "_blank");
        } else {
          console.error("Failed to get Stripe payment URL");
        }
      })
      .catch(function (error) {
        console.error("Error during payment process", error);
      });
  };

  const requestApplyCreditsCoupon = (couponCode) => {
    console.log("APPLY CREDITS COUPON " + couponCode);
  }

  const openPurchaseCreditsDialog = () => {

    const alertDialogContent = (
      <AddCreditsDialog purchaseCreditsForUser={purchaseCreditsForUser}
        requestApplyCreditsCoupon={requestApplyCreditsCoupon} />
    );

    openAlertDialog(alertDialogContent, undefined, true);

  }

  const showAddNewMovieMakerSession = () => {
    const headers = getHeaders();
    const payload = {
      prompts: [],
    };
    axios.post(`${PROCESSOR_SERVER}/video_sessions/create_video_session`, payload, headers).then(function (response) {
      const session = response.data;
      const sessionId = session._id.toString();
      localStorage.setItem('videoSessionId', sessionId);

      navigate(`/movie_maker/${session._id}`);

    });
  }
  let addSessionButton = <span />;

  let betaOptionVisible = false;
  if (user && user.isAdminUser) {
    betaOptionVisible = true;
  }

  if (user && user._id) {
    addSessionButton = (
      <div className="inline-flex float-right">
        <div className="inline-flex ml-2 mr-2">
          <AddSessionDropdown createNewSession={createNewSession} gotoViewSessionsPage={gotoViewSessionsPage}
            addNewExpressSession={addNewExpressSession} 
            addNewVidGPTSession={addNewVidGPTSession}
            showAddNewMovieMakerSession={showAddNewMovieMakerSession}
            betaOptionVisible={betaOptionVisible}
            />
        </div>
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
    userCreditsDisplay = <div>{userCredits ? userCredits.toFixed(2) : '-'} credits</div>;
  }

  let errorMessageDisplay = <span />;
  if (user && user._id) {
    if (user.generationCredits <= 0) {
      errorMessageDisplay = <div className="text-xs font-bold ">
        <div className='text-red-500 '>
          You are out of credits
        </div>
        <div className='underline text-green-600 cursor-pointer' onClick={openPurchaseCreditsDialog}>
          Purchase More
        </div>
      </div>;
    }
  }



  const showRegenerateSubtitles = () => {

    openAlertDialog(
      <div className='relative'>
        <div className="absolute top-2 right-2">
          <FaTimes className="cursor-pointer" onClick={closeAlertDialog} />
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">Regenerate Subtitles</div>
          <div className="text-sm">This will regenerate the subtitles for the current video</div>
          <CommonButton onClick={requestRegenerateSubtitles}>Regenerate</CommonButton>
        </div>
      </div>
    );

  }


  const regenerateVideoSessionSubtitles = () => {

    const headers = getHeaders();

    
    axios.post(`${PROCESSOR_SERVER}/video_sessions/request_regenerate_subtitles`, { sessionId: sessionId }, headers).then(function (response) {
      console.log("Regenerate Subtitles Response", response);


    });


  }

  let controlbarView = <span />;
  if (location.pathname.includes('/video/')) {
    controlbarView = (
      <CanvasControlBar
        downloadCurrentFrame={downloadCurrentFrame}
        isExpressGeneration={isExpressGeneration}
        sessionId={sessionId}
        toggleStageZoom={toggleStageZoom}
        requestRegenerateSubtitles={requestRegenerateSubtitles}
        displayZoomType={displayZoomType}
        stageZoomScale={stageZoomScale}
        requestRegenerateAnimations={requestRegenerateAnimations}
        requestRealignLayers={requestRealignLayers}
        canvasActualDimensions={canvasActualDimensions}
        totalEffectiveDuration={totalEffectiveDuration}
        requestRealignToAiVideoAndLayers={requestRealignToAiVideoAndLayers}
        showRegenerateSubtitles={showRegenerateSubtitles}
        regenerateVideoSessionSubtitles={regenerateVideoSessionSubtitles}
        isVideoPreviewPlaying={isVideoPreviewPlaying}
        setIsVideoPreviewPlaying={setIsVideoPreviewPlaying}
      />
    );
  } else if (location.pathname.includes('/quick_video/')) {
    controlbarView = (
      <div className="absolute text-center w-full ">

    </div>

    )
  }



  return (
    <div className={`bg-gradient-to-r ${bgColor} h-[50px] fixed w-[100vw] shadow-lg z-20`}>
      {/* Change grid to 3 columns */}
      <div className="grid grid-flow-col	 h-full">
        {/* Left Section: Logo */}
        <div className="flex items-center pl-0 mt-[-6px]">
          <img src={'/one.png'} className="cursor-pointer" onClick={gotoHome} alt="Logo" />
        </div>

        {/* Center Section: CanvasControlBar */}
        <div className="flex justify-center items-center pt-2 mt-1">
          {controlbarView}

        </div>

        {/* Right Section: User Profile and Actions */}
        <div className="flex justify-end items-center pr-4">
          <div className="flex justify-end space-x-4">
            {errorMessageDisplay}
            <div>{addSessionButton}</div>

            <div className="text-xs text-left mr-2 ">
              <div className='pt-2'>{userCreditsDisplay}</div>
              <div>{daysToUpdate}</div>
            </div>
            <div>{userProfile}</div>

          </div>
        </div>
      </div>
    </div>
  );
}
