import React, { useEffect, useState } from 'react';
import { SignInButton, useProfile, useSignIn } from '@farcaster/auth-kit';
import { useUser } from '../../contexts/UserContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './landing.css';
import ListProduct from '../product/ListProduct.tsx';

export default function PublicLanding() {


  const {
    isAuthenticated,
    profile,
  } = useProfile();

  const { setUserApi, user, setUser } = useUser();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [userProfileData, setUserProfileData] = useState({});



  const setUserProfile = (profile) => {
    if (!isProcessing) {
      setIsProcessing(true);
      setUserProfileData(profile);
    }
  }



  useEffect(() => {


  }, [isProcessing, userProfileData]);

  return (
    <div>
      <div className=' bg-stone-200 rounded-lg m-auto text-center w-full pt-[50px] pb-[50px]'>
      </div>
      <div>
        <ListProduct />
      </div>
    </div>
  )
}