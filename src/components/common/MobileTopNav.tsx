import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext';
import CommonButton from './CommonButton.tsx';
import { useNavigate } from 'react-router-dom';
import { useAlertDialog } from '../../contexts/AlertDialogContext';
import { IoMdLogIn } from 'react-icons/io';
import ToggleButton from './ToggleButton.tsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import Login from '../auth/Login.tsx';
import UpgradePlan from '../payments/UpgradePlan.tsx';
import AddSessionDropdown from './AddSessionDropdown.jsx';
import './common.css';
import { FaStar } from 'react-icons/fa6';
import AuthContainer from '../auth/AuthContainer.jsx';
import { getHeaders } from '../../utils/web.jsx';
import BrandLogo from './BrandLogo.tsx';

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function MobileTopNav(props) {
  const { resetCurrentSession, addCustodyAddress, addNewVidGPTSession } = props;
  const farcasterSignInButtonRef = useRef(null);
  const { colorMode } = useColorMode();
  const { openAlertDialog, closeAlertDialog } = useAlertDialog();

  const navShell =
    colorMode === 'dark'
      ? 'bg-gradient-to-r from-[#080f21] via-[#0d1830] to-[#091026] text-slate-100 border-b border-[#1f2a3d] shadow-[0_14px_32px_rgba(0,0,0,0.38)]'
      : 'bg-gradient-to-r from-[#e9edf7] via-[#dfe7f5] to-[#eef3fb] text-slate-900 border-b border-[#d7deef] shadow-[0_8px_22px_rgba(15,23,42,0.08)]';

  const resetSession = () => {
    closeAlertDialog();
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
    openAlertDialog(loginComponent);
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

  const gotoViewSessionsPage = () => {
    navigate('/my_sessions');
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
        <div className="text-rose-200">
          <FaStar className="inline-flex text-rose-300" /> Premium
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
          className="m-auto text-center min-w-16 rounded-lg shadow-sm text-slate-100 bg-[#111a2f] border border-[#1f2a3d] pl-8 pr-8 pt-1 pb-2 font-bold text-lg hover:border-rose-400/40 hover:text-rose-100"
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
        <AddSessionDropdown createNewSession={createNewSessionDialog} gotoViewSessionsPage={gotoViewSessionsPage} 
        addNewVidGPTSession={addNewVidGPTSession} 
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
