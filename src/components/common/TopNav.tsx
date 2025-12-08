import React, { useEffect, useState, useRef, useContext, useCallback } from 'react';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext';
import CommonButton from './CommonButton.tsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAlertDialog } from '../../contexts/AlertDialogContext';
import MusicLibraryHome from '../library/audio/MusicLibraryHome.jsx';
import { IoMdLogIn } from 'react-icons/io';

import { useColorMode } from '../../contexts/ColorMode.jsx';
import Login from '../auth/Login.tsx';
import UpgradePlan from '../payments/UpgradePlan.tsx';
import AddSessionDropdown from './AddSessionDropdown.jsx';
import './common.css';
import { FaStar, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import AuthContainer from '../auth/AuthContainer.jsx';
import { getHeaders } from '../../utils/web.jsx';
import AddCreditsDialog from "../account/AddCreditsDialog.jsx";
import { toast } from 'react-toastify';

import CanvasControlBar from '../video/toolbars/CanvasControlBar.jsx';
import { getSessionType } from '../../utils/environment.jsx';

import  AddLicense  from '../license/AddLicense.jsx';



import { NavCanvasControlContext } from '../../contexts/NavCanvasControlContext.jsx';
import { FaCog, FaTimes } from 'react-icons/fa';


const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function TopNav(props) {
  const { resetCurrentSession, addCustodyAddress, isVideoPreviewPlaying, setIsVideoPreviewPlaying } = props;
  const farcasterSignInButtonRef = useRef(null);
  const { colorMode } = useColorMode();
  const location = useLocation();
  const { openAlertDialog, closeAlertDialog, isAlertDialogOpen } = useAlertDialog();

  const sessionType = getSessionType();

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

  let bgColor = 'from-indigo-900 via-blue-950 to-blue-900 text-neutral-50';

  if (colorMode === 'light') {
    bgColor = 'from-blue-700 to-blue-400 text-neutral-900';
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



    // if (user && !user.isPremiumUser) {
    //   const setPaymentFlowShown = localStorage.getItem("setPaymentFlowShown");

    //   if (!setPaymentFlowShown || setPaymentFlowShown === 'false') {
    //     localStorage.setItem("setPaymentFlowShown", "true");
    //     setTimeout(() => {
    //       openAlertDialog(
    //         <div className='relative '>
    //           <UpgradePlan />
    //         </div>
    //       );
    //     }, 10 * 1000);


    //   }

    // }

  }, [location.search]);


  useEffect(() => {
    // listen to local storage setShowSetPaymentFlow
    // if set then show timeouts 2 min the payment flow and set it to false in local storage

    // if (localStorage.getItem("setShowSetPaymentFlow") === 'true') {
    //   setTimeout(() => {
    //     openAlertDialog(
    //       <div className='relative '>
    //         <UpgradePlan />
    //       </div>

    //     );
    //   }, 500);
    //   localStorage.setItem("setShowSetPaymentFlow", "false");
    // }

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

const showLicenseDialog = () => {
  openAlertDialog(
    <div className="relative">
      <FaTimes className="absolute top-2 right-2 cursor-pointer" onClick={closeAlertDialog} />
      <AddLicense />
    </div>
  );
};

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

  const { user, setUser, getUserAPI } = useUser();
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

      navigate(`/vidgenie/${session._id}`);

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

      navigate(`/vidgenie/${session._id}`);

    });
  }

  const showAddNewAdVideoSession = () => {
    const headers = getHeaders();
    const payload = {
      prompts: [],
    };
    axios.post(`${PROCESSOR_SERVER}/video_sessions/create_video_session`, payload, headers).then(function (response) {
      const session = response.data;
      const sessionId = session._id.toString();
      localStorage.setItem('videoSessionId', sessionId);

      navigate(`/adcreator/${session._id}`);

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
      <div className="flex items-center justify-end gap-3">
        <div className="flex flex-col text-right leading-tight">
          <div className="text-sm font-semibold max-w-[140px] whitespace-nowrap overflow-hidden text-ellipsis">
            {user.username ? user.username : user.email}
          </div>
          <div onClick={upgradeToPremiumTier} className="cursor-pointer">
            {userTierDisplay}
          </div>
        </div>
        <FaCog className="text-lg cursor-pointer" onClick={gotoUserAccount} />
      </div>
    );


  } else {
    userProfile = (
      <button
        className={`
          inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold shadow-lg transition duration-200
          ${colorMode === 'dark'
            ? 'text-neutral-100 bg-cyber-black border-gray-800 hover:bg-neutral-800 hover:text-blue-400'
            : 'text-neutral-900 bg-blue-300 border-blue-200 hover:bg-blue-400 hover:text-white'}
        `}
        type="button"
        onClick={showLoginDialog}
      >
        <IoMdLogIn className="text-base" />
        <span>Login</span>
      </button>
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

  const purchaseCreditsForUser = useCallback((amountToPurchase) => {
    const purchaseAmountRequest = parseInt(amountToPurchase, 10);

    if (Number.isNaN(purchaseAmountRequest) || purchaseAmountRequest <= 0) {
      toast.error("Select a valid amount to purchase.", { position: "bottom-center" });
      return;
    }

    const headers = getHeaders();

    const payload = {
      amount: purchaseAmountRequest,
    };

    axios
      .post(`${PROCESSOR_SERVER}/users/purchase_credits`, payload, headers)
      .then(function (dataRes) {

        const data = dataRes.data;

        if (data.url) {
          window.open(data.url, "_blank", "noopener,noreferrer");
          toast.success("Redirecting to checkout…", { position: "bottom-center" });
        } else {
          
          toast.error("Unable to open checkout. Please try again.", { position: "bottom-center" });
        }
      })
      .catch(function (error) {
        
        toast.error("Payment process failed. Please try again.", { position: "bottom-center" });
      });
  }, []);

  const requestApplyCreditsCoupon = useCallback((couponCode) => {
    if (!couponCode) {
      toast.error("Please enter a coupon code", { position: "bottom-center" });
      return;
    }

    axios
      .post(`${PROCESSOR_SERVER}/users/apply_credits_coupon`, { couponCode }, getHeaders())
      .then(() => {
        toast.success("Coupon applied!", { position: "bottom-center" });
        if (typeof getUserAPI === "function") {
          getUserAPI();
        }
      })
      .catch(() => {
        toast.error("Failed to apply coupon", { position: "bottom-center" });
      });
  }, [getUserAPI]);

  const openPurchaseCreditsDialog = useCallback(() => {

    const alertDialogContent = (
      <div>
        <FaTimes className="absolute top-2 right-2 cursor-pointer" onClick={closeAlertDialog} />
        <AddCreditsDialog purchaseCreditsForUser={purchaseCreditsForUser}
          requestApplyCreditsCoupon={requestApplyCreditsCoupon} />
      </div>
    );

    openAlertDialog(alertDialogContent, undefined, false);

  }, [closeAlertDialog, openAlertDialog, purchaseCreditsForUser, requestApplyCreditsCoupon]);

  useEffect(() => {
    // Auto-popup for zero credits removed.
  }, []);

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

  const addNewSnowMakerSession = () => {
     const headers = getHeaders();
    const payload = {
      prompts: [],
    };
    axios.post(`${PROCESSOR_SERVER}/video_sessions/create_video_session`, payload, headers).then(function (response) {
      const session = response.data;
      const sessionId = session._id.toString();
      localStorage.setItem('videoSessionId', sessionId);

      navigate(`/infovidcreator/${session._id}`);

    });   
  }

  let addSessionButton = <span />;

  let betaOptionVisible = false;
  if (user && user.isAdminUser) {
    betaOptionVisible = true;
  }

  if (user && user._id) {
    addSessionButton = (
      <div className="inline-flex items-center">
        <AddSessionDropdown
          createNewSession={createNewSession}
          gotoViewSessionsPage={gotoViewSessionsPage}
          addNewExpressSession={addNewExpressSession}
          addNewVidGPTSession={addNewVidGPTSession}
          showAddNewMovieMakerSession={showAddNewMovieMakerSession}
          betaOptionVisible={betaOptionVisible}
          showAddNewAdVideoSession={showAddNewAdVideoSession}
          addNewSnowMakerSession={addNewSnowMakerSession}
        />
      </div>
    );
  }

  let daysToUpdate = <span />;
  let userCreditsDisplay = <span />;
  if (user && user._id && sessionType !== 'docker') {
    if (user.isPremiumUser) {
      daysToUpdate = <div>{nextUpdate} days until update</div>;
    } else {
      daysToUpdate = <div>Free Tier</div>;
    }
    userCreditsDisplay = <div>{userCredits ? userCredits.toFixed(2) : '-'} credits</div>;
  }

  if (user && user._id && sessionType === 'docker' && !user.isLicenseValid) {

    userCreditsDisplay = <div onClick={showLicenseDialog}>Activate your License.</div>
  }

  let errorMessageDisplay = <span />;
  let verificationReminderDisplay = <span />;

  if (user && user._id && !user.isEmailVerified) {
    verificationReminderDisplay = (
      <div
        className="text-xs font-semibold text-amber-500 dark:text-amber-300 cursor-pointer"
        onClick={gotoUserAccount}
      >
        Verify email to get access to all features
      </div>
    );
  }

  const galleryLinkClasses =
    colorMode === 'dark'
      ? 'text-cyan-200 hover:text-white'
      : 'text-blue-600 hover:text-blue-800';



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


    });


  }

  let controlbarView: React.ReactNode = null;
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
  } else if (location.pathname.includes('/vidgenie/')) {
    controlbarView = <div />;
  }



  return (
    <div className={`bg-gradient-to-r ${bgColor} fixed top-0 inset-x-0 h-[56px] shadow-lg z-20`}>
      <div className="grid h-full w-full grid-cols-[10%_1fr_auto] items-center gap-4 px-[2px] pr-4 sm:pr-6">
        <div className="flex h-full items-center justify-center px-[2px]">
          <button
            onClick={gotoHome}
            className={`group flex w-full max-w-[220px] items-center justify-center gap-0 rounded-md border border-transparent px-3 py-[8px] text-left shadow-none transition 
              ${colorMode === 'dark'
                ? 'bg-gradient-to-br from-white/10 via-white/6 to-white/0 hover:from-white/14 hover:via-white/9 hover:to-white/4'
                : 'bg-gradient-to-br from-white/30 via-sky-50/20 to-blue-50/10 text-neutral-900 hover:from-white/40 hover:via-sky-50/30 hover:to-blue-50/20'}`}
          >
            <span
              className={`pl-[10px] pr-[6px] text-[12px] sm:text-[14px] font-black uppercase tracking-[0.14em] transition-colors 
                ${colorMode === 'dark'
                  ? 'text-slate-100 group-hover:text-cyan-100'
                  : 'text-white group-hover:text-slate-100'}`}
            >
              Samsar
            </span>
            <span
              className={`pl-[6px] pr-[10px] text-[12px] sm:text-[14px] font-black uppercase tracking-[0.14em] transition-colors 
                ${colorMode === 'dark'
                  ? 'text-cyan-300 group-hover:text-white'
                  : 'text-white/90 group-hover:text-white'}`}
            >
              One
            </span>
          </button>
        </div>
        <div className="flex items-center justify-center min-w-0 h-full py-[2px]">
          <div className="flex h-full w-full items-center justify-center translate-y-[4px]">
            {controlbarView}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 flex-shrink-0 text-xs sm:text-sm">
          {verificationReminderDisplay}
          <a
            href="https://gallery.samsar.one"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden sm:inline-flex items-center gap-1 text-xs font-semibold transition-colors ${galleryLinkClasses}`}
          >
            Visit Gallery
            <FaArrowUpRightFromSquare className="text-[10px]" />
          </a>
          {errorMessageDisplay}
          <div className="flex items-center">
            {addSessionButton}
          </div>
          <div className="flex flex-col items-end text-xs leading-tight text-right">
            <div>{userCreditsDisplay}</div>
            <div>{daysToUpdate}</div>
          </div>
          <div className="flex items-center justify-end">
            {userProfile}
          </div>
        </div>
      </div>
    </div>
  );
}
