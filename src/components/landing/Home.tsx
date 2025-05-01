import React, { useEffect, useState } from "react";
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import axios from "axios";
import 'react-tooltip/dist/react-tooltip.css';


import CommonContainer from "../common/CommonContainer.tsx";
import EditorHome from "../editor/EditorHome.tsx";
import EditorLanding from '../editor/EditorLanding.tsx';
import UserAccount from "../account/UserAccount.tsx";
import ListProduct from "../product/ListProduct.tsx";
import PublicationHome from "../publication/PublicationHome.tsx";
import VerificationHome from "../verification/VerificationHome.tsx";
import VideoHome from "../video/VideoHome.jsx";
import MobileVideoHome from "../mobile/MobileVideoHome.jsx";
import AppHome from "./AppHome.tsx";
import { getHeaders } from '../../utils/web.jsx';
import { useUser } from "../../contexts/UserContext";
import VideoEditorLandingHome from "../video/VideoEditorLandingHome.jsx";
import ListVideoSessions from "../video/sessions/ListVideoSessions.jsx";
import QuickEditorContainer from "../quick_editor/QuickEditorContainer.jsx";
import EmailVerificationHome from "../verification/EmailVerificationHome.jsx";
import OneshotEditorContainer from '../oneshot_editor/OneshotEditorContainer.jsx';
import OnshotEditorCreator from '../oneshot_editor/OnshotEditorCreator.jsx';
import QuickEditorLandingHome from "../quick_editor/QuickEditorLandingHome.jsx";
import MobileVideoLandingHome from "../mobile/MobileVideoLandingHome.jsx";
import LoginPage from "../auth/pages/LoginPage.jsx";
import RegisterPage from "../auth/pages/RegisterPage.jsx";
import AdVideoCreatorContainer from "../advideo_creator/AdVideoCreatorContainer.jsx";
import AdVideoCreator from "../advideo_creator/AdVideoCreator.jsx";

import PaymentsSuccess from "../payments/PaymentsSuccess.jsx";
import PaymentsFailure from "../payments/PaymentsFailure.jsx";
import CreatePayment from "../payments/CreatePayment.jsx";
import MovieGeneratorContainer from "../movie_gen/MovieGeneratorContainer.jsx";
import { useColorMode } from "../../contexts/ColorMode.jsx";

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function Home() {
  const { getUser, getUserAPI } = useUser();
  const navigate = useNavigate();
  const location = useLocation(); 
  const isMobile = useMediaQuery({ query: '(max-width: 767px)' });

  const { colorMode } = useColorMode();
  const [extraProps, setExtraProps] = useState({});

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    setExtraProps(queryParams);

  }, [location.search]); 

  useEffect(() => {
    getUserAPI();
  }, []);

  const channel = new BroadcastChannel('oauth_channel');
  channel.onmessage = (event) => {
    if (event.data === 'oauth_complete') {

      getUserAPI();
      getOrCreateUserSession();
    }
  };

  const appendQueryParams = (url) => {


    const paramsString = extraProps.toString();
    return paramsString ? `${url}?${paramsString}` : url;
  };

  const getOrCreateUserSession = () => {
    const headers = getHeaders();
    axios.get(`${PROCESSOR_SERVER}/video_sessions/get_session`, headers).then((res) => {
      const sessionData = res.data;
      if (sessionData) {
        localStorage.setItem('videoSessionId', sessionData._id);
        let currentMediaFlowPath = localStorage.getItem('currentMediaFlowPath');
        if (currentMediaFlowPath && currentMediaFlowPath === 'vidgpt') {
          const finalUrl = appendQueryParams(`/vidgpt/${sessionData._id}`);
          navigate(finalUrl);
        } else {
          const finalUrl = appendQueryParams(`/video/${sessionData._id}`);
          navigate(finalUrl);
        }
      } else {
    
    //    localStorage.setItem("setAskForPaymentModal", "true");

        navigate(appendQueryParams('/my_sessions'));
      }
    }).catch(function(err) {
      console.log(err);
      localStorage.removeItem("authToken");
      localStorage.removeItem("videoSessionId");
      navigate("/");
    });
  };

  let bodyBGColor = "bg-stone-100";
  
  if (colorMode === 'dark') {
    bodyBGColor = "bg-gray-900";
  }
  return (
    <div className={bodyBGColor}>
      <Routes>
        <Route path="/" element={<VideoEditorLandingHome />} />
        <Route path="/session/:id" element={<EditorHome />} />
        <Route path="/video" element={isMobile ? <MobileVideoLandingHome /> : <VideoEditorLandingHome />} />
        <Route path="/video/:id" element={isMobile ? <MobileVideoHome /> : <VideoHome />} />
        <Route path="/quick_video/:id" element={isMobile ? <OneshotEditorContainer /> : <QuickEditorContainer />} />
        <Route path="/quick_video" element={isMobile ? <OneshotEditorContainer /> : <QuickEditorLandingHome />} />
        <Route path="/vidgpt" element={<OneshotEditorContainer />} />
        <Route path="/vidgpt/:id" element={<OneshotEditorContainer />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/vidgenie" element={<OneshotEditorContainer />} />
        <Route path="/vidgenie/:id" element={<OneshotEditorContainer />} />
        <Route path="/adcreator" element={<AdVideoCreatorContainer />} />
        <Route path="/adcreator/:id" element={<AdVideoCreatorContainer />} />

        <Route path="/videogpt" element={<OneshotEditorContainer />} />
        <Route path="/videogpt/:id" element={<OneshotEditorContainer />} />
        <Route path="/movie_maker" element={<MovieGeneratorContainer />} />
        <Route path="/movie_maker/:id" element={<MovieGeneratorContainer />} />

        <Route path="/my_sessions" element={<ListVideoSessions />} />
        <Route path="/create_payment" element={<CreatePayment />} />
        <Route path="/account" element={<UserAccount />} />
        <Route path="/publication/:id" element={<PublicationHome />} />
        <Route path="/verify" element={<VerificationHome />} />
        <Route path="/verify_email" element={<EmailVerificationHome />} />
        <Route path="/payment_success" element={<PaymentsSuccess />} />
        <Route path="/payment_cancel" element={<PaymentsFailure />} />



        {/* Add more routes as needed */}
      </Routes>
    </div>
  );
}
