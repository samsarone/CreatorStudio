import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { useNavigate, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import axios from "axios";
import 'react-tooltip/dist/react-tooltip.css';


import { consumePostAuthRedirect, persistAuthToken } from '../../utils/web.jsx';
import { useUser } from "../../contexts/UserContext";
import { useColorMode } from "../../contexts/ColorMode.jsx";

const EditorHome = lazy(() => import("../editor/EditorHome.tsx"));
const UserAccount = lazy(() => import("../account/UserAccount.tsx"));
const PublicationHome = lazy(() => import("../publication/PublicationHome.tsx"));
const VerificationHome = lazy(() => import("../verification/VerificationHome.tsx"));
const VideoHome = lazy(() => import("../video/VideoHome.jsx"));
const MobileVideoHome = lazy(() => import("../mobile/MobileVideoHome.jsx"));
const VideoEditorLandingHome = lazy(() => import("../video/VideoEditorLandingHome.jsx"));
const ListVideoSessions = lazy(() => import("../video/sessions/ListVideoSessions.jsx"));
const QuickEditorContainer = lazy(() => import("../quick_editor/QuickEditorContainer.jsx"));
const EmailVerificationHome = lazy(() => import("../verification/EmailVerificationHome.jsx"));
const OneshotEditorContainer = lazy(() => import('../oneshot_editor/OneshotEditorContainer.jsx'));
const QuickEditorLandingHome = lazy(() => import("../quick_editor/QuickEditorLandingHome.jsx"));
const MobileVideoLandingHome = lazy(() => import("../mobile/MobileVideoLandingHome.jsx"));
const LoginPage = lazy(() => import("../auth/pages/LoginPage.jsx"));
const ForgotPasswordPage = lazy(() => import("../auth/pages/ForgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("../auth/pages/ResetPasswordPage.jsx"));
const RegisterPage = lazy(() => import("../auth/pages/RegisterPage.jsx"));
const ExtensionAuthBridge = lazy(() => import("../auth/ExtensionAuthBridge.jsx"));
const AdVideoCreatorContainer = lazy(() => import("../advideo_creator/AdVideoCreatorContainer.jsx"));
const PaymentsSuccess = lazy(() => import("../payments/PaymentsSuccess.jsx"));
const PaymentsFailure = lazy(() => import("../payments/PaymentsFailure.jsx"));
const CreatePayment = lazy(() => import("../payments/CreatePayment.jsx"));
const MovieGeneratorContainer = lazy(() => import("../movie_gen/MovieGeneratorContainer.jsx"));
const ImageStudioHome = lazy(() => import("../image/ImageStudioHome.jsx"));
const ListImageSessions = lazy(() => import("../image/sessions/ListImageSessions.jsx"));
const ImageStudioLandingHome = lazy(() => import("../image/ImageStudioLandingHome.jsx"));
const ExternalStudioDashboard = lazy(() => import("../external/ExternalStudioDashboard.jsx"));
const GenerationsHome = lazy(() => import("../generations/GenerationsHome.jsx"));

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function Home() {
  const { user, getUserAPI, userFetching, userInitiated } = useUser();
  const navigate = useNavigate();
  const location = useLocation(); 
  const isMobile = useMediaQuery({ query: '(max-width: 767px)' });

  const { colorMode } = useColorMode();
  const [extraProps, setExtraProps] = useState(() => new URLSearchParams());

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    queryParams.delete('loginToken');
    queryParams.delete('authToken');
    setExtraProps(queryParams);
  }, [location.search]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const loginToken = queryParams.get('loginToken');
    if (loginToken && location.pathname !== '/verify') {
      return;
    }
    getUserAPI();
  }, [getUserAPI, location.pathname, location.search]);

  const credits = Number(user?.generationCredits || 0);
  const isExternalUser = Boolean(user?.isExternalUser);
  const hasStudioAccess = Boolean(
    isExternalUser ||
    user?.isPremiumUser ||
    credits >= 100 ||
    user?.autoRechargePaymentMethodId ||
    user?.autoRechargeEnabled
  );
  const isAccessAllowedPath = (() => {
    if (location.pathname.startsWith('/external/studio') && isExternalUser) return true;
    if (location.pathname.startsWith('/account') || location.pathname.startsWith('/accounts')) return true;
    if (location.pathname === '/image_sessions' && user) return true;
    const allowed = new Set([
      '/login',
      '/register',
      '/forgot_password',
      '/reset_password',
      '/verify',
      '/verify_email',
      '/extension-auth',
      '/payment_success',
      '/payment_cancel',
      '/create_payment',
      '/generations',
      '/image/studio',
      '/iamge/studio',
    ]);
    return allowed.has(location.pathname);
  })();

  useEffect(() => {
    if (!userInitiated || userFetching) return;
    if (isExternalUser) {
      if (location.pathname !== '/external/studio' && location.pathname !== '/verify') {
        navigate('/external/studio', { replace: true });
      }
      return;
    }
    if (hasStudioAccess) return;
    if (isAccessAllowedPath) return;

    const redirectTarget = user ? '/account/billing' : '/login';
    if (location.pathname !== redirectTarget) {
      navigate(redirectTarget, { replace: true });
    }
  }, [userInitiated, userFetching, hasStudioAccess, isAccessAllowedPath, user, location.pathname, navigate, isExternalUser]);

  const appendQueryParams = useCallback((url) => {
    const paramsString = extraProps.toString();
    return paramsString ? `${url}?${paramsString}` : url;
  }, [extraProps]);

  const navigateToDefaultAuthenticatedView = useCallback(() => {
    navigate(appendQueryParams('/generations'), { replace: true });
  }, [appendQueryParams, navigate]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return undefined;
    }

    const channel = new BroadcastChannel('oauth_channel');
    channel.onmessage = (event) => {
      if (event.data === 'oauth_complete') {
        getUserAPI();
        const redirectTarget = consumePostAuthRedirect();
        if (redirectTarget) {
          navigate(redirectTarget, { replace: true });
          return;
        }
        navigateToDefaultAuthenticatedView();
      }
    };

    return () => {
      channel.close();
    };
  }, [getUserAPI, navigate, navigateToDefaultAuthenticatedView]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const loginToken = queryParams.get('loginToken');

    if (!loginToken || location.pathname === '/verify') {
      return;
    }

    const exchangeLoginToken = async () => {
      try {
        const response = await axios.get(`${PROCESSOR_SERVER}/users/verify_token`, {
          params: { loginToken },
        });
        const resolvedAuthToken = response?.data?.authToken;
        if (resolvedAuthToken) {
          persistAuthToken(resolvedAuthToken);
          await getUserAPI();

          const redirectTarget = consumePostAuthRedirect();
          if (redirectTarget) {
            navigate(redirectTarget, { replace: true });
            return;
          }

          getOrCreateUserSession();
          return;
        }
      } catch (error) {
        
      }
    };

    void exchangeLoginToken();
  }, [location.pathname, location.search, getUserAPI, navigate]);

  let bodyBGColor = "bg-stone-100";
  
  if (colorMode === 'dark') {
    bodyBGColor = "bg-[#0b1021] text-slate-100";
  } else {
    bodyBGColor = "bg-[#f7f9fc] text-slate-900";
  }
  return (
    <div className={bodyBGColor}>
      <Suspense fallback={<div className="min-h-screen bg-inherit" />}>
        <Routes>
          <Route
            path="/"
            element={user && user._id && userInitiated && !userFetching
              ? <Navigate to="/generations" replace />
              : <VideoEditorLandingHome />}
          />
          <Route path="/generations" element={<GenerationsHome />} />
          <Route path="/session/:id" element={<EditorHome />} />
          <Route path="/video" element={isMobile ? <MobileVideoLandingHome /> : <VideoEditorLandingHome />} />
          <Route path="/video/:id" element={isMobile ? <MobileVideoHome /> : <VideoHome />} />
          <Route path="/image/studio" element={<ImageStudioLandingHome />} />
          <Route path="/image/studio/:id" element={<ImageStudioHome />} />
          <Route path="/iamge/studio" element={<ImageStudioLandingHome />} />
          <Route path="/iamge/studio/:id" element={<ImageStudioHome />} />
          <Route path="/external/studio" element={<ExternalStudioDashboard />} />
          <Route path="/quick_video/:id" element={isMobile ? <OneshotEditorContainer /> : <QuickEditorContainer />} />
          <Route path="/quick_video" element={isMobile ? <OneshotEditorContainer /> : <QuickEditorLandingHome />} />
          <Route path="/vidgpt" element={<OneshotEditorContainer />} />
          <Route path="/vidgpt/:id" element={<OneshotEditorContainer />} />
          <Route path="/vidgenie" element={<OneshotEditorContainer />} />
          <Route path="/vidgenie/:id" element={<OneshotEditorContainer />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot_password" element={<ForgotPasswordPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/extension-auth" element={<ExtensionAuthBridge />} />
          <Route path="/adcreator" element={<AdVideoCreatorContainer />} />
          <Route path="/adcreator/:id" element={<AdVideoCreatorContainer />} />
          <Route path="/reset_password" element={<ResetPasswordPage />} />
          <Route path="/videogpt" element={<OneshotEditorContainer />} />
          <Route path="/videogpt/:id" element={<OneshotEditorContainer />} />
          <Route path="/movie_maker" element={<MovieGeneratorContainer />} />
          <Route path="/movie_maker/:id" element={<MovieGeneratorContainer />} />
          <Route path="/my_sessions" element={<ListVideoSessions />} />
          <Route path="/image_sessions" element={<ListImageSessions />} />
          <Route path="/create_payment" element={<CreatePayment />} />
          <Route path="/account/*" element={<UserAccount />} />
          <Route path="/publication/:id" element={<PublicationHome />} />
          <Route path="/verify" element={<VerificationHome />} />
          <Route path="/verify_email" element={<EmailVerificationHome />} />
          <Route path="/payment_success" element={<PaymentsSuccess />} />
          <Route path="/payment_cancel" element={<PaymentsFailure />} />
        </Routes>
      </Suspense>
    </div>
  );
}
