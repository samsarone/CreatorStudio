import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaChevronCircleLeft, FaTimes, FaBars } from "react-icons/fa";
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

import { INFERENCE_MODEL_TYPES, ASSISTANT_MODEL_TYPES } from "../../constants/Types.ts";

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                         */
/* ------------------------------------------------------------------ */
const agentImageModelOptions = [
  { value: "GPTIMAGE1", label: "GPT Image One" },
  { value: "IMAGEN4", label: "Imagen4" },
];

const fontOptions = [
  { value: "Arial", label: "Arial" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Roboto", label: "Roboto" },
  { value: "Neonderthaw", label: "Neonderthaw" },
  { value: "Monoton", label: "Monoton" },
  { value: "Bungee Outline", label: "Bungee Outline" },
  { value: "Orbitron", label: "Orbitron" },
  { value: "Rampart One", label: "Rampart One" },
  { value: "Montserrat", label: "Montserrat" },
];

const backingTrackModelOptions = [
  { value: "LYRIA2", label: "Lyria 2" },
  { value: "AUDIOCRAFT", label: "AudioCraft" },
  { value: "CASSETTEAI", label: "CassetteAI" },
];

const agentVideoModelOptions = [
  { value: "RUNWAYML", label: "Runway Gen 4" },
  { value: "SEEDANCEI2V", label: "Seedance I2V" },
];


const defaultDurationOptions = [
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 90, label: "1.5 minutes" },
  { value: 120, label: "2 minutes" },
];



/* ------------------------------------------------------------------ */
/*  COMPONENT                                                         */
/* ------------------------------------------------------------------ */
export default function UserAccount() {
  /* ---------- CONTEXTS ---------- */
  const { colorMode } = useColorMode();
  const { user, resetUser, getUserAPI } = useUser();
  const { openAlertDialog, closeAlertDialog } = useAlertDialog();
  const navigate = useNavigate();

  /* ---------- THEME CLASSES ---------- */
  const textColor = colorMode === "dark" ? "text-neutral-100" : "text-neutral-800";
  const bgColor = colorMode === "dark" ? "bg-neutral-900" : "bg-neutral-100";
  const secondaryTextColor = colorMode === "dark" ? "text-neutral-400" : "text-neutral-500";
  const cardBgColor = colorMode === "dark" ? "bg-neutral-800" : "bg-white";

  /* ---------- STATE ---------- */
  const [displayPanel, setDisplayPanel] = useState("account");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [notifyOnCompletion, setNotifyOnCompletion] = useState(false);
  const [inferenceModel, setInferenceModel] = useState(INFERENCE_MODEL_TYPES[0]);
  const [assistantModel, setAssistantModel] = useState(ASSISTANT_MODEL_TYPES[0]);

  const [agentImageModel, setAgentImageModel] = useState(agentImageModelOptions[0]);
  const [agentVideoModel, setAgentVideoModel] = useState(agentVideoModelOptions[0]);
  const [backingTrackModel, setBackingTrackModel] = useState(backingTrackModelOptions[0]);

  const [speakerFont, setSpeakerFont] = useState(fontOptions[0]);
  const [textFont, setTextFont] = useState(fontOptions[0]);

  const [defaultAgentDuration, setDefaultAgentDuration] = useState(defaultDurationOptions[0]);


  /* ------------------------------------------------------------------ */
  /*  EFFECT: Hydrate component with user‑specific preferences          */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!user) return;

    /* Inference & Assistant Models */
    setInferenceModel(
      INFERENCE_MODEL_TYPES.find((m) => m.value === (user.selectedInferenceModel || "GPT4O"))
    );
    setAssistantModel(
      ASSISTANT_MODEL_TYPES.find((m) => m.value === (user.selectedAssistantModel || "GPT4O"))
    );

    /* Other prefs */
    setNotifyOnCompletion(!!user.selectedNotifyOnCompletion);

    setSpeakerFont(
      fontOptions.find((f) => f.value === (user.expressGenerationSpeakerFont || "Arial"))
    );
    setTextFont(fontOptions.find((f) => f.value === (user.expressGenerationTextFont || "Arial")));

    setBackingTrackModel(
      backingTrackModelOptions.find((f) => f.value === (user.backingTrackModel || "AUDIOCRAFT"))
    );
    setAgentVideoModel(
      agentVideoModelOptions.find((f) => f.value === (user.agentVideoModel || "RUNWAYML"))
    );
    setAgentImageModel(
      agentImageModelOptions.find((f) => f.value === (user.agentImageModel || "GPTIMAGE1"))
    );

    setDefaultAgentDuration(
      defaultDurationOptions.find((f) => f.value === (user.defaultAgentDuration || 30))
    );
  }, [user]);

  /* ------------------------------------------------------------------ */
  /*  EARLY RETURN                                                      */
  /* ------------------------------------------------------------------ */
  if (!user) return <span />;

  /* ------------------------------------------------------------------ */
  /*  HELPERS ‑ API calls & updates                                     */
  /* ------------------------------------------------------------------ */
  const updateUserDetails = (payload) => {
    axios
      .post(`${PROCESSOR_SERVER}/users/update`, payload, getHeaders())
      .then(() => {
        toast.success("User details updated!", { position: "bottom-center" });
        getUserAPI();
      })
      .catch(() => toast.error("Failed to update user details", { position: "bottom-center" }));
  };

  const purchaseCreditsForUser = (amountToPurchase) => {
    const purchaseAmountRequest = parseInt(amountToPurchase, 10);
    axios
      .post(
        `${PROCESSOR_SERVER}/users/purchase_credits`,
        { amount: purchaseAmountRequest },
        getHeaders()
      )
      .then((res) => {
        const { url } = res.data;
        if (url) {
          window.open(url, "_blank");
          toast.success("Payment URL generated!", { position: "bottom-center" });
        } else {
          toast.error("Failed to generate payment URL", { position: "bottom-center" });
        }
      })
      .catch(() => toast.error("Payment process failed", { position: "bottom-center" }));
  };

  const requestApplyCreditsCoupon = (couponCode) => {
    axios
      .post(`${PROCESSOR_SERVER}/users/apply_credits_coupon`, { couponCode }, getHeaders())
      .then(() => {
        toast.success("Coupon applied!", { position: "bottom-center" });
        getUserAPI();
      })
      .catch(() => toast.error("Failed to apply coupon", { position: "bottom-center" }));
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


  const handleDefaultAgentDurationChange = (newVal) => {
    setDefaultAgentDuration(newVal);
    updateUserDetails({ defaultAgentDuration: newVal.value });
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
      .then(() => {
        getUserAPI();
        toast.success("Membership canceled!", { position: "bottom-center" });
      })
      .catch(() => toast.error("Failed to cancel membership", { position: "bottom-center" }));
  };

  const logoutUser = () => {
    resetUser();
    navigate("/");
    toast.success("Logged out successfully!", { position: "bottom-center" });
  };

  const deleteAllGenerationsForUser = () => {
    axios
      .post(`${PROCESSOR_SERVER}/users/delete_generations`, {}, getHeaders())
      .then(() => toast.success("All generations deleted!", { position: "bottom-center" }))
      .catch(() => toast.error("Failed to delete generations", { position: "bottom-center" }));
  };

  const deleteAllProjectsForUser = () => {
    axios
      .post(`${PROCESSOR_SERVER}/users/delete_projects`, {}, getHeaders())
      .then(() => toast.success("All projects deleted!", { position: "bottom-center" }))
      .catch(() => toast.error("Failed to delete projects", { position: "bottom-center" }));
  };

  const deleteAccountForUser = () => {
    axios
      .post(`${PROCESSOR_SERVER}/users/delete_user`, {}, getHeaders())
      .then(() => {
        toast.success("Account deleted!", { position: "bottom-center" });
        resetUser();
        navigate("/");
      })
      .catch(() => toast.error("Failed to delete account", { position: "bottom-center" }));
  };

  /* ------------------------------------------------------------------ */
  /*  HANDLERS ‑ form widgets                                           */
  /* ------------------------------------------------------------------ */
  const handleNotifyOnCompletionChange = (e) => {
    const newVal = e.target.checked;
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

  const handleSpeakerFontChange = (newVal) => {
    setSpeakerFont(newVal);
    updateUserDetails({ expressGenerationSpeakerFont: newVal.value });
  };

  const handleTextFontChange = (newVal) => {
    setTextFont(newVal);
    updateUserDetails({ expressGenerationTextFont: newVal.value });
  };

  const handleBackingTrackModelChange = (newVal) => {
    setBackingTrackModel(newVal);
    updateUserDetails({ backingTrackModel: newVal.value });
  };

  const handleAgentVideoModelChange = (newVal) => {
    setAgentVideoModel(newVal);
    updateUserDetails({ agentVideoModel: newVal.value });
  };

  const handleAgentImageModelChange = (newVal) => {
    setAgentImageModel(newVal);
    updateUserDetails({ agentImageModel: newVal.value });
  };

  /* ------------------------------------------------------------------ */
  /*  RENDER HELPERS                                                    */
  /* ------------------------------------------------------------------ */
  const NavLink = ({ panel, label }) => (
    <li
      className={`mb-4 cursor-pointer ${displayPanel === panel ? "font-semibold" : ""}`}
      onClick={() => {
        setDisplayPanel(panel);
        setSidebarOpen(false); // auto‑close on mobile
      }}
    >
      {label}
    </li>
  );

  const pageLabels = {
    account: "Account Information",
    images: "Image Library",
    sounds: "Sound Library",
    scenes: "Scene Library",
    videos: "Video Library",
    apiKeys: "API Keys",
    billing: "Billing Information",
    settings: "Settings",
  };

  /* ------------------------------------------------------------------ */
  /*  ACCOUNT TYPE & ACTION BUTTON                                      */
  /* ------------------------------------------------------------------ */
  let accountType = "Free";
  let accountActions = (
    <SecondaryButton onClick={handleUpgradeToPremium}>Upgrade to Premium</SecondaryButton>
  );
  if (user.isPremiumUser) {
    accountType = "Premium";
    accountActions = (
      <SecondaryButton onClick={handleCancelMembership}>Cancel Membership</SecondaryButton>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  EMAIL NOTIFY TOGGLE (verified users only)                         */
  /* ------------------------------------------------------------------ */
  let confirmationEmailActions = <span />;
  if (user.isEmailVerified) {
    confirmationEmailActions = (
      <div className="mt-4">
        <div className="text-sm font-bold mb-2">Email Notifications</div>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={notifyOnCompletion}
            onChange={handleNotifyOnCompletionChange}
            className="mr-2"
          />
          <span>Send email when renders finish</span>
        </label>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  JSX                                                               */
  /* ------------------------------------------------------------------ */
  return (
    <OverflowContainer>
      <ToastContainer />
      <div className={`pt-[50px] min-h-screen flex flex-col ${bgColor} ${textColor} `}>
        {/* ---------- MOBILE SIDEBAR OVERLAY ---------- */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex" aria-modal="true" role="dialog">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <nav className={`relative z-50 w-64 p-6 ${bgColor} shadow-md border-r overflow-y-auto`}>
              <FaTimes
                className="absolute top-4 right-4 cursor-pointer"
                onClick={() => setSidebarOpen(false)}
              />
              <ul>
                <NavLink panel="account" label="Account" />
                <NavLink panel="images" label="Images" />
                <NavLink panel="sounds" label="Sounds" />
                <NavLink panel="scenes" label="Scenes" />
                <NavLink panel="videos" label="Videos" />
                <NavLink panel="apiKeys" label="API Keys" />
                <NavLink panel="billing" label="Billing" />
                <NavLink panel="settings" label="Settings" />
              </ul>
            </nav>
          </div>
        )}

        <div className="flex flex-1">
          {/* ---------- DESKTOP SIDEBAR ---------- */}
          <nav className={`hidden md:block w-32 p-4 ${bgColor} shadow-md border-r`}>
            <ul>
              <NavLink panel="account" label="Account" />
              <NavLink panel="images" label="Images" />
              <NavLink panel="sounds" label="Sounds" />
              <NavLink panel="scenes" label="Scenes" />
              <NavLink panel="videos" label="Videos" />
              <NavLink panel="apiKeys" label="API Keys" />
              <NavLink panel="billing" label="Billing" />
              <NavLink panel="settings" label="Settings" />
            </ul>
          </nav>

          {/* ---------- MAIN COLUMN ---------- */}
          <div className={`flex-1 flex flex-col ${bgColor} ${textColor}`}>
            {/* Header */}
            <div className="flex items-center p-4 border-b">
              {/* Hamburger (mobile) */}
              <button
                className="md:hidden mr-4"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <FaBars size={20} />
              </button>

              <div
                onClick={() => navigate("/")}
                className="cursor-pointer flex items-center mr-4"
              >
                <FaChevronCircleLeft className="mr-2" />
                <span>Back</span>
              </div>

              <h2 className="text-xl font-bold flex-1 text-center">
                {pageLabels[displayPanel]}
              </h2>
            </div>

            {/* Scrollable panel content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* ===== ACCOUNT PANEL ===== */}
              {displayPanel === "account" && (
                <div className="flex flex-col min-h-full">
                  {/* Top row */}
                  <div className="flex items-center justify-between mb-8">
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
                    <ToggleButton />
                  </div>

                  {/* Three‑column grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
                    {/* Column 1 */}
                    <div className={`p-6 rounded-lg shadow-md ${cardBgColor}`}>
                      <h3 className="text-lg font-semibold mb-2">Account Type</h3>
                      <p>{accountType}</p>
                      <div className="mt-4">{accountActions}</div>

                      {confirmationEmailActions}

                      <div className="mt-4">
                        <div className="text-sm font-bold mb-2">Assistant Model</div>
                        <SingleSelect
                          options={ASSISTANT_MODEL_TYPES}
                          value={assistantModel}
                          onChange={handleAssistantModelChange}
                        />
                      </div>

                      <div className="mt-4">
                        <div className="text-sm font-bold mb-2">Inference Model</div>
                        <SingleSelect
                          options={INFERENCE_MODEL_TYPES}
                          value={inferenceModel}
                          onChange={handleInferenceModelChange}
                        />
                      </div>





                    </div>

                    {/* Column 2 */}
                    <div className={`p-6 rounded-lg shadow-md ${cardBgColor}`}>
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

                    {/* Column 3 */}
                    <div className={`p-6 rounded-lg shadow-md ${cardBgColor}`}>
                      <h3 className="text-lg font-semibold mb-2">Agent Settings</h3>

                      <div className="mb-6">
                        <h4 className="font-semibold mb-1">Speaker Font</h4>
                        <SingleSelect
                          options={fontOptions}
                          value={speakerFont}
                          onChange={handleSpeakerFontChange}
                        />
                      </div>

                      <div className="mb-6">
                        <h4 className="font-semibold mb-1">Text Font</h4>
                        <SingleSelect
                          options={fontOptions}
                          value={textFont}
                          onChange={handleTextFontChange}
                        />
                      </div>

                      <div className="mb-6">
                        <h4 className="font-semibold mb-1">Backing Track Model</h4>
                        <SingleSelect
                          options={backingTrackModelOptions}
                          value={backingTrackModel}
                          onChange={handleBackingTrackModelChange}
                        />
                      </div>

                      <div className="mb-6">
                        <h4 className="font-semibold mb-1">Agent Video Model</h4>
                        <SingleSelect
                          options={agentVideoModelOptions}
                          value={agentVideoModel}
                          onChange={handleAgentVideoModelChange}
                        />
                      </div>

                      <div>
                        <h4 className="font-semibold mb-1">Agent Image Model</h4>
                        <SingleSelect
                          options={agentImageModelOptions}
                          value={agentImageModel}
                          onChange={handleAgentImageModelChange}
                        />
                      </div>



                      <div className="mb-6">
                        <h4 className="font-semibold mb-1">Default Agent Duration</h4>
                        <SingleSelect
                          options={defaultDurationOptions}
                          value={defaultAgentDuration}
                          onChange={handleDefaultAgentDurationChange}
                        />
                      </div>
                      
                    </div>
                  </div>

                  {/* Sticky logout */}
                  <div className="sticky bottom-0 bg-inherit pt-6">
                    <SecondaryButton onClick={logoutUser} className="w-full">
                      Logout
                    </SecondaryButton>
                  </div>
                </div>
              )}

              {/* ===== OTHER PANELS ===== */}
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
              {displayPanel === "scenes" && <SceneLibraryHome hideSelectButton />}
            </div>
          </div>
        </div>
      </div>
    </OverflowContainer>
  );
}
