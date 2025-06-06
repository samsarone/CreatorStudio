import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaChevronCircleLeft, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import CommonContainer from "../common/CommonContainer.tsx";
import { useColorMode } from "../../contexts/ColorMode.jsx";
import { useUser } from "../../contexts/UserContext.jsx";
import SecondaryButton from "../common/SecondaryButton.tsx";
import { useAlertDialog } from "../../contexts/AlertDialogContext.jsx";
import AddCreditsDialog from "./AddCreditsDialog.jsx";
import UpgradePlan from "../payments/UpgradePlan.tsx";
import { getHeaders } from "../../utils/web.jsx";
import MusicPanelContent from "./MusicPanelContent.jsx";
import ImagePanelContent from "./ImagePanelContent.jsx";
import SettingsPanelContent from "./SettingsPanelContent.jsx";
import BillingPanelContent from "./BillingPanelContent.jsx";
import ToggleButton from "../common/ToggleButton.tsx";
import SceneLibraryHome from "../library/aivideo/SceneLibraryHome.jsx";
import OverflowContainer from "../common/OverflowContainer.tsx";
import APIKeysPanelContent from "./APIKeysPanelContent.jsx";
import SingleSelect from "../common/SingleSelect.jsx";

import { INFERENCE_MODEL_TYPES } from "../../constants/Types.ts";
import { ASSISTANT_MODEL_TYPES } from "../../constants/Types.ts";
const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

// ===== NEW: Default Image Model options =====
const agentImageModelOptions = [
  { value: "GPTIMAGE1", label: "GPT Image One" },
  { value: "IMAGEN4", label: "Imagen4" },
];

// Add Montserrat or any additional fonts to the list:
const fontOptions = [
  { value: "Arial", label: "Arial" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Roboto", label: "Roboto" },
  { value: "Neonderthaw", label: "Neonderthaw" },
  { value: "Monoton", label: "Monoton" },
  { value: "Bungee Outline", label: "Bungee Outline" },
  { value: "Orbitron", label: "Orbitron" },
  { value: "Rampart One", label: "Rampart One" },
  { value: "Montserrat", label: "Montserrat" }, // Example addition
];

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

  // Local states for new form fields
  const [notifyOnCompletion, setNotifyOnCompletion] = useState(false);
  const [inferenceModel, setInferenceModel] = useState(INFERENCE_MODEL_TYPES[0]);
  const [assistantModel, setAssistantModel] = useState(ASSISTANT_MODEL_TYPES[0]);

  // ===== NEW: Default Image Model state =====
  const [agentImageModel, setAgentImageModel] = useState(agentImageModelOptions[0]);

  // Font states
  const [speakerFont, setSpeakerFont] = useState(fontOptions[0]);
  const [textFont, setTextFont] = useState(fontOptions[0]);

  const backingTrackModelOptions = [
    { value: "LYRIA2", label: "Lyria 2" },
    { value: "AUDIOCRAFT", label: "AudioCraft" },
    { value: "CASSETTEAI", label: "CassetteAI" },
  ];

  const agentVideoModelOptions = [
    { value: "RUNWAYML", label: "Runway Gen 4" },
    { value: "PIXVERSEI2V", label: "Pixverse v4.5" },
  ];

  const [backingTrackModel, setBackingTrackModel] = useState(backingTrackModelOptions[0]);
  const [agentVideoModel, setAgentVideoModel] = useState(agentVideoModelOptions[0]);

  const handleAgentVideoModelChange = (newVal) => {
    setAgentVideoModel(newVal);
    updateUserDetails({ agentVideoModel: newVal.value });
  };

  const handleBackingTrackModelChange = (newVal) => {
    setBackingTrackModel(newVal);
    updateUserDetails({ backingTrackModel: newVal.value });
  };

  // ===== NEW: Handler for Default Image Model =====
  const handleAgentImageModelChange = (newVal) => {
    setAgentImageModel(newVal);
    updateUserDetails({ agentImageModel: newVal.value });
  };

  useEffect(() => {
    if (user) {
      // Inference model
      const userInferenceModel = user.selectedInferenceModel || "GPT4O";
      const userInferenceModelOption = INFERENCE_MODEL_TYPES.find(
        (model) => model.value === userInferenceModel
      );
      setInferenceModel(userInferenceModelOption);

      // Assistant model
      const userAssistantModel = user.selectedAssistantModel || "GPT4O";
      const userAssistantModelOption = ASSISTANT_MODEL_TYPES.find(
        (model) => model.value === userAssistantModel
      );
      setAssistantModel(userAssistantModelOption);

      // Notify on completion
      setNotifyOnCompletion(!!user.selectedNotifyOnCompletion);

      // Speaker font
      const userSpeakerFont = user.expressGenerationSpeakerFont || "Arial";
      const speakerFontOption = fontOptions.find((f) => f.value === userSpeakerFont) || fontOptions[0];
      setSpeakerFont(speakerFontOption);

      // Text font
      const userTextFont = user.expressGenerationTextFont || "Arial";
      const textFontOption = fontOptions.find((f) => f.value === userTextFont) || fontOptions[0];
      setTextFont(textFontOption);

      // Backing track model
      const userBackingTrackModel = user.backingTrackModel || "AUDIOCRAFT";
      const backingTrackModelOption =
        backingTrackModelOptions.find((f) => f.value === userBackingTrackModel) ||
        backingTrackModelOptions[0];
      setBackingTrackModel(backingTrackModelOption);

      // Agent video model
      const userAgentVideoModel = user.agentVideoModel || "RUNWAYML";
      const agentVideoModelOption =
        agentVideoModelOptions.find((f) => f.value === userAgentVideoModel) ||
        agentVideoModelOptions[0];
      setAgentVideoModel(agentVideoModelOption);

      // ===== NEW: Agent image model =====
      const userAgentImageModel = user.agentImageModel || "GPTIMAGE1";
      const agentImageModelOption =
        agentImageModelOptions.find((f) => f.value === userAgentImageModel) ||
        agentImageModelOptions[0];
      setAgentImageModel(agentImageModelOption);
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
      .then(function () {
        toast.success("User details updated successfully!", { position: "bottom-center" });
        getUserAPI();
      })
      .catch(function (error) {
        console.error("Error updating user details", error);
        toast.error("Failed to update user details", { position: "bottom-center" });
      });
  };

  const purchaseCreditsForUser = (amountToPurchase) => {
    const purchaseAmountRequest = parseInt(amountToPurchase, 10);
    const headers = getHeaders();

    axios
      .post(`${PROCESSOR_SERVER}/users/purchase_credits`, { amount: purchaseAmountRequest }, headers)
      .then(function (dataRes) {
        const data = dataRes.data;
        if (data.url) {
          window.open(data.url, "_blank");
          toast.success("Payment URL generated successfully!", { position: "bottom-center" });
        } else {
          console.error("Failed to get Stripe payment URL");
          toast.error("Failed to generate payment URL", { position: "bottom-center" });
        }
      })
      .catch(function (error) {
        console.error("Error during payment process", error);
        toast.error("Payment process failed", { position: "bottom-center" });
      });
  };

  const requestApplyCreditsCoupon = (couponCode) => {

    axios
      .post(
        `${PROCESSOR_SERVER}/users/apply_credits_coupon`,
        { couponCode },
        getHeaders()
      )
      .then(function () {
        toast.success("Coupon applied successfully!", { position: "bottom-center" });
        getUserAPI();
      })
      .catch(function (error) {
        console.error("Error applying coupon", error);
        toast.error("Failed to apply coupon", { position: "bottom-center" });
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
    openAlertDialog(
      <div>
        <FaTimes className="absolute top-2 right-2 cursor-pointer" onClick={closeAlertDialog} />
        <UpgradePlan />
      </div>
    );
  };

  const handleCancelMembership = () => {
    axios
      .post(`${PROCESSOR_SERVER}/users/cancel_membership`, {}, getHeaders())
      .then(function () {
        getUserAPI();
        toast.success("Membership canceled successfully!", { position: "bottom-center" });
      })
      .catch(function () {
        toast.error("Failed to cancel membership", { position: "bottom-center" });
      });
  };

  const logoutUser = () => {
    resetUser();
    navigate("/");
    toast.success("Logged out successfully!", { position: "bottom-center" });
  };

  const deleteAllGenerationsForUser = () => {
    axios
      .post(`${PROCESSOR_SERVER}/users/delete_generations`, {}, getHeaders())
      .then(function () {
        toast.success("All generations deleted successfully!", { position: "bottom-center" });
      });
  };

  const deleteAllProjectsForUser = () => {
    axios
      .post(`${PROCESSOR_SERVER}/users/delete_projects`, {}, getHeaders())
      .then(function () {
        toast.success("All projects deleted successfully!", { position: "bottom-center" });
      });
  };

  const deleteAccountForUser = () => {
    axios
      .post(`${PROCESSOR_SERVER}/users/delete_user`, {}, getHeaders())
      .then(function () {
        toast.success("Account deleted successfully!", { position: "bottom-center" });
        resetUser();
        navigate("/");
      });
  };
  // ====== END: Endpoint Calls ======

  // Handlers for toggles & single selects
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
  };

  // Font preference change handlers
  const handleSpeakerFontChange = (newVal) => {
    setSpeakerFont(newVal);
    updateUserDetails({ expressGenerationSpeakerFont: newVal.value });
  };

  const handleTextFontChange = (newVal) => {
    setTextFont(newVal);
    updateUserDetails({ expressGenerationTextFont: newVal.value });
  };

  // Render label for current panel in the header
  let currentPageLabel = "Account Information";
  if (displayPanel === "images") currentPageLabel = "Image Library";
  else if (displayPanel === "sounds") currentPageLabel = "Sound Library";
  else if (displayPanel === "scenes") currentPageLabel = "Scene Library";
  else if (displayPanel === "videos") currentPageLabel = "Video Library";
  else if (displayPanel === "apiKeys") currentPageLabel = "API Keys";
  else if (displayPanel === "billing") currentPageLabel = "Billing Information";
  else if (displayPanel === "settings") currentPageLabel = "Settings";

  // Render the "Notify on completion" checkbox only if the user is verified
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
          <div
            className={`${bgColor} ${textColor} p-6 rounded-r-lg shadow-md flex-grow flex flex-col`}
          >
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
                  {/* Column 1: Account Type & Models */}
                  <div className={`p-6 rounded-lg shadow-md ${cardBgColor} ${textColor}`}>
                    <h3 className="text-lg font-semibold mb-2">Account Type</h3>
                    <p>{accountType}</p>
                    <div className="mt-4">{accountActions}</div>

                    {confirmationEmailActions}

                    <div className="mt-4">
                      <div className="text-sm font-bold mt-2 mb-2">Assistant Model</div>
                      <SingleSelect
                        options={ASSISTANT_MODEL_TYPES}
                        value={assistantModel}
                        onChange={handleAssistantModelChange}
                      />
                    </div>

                    <div className="mt-4">
                      <div className="text-sm font-bold mt-2 mb-2">Inference Model</div>
                      <SingleSelect
                        options={INFERENCE_MODEL_TYPES}
                        value={inferenceModel}
                        onChange={handleInferenceModelChange}
                      />
                    </div>
                  </div>

                  {/* Column 2: Credits + Next Refill */}
                  <div className={`p-6 rounded-lg shadow-md ${cardBgColor} ${textColor}`}>
                    <h3 className="text-lg font-semibold mb-2">Credits Remaining</h3>
                    <p>{user.generationCredits}</p>
                    <div className="mt-4">
                      <SecondaryButton onClick={showPurchaseCreditsAction}>
                        Purchase Credits
                      </SecondaryButton>
                    </div>

                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-2">Next Credit Refill</h3>
                      <p>{user.nextCreditRefill || "N/A"}</p>
                    </div>
                  </div>

                  {/* Column 3: Image Model, Speaker Font & Text Font */}
                  <div className={`p-6 rounded-lg shadow-md ${cardBgColor} ${textColor}`}>
                    <h3 className="text-lg font-semibold mb-2">Agent Settings</h3>

                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Speaker Font</h3>
                      <SingleSelect
                        options={fontOptions}
                        value={speakerFont}
                        onChange={handleSpeakerFontChange}
                      />
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Text Font</h3>
                      <SingleSelect
                        options={fontOptions}
                        value={textFont}
                        onChange={handleTextFontChange}
                      />
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Backing Track Model</h3>
                      <SingleSelect
                        options={backingTrackModelOptions}
                        value={backingTrackModel}
                        onChange={handleBackingTrackModelChange}
                      />
                    </div>


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
