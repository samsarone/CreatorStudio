import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import axios from "axios";
import 'react-tooltip/dist/react-tooltip.css';


import { consumePostAuthRedirect, getAuthToken, getHeaders, persistAuthToken } from '../../utils/web.jsx';
import {
  hasNoGenerationCredits,
  hasStudioAccess as userHasStudioAccess,
} from '../../utils/defaultRoutes.js';
import {
  appendRouteSearch,
  resolveAuthenticatedEntryPath,
  upsertRouteSearchParam,
} from '../../utils/vidgenieRouting.js';
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

function RouteLoadingScreen({ label = 'Loading...' }) {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  return (
    <div
      className={`flex min-h-screen items-center justify-center ${
        isDark
          ? 'bg-[#0b1021] text-slate-100'
          : 'bg-[#f7f9fc] text-slate-700'
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className={`h-10 w-10 animate-spin rounded-full border-4 border-t-transparent ${
            isDark ? 'border-cyan-300/70' : 'border-sky-500/70'
          }`}
          aria-hidden="true"
        />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}

function DefaultAuthenticatedRoute({ user, isMobile, search }) {
  const [targetPath, setTargetPath] = useState(null);
  const resolutionStartedRef = useRef(false);

  useEffect(() => {
    if (!user?._id || resolutionStartedRef.current) {
      return;
    }

    const headers = getHeaders();
    if (!headers) {
      setTargetPath(appendRouteSearch('/login', search));
      return;
    }

    resolutionStartedRef.current = true;

    const resolveRoute = async () => {
      try {
        const resolvedPath = await resolveAuthenticatedEntryPath({
          user,
          isMobile,
          apiServer: PROCESSOR_SERVER,
          headers,
          search,
          createIfMissing: true,
        });
        setTargetPath(resolvedPath || appendRouteSearch('/vidgenie', search));
      } catch (error) {
        setTargetPath(appendRouteSearch('/vidgenie', search));
      }
    };

    void resolveRoute();
  }, [isMobile, search, user]);

  if (targetPath) {
    return <Navigate to={targetPath} replace />;
  }

  return <RouteLoadingScreen label="Opening VidGenie..." />;
}

export default function Home() {
  const { user, getUserAPI, userFetching, userInitiated } = useUser();
  const navigate = useNavigate();
  const location = useLocation(); 
  const isMobile = useMediaQuery({ query: '(max-width: 767px)' });

  const { colorMode } = useColorMode();
  const [extraProps, setExtraProps] = useState(() => new URLSearchParams());
  const initialUserFetchStartedRef = useRef(false);
  const initialEntryRef = useRef(null);
  if (initialEntryRef.current === null && typeof window !== 'undefined') {
    const initialSearchParams = new URLSearchParams(window.location.search);
    initialEntryRef.current = {
      pathname: window.location.pathname,
      search: window.location.search,
      hasAuthToken: Boolean(getAuthToken()),
      hasLoginToken: Boolean(initialSearchParams.get('loginToken')),
    };
  }
  const shouldResolveInitialAuthenticatedRoot =
    Boolean(initialEntryRef.current?.hasAuthToken) &&
    !initialEntryRef.current?.hasLoginToken &&
    initialEntryRef.current?.pathname === '/';
  const [initialAuthenticatedRootStatus, setInitialAuthenticatedRootStatus] = useState(
    shouldResolveInitialAuthenticatedRoot ? 'pending' : 'done'
  );

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    queryParams.delete('loginToken');
    queryParams.delete('authToken');
    setExtraProps(queryParams);
  }, [location.search]);

  useEffect(() => {
    if (shouldResolveInitialAuthenticatedRoot && initialAuthenticatedRootStatus === 'pending') {
      return;
    }

    if (initialUserFetchStartedRef.current) {
      return;
    }

    const queryParams = new URLSearchParams(location.search);
    const loginToken = queryParams.get('loginToken');
    if (loginToken && location.pathname !== '/verify') {
      return;
    }
    initialUserFetchStartedRef.current = true;
    getUserAPI();
  }, [
    getUserAPI,
    initialAuthenticatedRootStatus,
    location.pathname,
    location.search,
    shouldResolveInitialAuthenticatedRoot,
  ]);

  const isExternalUser = Boolean(user?.isExternalUser);
  const hasStudioAccess = Boolean(
    isExternalUser ||
    userHasStudioAccess(user)
  );
  const isVidgeniePath = location.pathname.startsWith('/vidgenie');
  const isAccessAllowedPath = (() => {
    if (location.pathname.startsWith('/external/studio') && isExternalUser) return true;
    if (user && isVidgeniePath) return true;
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
    if (initialAuthenticatedRootStatus === 'pending') return;
    if (!userInitiated || userFetching) return;
    if (location.pathname === '/') return;
    if (isExternalUser) {
      if (location.pathname !== '/external/studio' && location.pathname !== '/verify') {
        navigate('/external/studio', { replace: true });
      }
      return;
    }
    if (hasStudioAccess) return;
    if (isAccessAllowedPath) return;

    const redirectTarget = user && hasNoGenerationCredits(user)
      ? '/vidgenie?purchaseCredits=1'
      : user
        ? '/account/billing'
        : '/login';
    if (location.pathname !== redirectTarget) {
      navigate(redirectTarget, { replace: true });
    }
  }, [initialAuthenticatedRootStatus, userInitiated, userFetching, hasStudioAccess, isAccessAllowedPath, user, location.pathname, navigate, isExternalUser]);

  const appendQueryParams = useCallback((url) => {
    const paramsString = extraProps.toString();
    return paramsString ? `${url}?${paramsString}` : url;
  }, [extraProps]);
  const sanitizedRouteSearch = extraProps.toString() ? `?${extraProps.toString()}` : '';

  const navigateToDefaultAuthenticatedView = useCallback(async (resolvedUser = user) => {
    const headers = getHeaders();
    if (!headers) {
      navigate(appendQueryParams('/login'), { replace: true });
      return;
    }

    const resolvedSearch = hasNoGenerationCredits(resolvedUser)
      ? upsertRouteSearchParam(sanitizedRouteSearch, 'purchaseCredits', '1')
      : sanitizedRouteSearch;
    const targetPath = await resolveAuthenticatedEntryPath({
      user: resolvedUser,
      isMobile,
      apiServer: PROCESSOR_SERVER,
      headers,
      search: resolvedSearch,
      createIfMissing: true,
    });
    navigate(targetPath || appendQueryParams('/vidgenie'), { replace: true });
  }, [appendQueryParams, isMobile, navigate, sanitizedRouteSearch, user]);

  useEffect(() => {
    if (!shouldResolveInitialAuthenticatedRoot || initialAuthenticatedRootStatus !== 'pending') {
      return undefined;
    }

    let isCancelled = false;

    const resolveInitialRoute = async () => {
      initialUserFetchStartedRef.current = true;

      try {
        const resolvedUser = userInitiated && !userFetching ? user : await getUserAPI();
        if (isCancelled) return;

        if (!resolvedUser?._id) {
          navigate('/login', { replace: true });
          return;
        }

        if (resolvedUser.isExternalUser) {
          navigate('/external/studio', { replace: true });
          return;
        }

        const resolvedHasStudioAccess = userHasStudioAccess(resolvedUser);
        if (!resolvedHasStudioAccess && !hasNoGenerationCredits(resolvedUser)) {
          navigate('/account/billing', { replace: true });
          return;
        }

        const headers = getHeaders();
        if (!headers) {
          navigate('/login', { replace: true });
          return;
        }

        const resolvedSearch = !resolvedHasStudioAccess && hasNoGenerationCredits(resolvedUser)
          ? upsertRouteSearchParam(sanitizedRouteSearch, 'purchaseCredits', '1')
          : sanitizedRouteSearch;
        const targetPath = await resolveAuthenticatedEntryPath({
          user: resolvedUser,
          isMobile,
          apiServer: PROCESSOR_SERVER,
          headers,
          search: resolvedSearch,
          createIfMissing: true,
        });
        if (isCancelled) return;

        navigate(targetPath || '/vidgenie', { replace: true });
      } finally {
        if (!isCancelled) {
          setInitialAuthenticatedRootStatus('done');
        }
      }
    };

    void resolveInitialRoute();

    return () => {
      isCancelled = true;
    };
  }, [
    getUserAPI,
    initialAuthenticatedRootStatus,
    isMobile,
    navigate,
    sanitizedRouteSearch,
    shouldResolveInitialAuthenticatedRoot,
    user,
    userFetching,
    userInitiated,
  ]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return undefined;
    }

    const channel = new BroadcastChannel('oauth_channel');
    channel.onmessage = async (event) => {
      if (event.data === 'oauth_complete') {
        const resolvedUser = await getUserAPI();
        const redirectTarget = consumePostAuthRedirect();
        if (redirectTarget) {
          navigate(redirectTarget, { replace: true });
          return;
        }
        void navigateToDefaultAuthenticatedView(resolvedUser);
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
          const resolvedUser = await getUserAPI();

          const redirectTarget = consumePostAuthRedirect();
          if (redirectTarget) {
            navigate(redirectTarget, { replace: true });
            return;
          }

          void navigateToDefaultAuthenticatedView(resolvedUser);
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
  const rootAuthenticatedSearch = !hasStudioAccess && hasNoGenerationCredits(user)
    ? upsertRouteSearchParam(sanitizedRouteSearch, 'purchaseCredits', '1')
    : sanitizedRouteSearch;

  if (initialAuthenticatedRootStatus === 'pending') {
    return (
      <div className={bodyBGColor}>
        <RouteLoadingScreen label="Opening VidGenie..." />
      </div>
    );
  }

  return (
    <div className={bodyBGColor}>
      <Suspense fallback={<RouteLoadingScreen />}>
        <Routes>
          <Route
            path="/"
            element={
              !userInitiated || userFetching
                ? <RouteLoadingScreen />
                : user && user._id
                  ? !hasStudioAccess && !hasNoGenerationCredits(user)
                    ? <Navigate to="/account/billing" replace />
                    : <DefaultAuthenticatedRoute user={user} isMobile={isMobile} search={rootAuthenticatedSearch} />
                  : <VideoEditorLandingHome />
            }
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
