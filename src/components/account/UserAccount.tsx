import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaChevronCircleLeft, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import CommonContainer from "../common/CommonContainer.tsx";
import { useColorMode } from "../../contexts/ColorMode.js";
import { useUser } from "../../contexts/UserContext.js";
import SecondaryButton from "../common/SecondaryButton.tsx";
import { useAlertDialog } from "../../contexts/AlertDialogContext.js";
import AddCreditsDialog from "./AddCreditsDialog.js";
import UpgradePlan from "../common/UpgradePlan.tsx";
import { getHeaders } from "../../utils/web.js";
import MusicPanelContent from "./MusicPanelContent.js";
import ImagePanelContent from "./ImagePanelContent.js";
import SettingsPanelContent from "./SettingsPanelContent.js";
import BillingPanelContent from "./BillingPanelContent.js";
import ToggleButton from "../common/ToggleButton.tsx";
import SceneLibraryHome from "../library/aivideo/SceneLibraryHome.js";
import OverflowContainer from "../common/OverflowContainer.tsx";
import APIKeysPanelContent from "./APIKeysPanelContent.js";
import SingleSelect from "../common/SingleSelect.js";

import { INFERENCE_MODEL_TYPES } from "../../constants/Types.ts";
const PROCESSOR_SERVER = process.env.REACT_APP_PROCESSOR_API;

export default function UserAccount() {
  const { colorMode } = useColorMode();
  const { user, resetUser, getUserAPI } = useUser();
  const { openAlertDialog, closeAlertDialog } = useAlertDialog();
  const navigate = useNavigate();

  // Color style classes
  const textColor = colorMode === "dark" ? "text-neutral-100" : "text-neutral-800";
  const bgColor = colorMode === "dark" ? "bg-neutral-900" : "bg-neutral-100";
  const secondaryTextColor = colorMode === "dark" ? "text-neutral-400" : "text-neutral-500";
  const cardBgColor = colorMode === "dark" ? "bg-neutral-800" : "bg-white";

  // Panel state
  const [displayPanel, setDisplayPanel] = useState("account");

  // 1) Local states for new form fields
  //    Initialize them from user model if `user` is available
  const [notifyOnCompletion, setNotifyOnCompletion] = useState(false);
  const [inferenceModel, setInferenceModel] = useState(INFERENCE_MODEL_TYPES[0]);

  const [assistantModel, setAssistantModel] = useState(INFERENCE_MODEL_TYPES[0]);

  useEffect(() => {
    if (user) {

      const userInferenceModel = user.selectedInferenceModel || "GPT4O";
      const userInferenceModelOption = INFERENCE_MODEL_TYPES.find((model) => model.value === userInferenceModel);
      setNotifyOnCompletion(!!user.selectedNotifyOnCompletion);
      setInferenceModel(userInferenceModelOption);

      const userAssistantModel = user.selectedAssistantModel || "GPT4O";
      const userAssistantModelOption = INFERENCE_MODEL_TYPES.find((model) => model.value === userAssistantModel);
      setAssistantModel(userAssistantModelOption);
    }
  }, [user]);

  // If no user found, return an empty span (or redirect)
  if (!user) {
    return <span />;
  }

  // For account type and button
  let accountType = "Free";
  let accountActions = <span />;

  if (user.isPremiumUser) {
    accountType = "Premium";
    accountActions = (
      <SecondaryButton onClick={() => handleCancelMembership()}>
        Cancel Membership
      </SecondaryButton>
    );
  } else {
    accountActions = (
      <SecondaryButton onClick={() => handleUpgradeToPremium()}>
        Upgrade to Premium
      </SecondaryButton>
    );
  }

  // ====== START: Endpoint Calls ======
  const updateUserDetails = (payload) => {
    const headers = getHeaders();
    axios
      .post(`${PROCESSOR_SERVER}/users/update`, payload, headers)
      .then(function (dataRes) {
        toast.success("User details updated successfully!", {
          position: "bottom-center",
        });
        // Optionally, re-fetch updated user details so the context is current
        getUserAPI();
      })
      .catch(function (error) {
        console.error("Error updating user details", error);
        toast.error("Failed to update user details", {
          position: "bottom-center",
        });
      });
  };

  const purchaseCreditsForUser = (amountToPurchase) => {
    const purchaseAmountRequest = parseInt(amountToPurchase);
    const headers = getHeaders();

    const payload = { amount: purchaseAmountRequest };

    axios
      .post(`${PROCESSOR_SERVER}/users/purchase_credits`, payload, headers)
      .then(function (dataRes) {
        const data = dataRes.data;
        if (data.url) {
          window.open(data.url, "_blank");
          toast.success("Payment URL generated successfully!", {
            position: "bottom-center",
          });
        } else {
          console.error("Failed to get Stripe payment URL");
          toast.error("Failed to generate payment URL", {
            position: "bottom-center",
          });
        }
      })
      .catch(function (error) {
        console.error("Error during payment process", error);
        toast.error("Payment process failed", {
          position: "bottom-center",
        });
      });
  };

  const requestApplyCreditsCoupon = (couponCode) => {
    const headers = getHeaders();

    axios
      .post(
        `${PROCESSOR_SERVER}/users/apply_credits_coupon`,
        { couponCode: couponCode },
        headers
      )
      .then(function () {
        toast.success("Coupon applied successfully!", {
          position: "bottom-center",
        });
        // Optionally, re-fetch updated user details
        getUserAPI();
      })
      .catch(function (error) {
        console.error("Error applying coupon", error);
        toast.error("Failed to apply coupon", {
          position: "bottom-center",
        });
      });
  };

  const showPurchaseCreditsAction = () => {
    openAlertDialog(
      <div>
        <FaTimes className="absolute top-2 right-2 cursor-pointer" onClick={closeAlertDialog} />
        <AddCreditsDialog
          purchaseCreditsForUser={purchaseCreditsForUser}
          requestApplyCreditsCoupon={requestApplyCreditsCoupon}
        />
      </div>
    );
  };

  const handleUpgradeToPremium = () => {
    const alertDialogComponent = <UpgradePlan />;
    openAlertDialog(
      <div>
        <FaTimes className="absolute top-2 right-2 cursor-pointer" onClick={closeAlertDialog} />
        {alertDialogComponent}
      </div>
    );
  };

  const handleCancelMembership = () => {
    const headers = getHeaders();
    axios
      .post(`${PROCESSOR_SERVER}/users/cancel_membership`, {}, headers)
      .then(function () {
        getUserAPI();
        toast.success("Membership canceled successfully!", {
          position: "bottom-center",
        });
      })
      .catch(function () {
        toast.error("Failed to cancel membership", {
          position: "bottom-center",
        });
      });
  };

  const logoutUser = () => {
    resetUser();
    navigate("/");
    toast.success("Logged out successfully!", {
      position: "bottom-center",
    });
  };

  const deleteAllGenerationsForUser = () => {
    axios
      .post(`${PROCESSOR_SERVER}/users/delete_generations`, {}, getHeaders())
      .then(function () {
        toast.success("All generations deleted successfully!", {
          position: "bottom-center",
        });
      });
  };

  const deleteAllProjectsForUser = () => {
    axios
      .post(`${PROCESSOR_SERVER}/users/delete_projects`, {}, getHeaders())
      .then(function () {
        toast.success("All projects deleted successfully!", {
          position: "bottom-center",
        });
      });
  };

  const deleteAccountForUser = () => {
    axios
      .post(`${PROCESSOR_SERVER}/users/delete_user`, {}, getHeaders())
      .then(function () {
        toast.success("Account deleted successfully!", {
          position: "bottom-center",
        });
        resetUser();
        navigate("/");
      });
  };
  // ====== END: Endpoint Calls ======

  // 2) Change handlers for our fields
  const handleNotifyOnCompletionChange = (event) => {
    const newVal = event.target.checked;
    setNotifyOnCompletion(newVal);
    updateUserDetails({ selectedNotifyOnCompletion: newVal });
  };

  const handleInferenceModelChange = (newVal) => {
    setInferenceModel(newVal);
    updateUserDetails({ selectedInferenceModel: newVal.value });
  };

  const handleAssistantModelChange = (newVal) => {
    setAssistantModel(newVal);
    updateUserDetails({ selectedAssistantModel: newVal.value });
  }


  // Render label for current panel in the header
  let currentPageLabel = "Account Information";
  if (displayPanel === "images") {
    currentPageLabel = "Image Library";
  } else if (displayPanel === "sounds") {
    currentPageLabel = "Sound Library";
  } else if (displayPanel === "scenes") {
    currentPageLabel = "Scene Library";
  } else if (displayPanel === "videos") {
    currentPageLabel = "Video Library";
  } else if (displayPanel === "apiKeys") {
    currentPageLabel = "API Keys";
  } else if (displayPanel === "billing") {
    currentPageLabel = "Billing Information";
  } else if (displayPanel === "settings") {
    currentPageLabel = "Settings";
  }

  // 3) Render the "Notify on completion" checkbox only if the user is verified
  let confirmationEmailActions = <span />;
  if (user.isEmailVerified) {
    confirmationEmailActions = (
      <div className="mt-4">
        <div className="text-sm font-bold mt-2 mb-2">Email Notifications</div>
        <label className="flex items-center cursor-pointer m-auto">
          <input
            type="checkbox"
            checked={notifyOnCompletion}
            onChange={handleNotifyOnCompletionChange}
            className="mr-2"
          />
          <span>Send Email Notifications on render</span>
        </label>
      </div>
    );
  }

  return (
    <OverflowContainer>
      {/* Toast container */}
      <ToastContainer />

      <div className={`pt-[50px] ${bgColor} ${textColor}`}>
        <div className="flex min-h-[100vh]">
          {/* Left Navigation */}
          <nav className={`w-32 p-4 ${bgColor} ${textColor} rounded-l-lg shadow-md border-r`}>
            <ul className="w-32 relative">
              <li className="mb-4 cursor-pointer" onClick={() => setDisplayPanel("account")}>
                Account
              </li>
              <li className="mb-4 cursor-pointer" onClick={() => setDisplayPanel("images")}>
                Images
              </li>
              <li className="mb-4 cursor-pointer" onClick={() => setDisplayPanel("sounds")}>
                Sounds
              </li>
              <li className="mb-4 cursor-pointer" onClick={() => setDisplayPanel("scenes")}>
                Scenes
              </li>
              <li className="mb-4 cursor-pointer" onClick={() => setDisplayPanel("videos")}>
                Videos
              </li>
              <li className="mb-4 cursor-pointer" onClick={() => setDisplayPanel("apiKeys")}>
                API Keys
              </li>
              <li className="mb-4 cursor-pointer" onClick={() => setDisplayPanel("billing")}>
                Billing
              </li>
              <li className="mb-4 cursor-pointer" onClick={() => setDisplayPanel("settings")}>
                Settings
              </li>
            </ul>
          </nav>

          {/* Panel Content */}
          <div className={`${bgColor} ${textColor} p-6 rounded-r-lg shadow-md flex-grow flex flex-col`}>
            {/* Header */}
            <div className="flex items-center mb-6">
              <div className="flex-1 text-left">
                <div onClick={() => navigate("/")} className="cursor-pointer flex items-center">
                  <FaChevronCircleLeft className="mr-2" />
                  <span>Back</span>
                </div>
              </div>
              <div className="flex-1 flex justify-center items-center">
                <h2 className="text-2xl font-bold">{currentPageLabel}</h2>
              </div>
              <div className="flex-1"></div>
            </div>

            {/* Render panel content dynamically */}
            {displayPanel === "account" && (
              <div className="flex flex-col flex-grow">
                {/* User Info and Toggle Button Row */}
                <div className="flex items-center justify-between mb-8">
                  {/* Profile Information */}
                  <div className="flex items-center">
                    {user.profilePicture && (
                      <img
                        src={user.profilePicture}
                        alt="Profile"
                        className="w-16 h-16 rounded-full object-cover mr-4"
                      />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold">{user.username}</h2>
                      <p className={`text-sm ${secondaryTextColor}`}>{user.email}</p>
                    </div>
                  </div>
                  {/* Toggle Button */}
                  <ToggleButton />
                </div>

                {/* Account Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
                  {/* Account Type */}
                  <div className={`p-6 rounded-lg shadow-md ${cardBgColor} ${textColor}`}>
                    <h3 className="text-lg font-semibold mb-2">Account Type</h3>
                    <p>{accountType}</p>
                    <div className="mt-4">{accountActions}</div>

                    {confirmationEmailActions}

                    <div className="mt-4">
                      <div className="text-sm font-bold mt-2 mb-2">Assistant Model</div>
                      <SingleSelect
                        options={INFERENCE_MODEL_TYPES} // Replace with Assistant Model options
                        value={assistantModel} // Pass the current selected value
                        onChange={handleAssistantModelChange} // Handle changes
                      />
                    </div>
                    
                    <div className="mt-4">
                      <div className="text-sm font-bold mt-2 mb-2">Inference Model</div>
                      <SingleSelect
                        options={INFERENCE_MODEL_TYPES}
                        // Pass the current selected value
                        value={inferenceModel}
                        // Handle changes
                        onChange={handleInferenceModelChange}
                      />
                    </div>




                  </div>

                  {/* Credits Remaining */}
                  <div className={`p-6 rounded-lg shadow-md ${cardBgColor} ${textColor}`}>
                    <h3 className="text-lg font-semibold mb-2">Credits Remaining</h3>
                    <p>{user.generationCredits}</p>
                    <div className="mt-4">
                      <SecondaryButton onClick={showPurchaseCreditsAction}>Purchase Credits</SecondaryButton>
                    </div>
                  </div>

                  {/* Next Credit Refill */}
                  <div className={`p-6 rounded-lg shadow-md ${cardBgColor} ${textColor}`}>
                    <h3 className="text-lg font-semibold mb-2">Next Credit Refill</h3>
                    <p>{user.nextCreditRefill || "N/A"}</p>
                  </div>
                </div>

                {/* Logout Button at Bottom */}
                <div className="mt-auto pt-6">
                  <SecondaryButton onClick={logoutUser} className="w-full">
                    Logout
                  </SecondaryButton>
                </div>
              </div>
            )}

            {displayPanel === "images" && <ImagePanelContent />}
            {displayPanel === "sounds" && <MusicPanelContent />}
            {displayPanel === "billing" && <BillingPanelContent />}
            {displayPanel === "settings" && (
              <SettingsPanelContent
                logoutUser={logoutUser}
                updateUserDetails={updateUserDetails}
                user={user}
                deleteAllProjectsForUser={deleteAllProjectsForUser}
                deleteAllGenerationsForUser={deleteAllGenerationsForUser}
                deleteAccountForUser={deleteAccountForUser}
              />
            )}
            {displayPanel === "apiKeys" && <APIKeysPanelContent />}
            {displayPanel === "scenes" && <SceneLibraryHome hideSelectButton={true} />}
          </div>
        </div>
      </div>
    </OverflowContainer>
  );
}
