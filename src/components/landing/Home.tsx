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
import VideoHome from "../video/VideoHome.js";
import MobileVideoHome from "../mobile/MobileVideoHome.js";
import AppHome from "./AppHome.tsx";
import { getHeaders } from '../../utils/web.js';
import { useUser } from "../../contexts/UserContext";
import VideoEditorLandingHome from "../video/VideoEditorLandingHome.js";
import ListVideoSessions from "../video/sessions/ListVideoSessions.js";
import QuickEditorContainer from "../quick_editor/QuickEditorContainer.js";
import EmailVerificationHome from "../verification/EmailVerificationHome.js";
import OneshotEditorContainer from '../oneshot_editor/OneshotEditorContainer.js';
import OnshotEditorCreator from '../oneshot_editor/OnshotEditorCreator.js';
import QuickEditorLandingHome from "../quick_editor/QuickEditorLandingHome.js";
import MobileVideoLandingHome from "../mobile/MobileVideoLandingHome.js";
import LoginPage from "../auth/pages/LoginPage.js";
import RegisterPage from "../auth/pages/RegisterPage.js";

import PaymentsSuccess from "../payments/PaymentsSuccess.js";
import PaymentsFailure from "../payments/PaymentsFailure.js";
import CreatePayment from "../payments/CreatePayment.js";
import MovieGeneratorContainer from "../movie_gen/MovieGeneratorContainer.js";
import { useColorMode } from "../../contexts/ColorMode.js";

const PROCESSOR_SERVER = process.env.REACT_APP_PROCESSOR_API;

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
        if (currentMediaFlowPath && currentMediaFlowPath === 'quick_video') {
          const finalUrl = appendQueryParams(`/quick_video/${sessionData._id}`);
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
  console.log(colorMode);
  
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
        <Route path="/quick_video/:id" element={isMobile ? <MobileVideoHome /> : <QuickEditorContainer />} />
        <Route path="/quick_video" element={isMobile ? <MobileVideoLandingHome /> : <QuickEditorLandingHome />} />
        <Route path="/vidgpt" element={<OneshotEditorContainer />} />
        <Route path="/vidgpt/:id" element={<OneshotEditorContainer />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
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
