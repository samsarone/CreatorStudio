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
import AuthContainer, { AUTH_DIALOG_OPTIONS } from '../auth/AuthContainer.jsx';
import { getHeaders } from '../../utils/web.jsx';
import AddCreditsDialog from "../account/AddCreditsDialog.jsx";
import { toast } from 'react-toastify';
import { useLocalization } from '../../contexts/LocalizationContext.jsx';

import CanvasControlBar from '../video/toolbars/CanvasControlBar.jsx';
import { getSessionType } from '../../utils/environment.jsx';

import  AddLicense  from '../license/AddLicense.jsx';



import { NavCanvasControlContext } from '../../contexts/NavCanvasControlContext.jsx';
import { FaCog, FaTimes } from 'react-icons/fa';
import BrandLogo from './BrandLogo.tsx';
import { imageAspectRatioOptions } from '../../constants/ImageAspectRatios.js';
import { getCanvasDimensionsForAspectRatio } from '../../utils/canvas.jsx';


const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function TopNav(props) {
  const { resetCurrentSession, addCustodyAddress, isVideoPreviewPlaying, setIsVideoPreviewPlaying, isRenderPending } = props;
  const farcasterSignInButtonRef = useRef(null);
  const { colorMode } = useColorMode();
  const { t } = useLocalization();
  const location = useLocation();
  const { openAlertDialog, closeAlertDialog, isAlertDialogOpen } = useAlertDialog();

  const sessionType = getSessionType();

  const isImageEditor =
    location.pathname.includes('/image/') ||
    location.pathname.includes('/iamge/') ||
    location.pathname.includes('/image_sessions');
  const isVideoEditor = location.pathname.includes('/video/') || location.pathname.includes('/vidgenie/') || location.pathname.includes('/vidgpt/') || location.pathname.includes('/adcreator/') || location.pathname.includes('/infovidcreator/');

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

  const navShell =
    colorMode === 'dark'
      ? 'bg-gradient-to-r from-[#071223] via-[#0d1d35] to-[#0a1b2d] text-slate-100 border-b border-[#2a4e70] shadow-[0_16px_48px_rgba(0,0,0,0.45)]'
      : 'bg-gradient-to-r from-[#e9edf7] via-[#dfe7f5] to-[#eef3fb] text-slate-900 border-b border-[#d7deef] shadow-[0_10px_24px_rgba(15,23,42,0.08)]';

  const resetSession = () => {
    closeAlertDialog();
    if (isImageEditor) {
      createNewImageSession();
      return;
    }
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
      <div>{t("common.resetSessionConfirm")}</div>
      <div className="mt-4 mb-4 m-auto">
        <div className="inline-flex ml-2 mr-2">
          <CommonButton
            onClick={() => {
              resetSession();
            }}
          >
            {t("common.yes")}
          </CommonButton>
        </div>
        <div className="inline-flex ml-2 mr-2">
          <CommonButton
            onClick={() => {
              closeAlertDialog();
            }}
          >
            {t("common.no")}
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
    openAlertDialog(registerComponent, undefined, false, AUTH_DIALOG_OPTIONS);
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
    const selectedAspectRatio = normalizedSessionConfig.aspectRatio || '1:1';
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
    const defaultAspectRatio = localStorage.getItem('defaultImageAspectRatio') || '1:1';
    createNewImageSession(defaultAspectRatio);
  };

  const openVideoEditor = () => {
    const storedSessionId = localStorage.getItem('videoSessionId') || localStorage.getItem('sessionId');
    if (storedSessionId) {
      navigate(`/video/${storedSessionId}`);
      return;
    }
    const defaultAspectRatio = localStorage.getItem('defaultAspectRatio') || '1:1';
    createNewSession(defaultAspectRatio);
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
        <div className='text-xs text-[#d7ffeb]'>
          <FaStar className="inline-flex text-[#39d881]" /> {premiumUserType}
        </div>
      );
    } else {
      userTierDisplay = (
        <div className='text-xs text-slate-400'>
          <FaStar className="inline-flex text-slate-500" /> {t("common.upgrade")}
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
        <FaCog className="text-lg cursor-pointer hover:text-[#89dcff]" onClick={gotoUserAccount} />
      </div>
    );


  } else {
    userProfile = (
      <button
        className={`
          inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out hover:-translate-y-[1px] active:translate-y-0
          ${colorMode === 'dark'
            ? 'text-slate-100 bg-[#111a2f] hover:bg-[#162744] hover:text-[#d7ffeb] shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_24px_rgba(70,191,255,0.2)]'
            : 'text-slate-900 bg-white/90 hover:bg-white hover:text-slate-900 shadow-[0_8px_16px_rgba(15,23,42,0.08)] hover:shadow-[0_12px_22px_rgba(15,23,42,0.14)]'}
        `}
        type="button"
        onClick={showLoginDialog}
      >
        <IoMdLogIn className="text-base" />
        <span>{t("common.login")}</span>
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
      toast.error(t("topNav.invalidPurchaseAmount"), { position: "bottom-center" });
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
          toast.success(t("topNav.redirectingToCheckout"), { position: "bottom-center" });
        } else {
          
          toast.error(t("topNav.checkoutFailed"), { position: "bottom-center" });
        }
      })
      .catch(function (error) {
        
        toast.error(t("topNav.paymentProcessFailed"), { position: "bottom-center" });
      });
  }, [t]);

  const requestApplyCreditsCoupon = useCallback((couponCode) => {
    if (!couponCode) {
      toast.error(t("topNav.enterCouponCode"), { position: "bottom-center" });
      return;
    }

    axios
      .post(`${PROCESSOR_SERVER}/users/apply_credits_coupon`, { couponCode }, getHeaders())
      .then(() => {
        toast.success(t("topNav.couponApplied"), { position: "bottom-center" });
        if (typeof getUserAPI === "function") {
          getUserAPI();
        }
      })
      .catch(() => {
        toast.error(t("topNav.couponApplyFailed"), { position: "bottom-center" });
      });
  }, [getUserAPI, t]);

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
          createNewSession={isImageEditor ? createNewImageSession : createNewSession}
          gotoViewSessionsPage={gotoViewSessionsPage}
          addNewExpressSession={addNewExpressSession}
          addNewVidGPTSession={addNewVidGPTSession}
          showAddNewMovieMakerSession={showAddNewMovieMakerSession}
          betaOptionVisible={betaOptionVisible}
          showAddNewAdVideoSession={showAddNewAdVideoSession}
          addNewSnowMakerSession={addNewSnowMakerSession}
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
  if (user && user._id && sessionType !== 'docker') {
    if (user.isPremiumUser) {
      daysToUpdate = <div>{t("common.daysUntilUpdate", { count: nextUpdate })}</div>;
    } else {
      daysToUpdate = <div>{t("common.freeTier")}</div>;
    }
    userCreditsDisplay = <div>{userCredits ? userCredits.toFixed(2) : '-'} credits</div>;
  }

  if (user && user._id && sessionType === 'docker' && !user.isLicenseValid) {

    userCreditsDisplay = <div onClick={showLicenseDialog}>{t("common.activateLicense")}</div>
  }

  let errorMessageDisplay = <span />;

  const galleryLinkClasses =
    colorMode === 'dark'
      ? 'text-[#bce8ff] hover:text-[#e7f8ff]'
      : 'text-rose-600 hover:text-rose-500';



  const showRegenerateSubtitles = () => {

    openAlertDialog(
      <div className='relative'>
        <div className="absolute top-2 right-2">
          <FaTimes className="cursor-pointer" onClick={closeAlertDialog} />
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">{t("studio.actions.regenerateSubtitlesTitle")}</div>
          <div className="text-sm">{t("studio.actions.realignLayers")}</div>
          <CommonButton onClick={requestRegenerateSubtitles}>{t("studio.actions.regenerateSubtitle")}</CommonButton>
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
        isRenderPending={isRenderPending}
      />
    );
  } else if (location.pathname.includes('/vidgenie/')) {
    controlbarView = <div />;
  }



  return (
    <div className={`${navShell} fixed top-0 inset-x-0 h-[56px] z-20`}>
      <div className="grid h-full w-full grid-cols-[minmax(160px,14%)_1fr_auto] items-center gap-4 px-[2px] pr-4 sm:pr-6">
        <div className="flex h-full items-center justify-center px-2">
          <BrandLogo onClick={gotoHome} className="w-full max-w-[260px] px-4" />
        </div>
        <div className="flex items-center justify-center min-w-0 h-full py-[2px]">
          <div className="flex h-full w-full items-center justify-center translate-y-[4px]">
            {controlbarView}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 flex-shrink-0 text-xs sm:text-sm">
          <a
            href="https://gallery.samsar.one"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden sm:inline-flex items-center gap-1 text-xs font-semibold transition-colors ${galleryLinkClasses}`}
          >
            {t("common.visitGallery")}
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
