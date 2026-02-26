import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaBars, FaChevronCircleLeft } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

import { useColorMode } from "../../contexts/ColorMode.jsx";
import { useUser } from "../../contexts/UserContext.jsx";
import SecondaryButton from "../common/SecondaryButton.tsx";
import { getHeaders } from "../../utils/web.jsx";
import MusicPanelContent from "./MusicPanelContent.jsx";
import ImagePanelContent from "./ImagePanelContent.jsx";
import SettingsPanelContent from "./SettingsPanelContent.jsx";
import BillingPanelContent from "./BillingPanelContent.jsx";
import BillingAccessGate from "./BillingAccessGate.jsx";
import ToggleButton from "../common/ToggleButton.tsx";
import SceneLibraryHome from "../library/aivideo/SceneLibraryHome.jsx";
import OverflowContainer from "../common/OverflowContainer.tsx";
import APIKeysPanelContent from "./APIKeysPanelContent.jsx";
import UsagePanelContent from "./UsagePanelContent.jsx";
import SingleSelect from "../common/SingleSelect.jsx";

import { INFERENCE_MODEL_TYPES, ASSISTANT_MODEL_TYPES } from "../../constants/Types.ts";

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

export default function UserAccount() {
  const { colorMode } = useColorMode();
  const { user, resetUser, getUserAPI, userFetching, userInitiated } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const textColor = colorMode === "dark" ? "text-slate-100" : "text-slate-900";
  const bgColor = colorMode === "dark" ? "bg-[#0b1021]" : "bg-[#f7f9fc]";
  const secondaryTextColor = colorMode === "dark" ? "text-slate-400" : "text-slate-500";
  const cardBgColor = colorMode === "dark" ? "bg-[#0f1629] shadow-[0_16px_40px_rgba(0,0,0,0.35)]" : "bg-white shadow-sm";
  const borderColor = colorMode === "dark" ? "border-[#1f2a3d]" : "border-slate-200";
  const mutedBg = colorMode === "dark" ? "bg-[#111a2f]" : "bg-slate-50";

  const validPanels = [
    "account",
    "images",
    "sounds",
    "scenes",
    "videos",
    "apiKeys",
    "usage",
    "billing",
    "settings",
  ];

  const resolvePanelFromPath = () => {
    const segments = location.pathname.split("/").filter(Boolean);
    const panel = segments[1] || "account";
    return validPanels.includes(panel) ? panel : "account";
  };

  const [displayPanel, setDisplayPanel] = useState(resolvePanelFromPath());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [notifyOnCompletion, setNotifyOnCompletion] = useState(false);
  const [inferenceModel, setInferenceModel] = useState(INFERENCE_MODEL_TYPES[0]);
  const [assistantModel, setAssistantModel] = useState(ASSISTANT_MODEL_TYPES[0]);

  useEffect(() => {
    if (!user) return;

    setInferenceModel(
      INFERENCE_MODEL_TYPES.find((m) => m.value === (user.selectedInferenceModel || "GPT5.2")) ||
        INFERENCE_MODEL_TYPES[0]
    );
    setAssistantModel(
      ASSISTANT_MODEL_TYPES.find((m) => m.value === (user.selectedAssistantModel || "GPT5.2")) ||
        ASSISTANT_MODEL_TYPES[0]
    );
    setNotifyOnCompletion(!!user.selectedNotifyOnCompletion);
  }, [user]);

  useEffect(() => {
    setDisplayPanel(resolvePanelFromPath());
  }, [location.pathname]);

  if (!user) {
    if (displayPanel === "billing") {
      if (!userInitiated || userFetching) {
        return (
          <OverflowContainer>
            <div className="pt-[50px] min-h-screen" />
          </OverflowContainer>
        );
      }
      return (
        <OverflowContainer>
          <BillingAccessGate />
        </OverflowContainer>
      );
    }
    return <span />;
  }

  const updateUserDetails = (payload) => {
    axios
      .post(`${PROCESSOR_SERVER}/users/update`, payload, getHeaders())
      .then(() => {
        toast.success("User details updated!", { position: "bottom-center" });
        getUserAPI();
      })
      .catch(() => toast.error("Failed to update user details", { position: "bottom-center" }));
  };

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

  const deleteAllGenerationsForUser = async () => {
    try {
      await axios.post(`${PROCESSOR_SERVER}/users/delete_generations`, {}, getHeaders());
      toast.success("All generations deleted!", { position: "bottom-center" });
    } catch (err) {
      toast.error("Failed to delete generations", { position: "bottom-center" });
      throw err;
    }
  };

  const deleteAllProjectsForUser = async () => {
    try {
      await axios.post(`${PROCESSOR_SERVER}/users/delete_projects`, {}, getHeaders());
      toast.success("All projects deleted!", { position: "bottom-center" });
    } catch (err) {
      toast.error("Failed to delete projects", { position: "bottom-center" });
      throw err;
    }
  };

  const deleteAccountForUser = async () => {
    try {
      await axios.post(`${PROCESSOR_SERVER}/users/delete_user`, {}, getHeaders());
      toast.success("Account deleted!", { position: "bottom-center" });
      resetUser();
      navigate("/");
    } catch (err) {
      toast.error("Failed to delete account", { position: "bottom-center" });
      throw err;
    }
  };

  const logoutUser = () => {
    resetUser();
    navigate("/");
    toast.success("Logged out successfully!", { position: "bottom-center" });
  };

  const goToPanel = (panel) => {
    const targetPath = panel === "account" ? "/account" : `/account/${panel}`;
    setDisplayPanel(panel);
    setSidebarOpen(false);
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const navItemBase = "w-full text-left mb-2 px-3 py-2 rounded-lg transition-colors";
  const navItemActive =
    colorMode === "dark"
      ? "bg-[#16213a] border border-rose-400/40 text-rose-200 shadow-[0_0_0_1px_rgba(248,113,113,0.16)]"
      : "bg-white border border-rose-100 text-rose-700 shadow-sm";
  const navItemIdle =
    colorMode === "dark"
      ? "border border-transparent text-slate-300 hover:bg-[#0f1629]"
      : "border border-transparent text-slate-600 hover:bg-slate-100";

  const NavLink = ({ panel, label }) => (
    <li className="list-none">
      <button
        className={`${navItemBase} ${displayPanel === panel ? navItemActive : navItemIdle}`}
        onClick={() => goToPanel(panel)}
      >
        {label}
      </button>
    </li>
  );

  const pageLabels = {
    account: "Account Information",
    images: "Image Library",
    sounds: "Sound Library",
    scenes: "Scene Library",
    videos: "Video Library",
    apiKeys: "API Keys",
    usage: "Usage Logs",
    billing: "Billing Information",
    settings: "Settings",
  };

  const accountType = user.isPremiumUser ? "Premium" : "Basic";
  const nextChargeLabel = user.isPremiumUser
    ? user.nextCreditRefill || "Next charge scheduled with your subscription"
    : "No upcoming charge";
  const autoRechargeLabel = user.autoRechargeEnabled ? "Enabled" : "Disabled";

  const emailNotificationBlock = user.isEmailVerified ? (
    <label
      className={`flex items-center gap-3 rounded-xl border ${borderColor} px-4 py-3 ${
        colorMode === "dark" ? "bg-neutral-900/70" : "bg-white"
      }`}
    >
      <input
        type="checkbox"
        checked={notifyOnCompletion}
        onChange={handleNotifyOnCompletionChange}
        className="h-4 w-4 accent-indigo-500"
      />
      <div>
        <p className="text-sm font-semibold">Email notifications</p>
        <p className={`text-xs ${secondaryTextColor}`}>Send an email when renders finish.</p>
      </div>
    </label>
  ) : (
    <div className={`rounded-xl border ${borderColor} px-4 py-3 ${mutedBg}`}>
      <p className="text-sm font-semibold">Verify your email to enable notifications</p>
      <p className={`text-xs ${secondaryTextColor}`}>
        We&apos;ll notify you when renders complete once your email is verified.
      </p>
    </div>
  );

  return (
    <OverflowContainer>
      <ToastContainer />
      <div className={`pt-[50px] min-h-screen flex flex-col ${bgColor} ${textColor}`}>
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex" aria-modal="true" role="dialog">
            <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <nav className={`relative z-50 w-64 p-6 ${bgColor} shadow-[0_16px_40px_rgba(0,0,0,0.45)] border-r ${borderColor} overflow-y-auto`}>
              <button
                className="absolute top-4 right-4"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigation"
              >
                X
              </button>
              <ul>
                <NavLink panel="account" label="Account" />
                <NavLink panel="images" label="Images" />
                <NavLink panel="sounds" label="Sounds" />
                <NavLink panel="scenes" label="Scenes" />
                <NavLink panel="videos" label="Videos" />
                <NavLink panel="apiKeys" label="API Keys" />
                <NavLink panel="usage" label="Usage" />
                <NavLink panel="billing" label="Billing" />
                <NavLink panel="settings" label="Settings" />
              </ul>
            </nav>
          </div>
        )}

        <div className="flex flex-1">
          <nav className={`hidden md:block w-48 p-4 ${bgColor} shadow-sm border-r ${borderColor}`}>
            <ul>
              <NavLink panel="account" label="Account" />
              <NavLink panel="images" label="Images" />
              <NavLink panel="sounds" label="Sounds" />
              <NavLink panel="scenes" label="Scenes" />
              <NavLink panel="videos" label="Videos" />
              <NavLink panel="apiKeys" label="API Keys" />
              <NavLink panel="usage" label="Usage" />
              <NavLink panel="billing" label="Billing" />
              <NavLink panel="settings" label="Settings" />
            </ul>
          </nav>

          <div className={`flex-1 flex flex-col ${bgColor} ${textColor}`}>
            <div className={`flex items-center p-4 border-b ${borderColor}`}>
              <button
                className="md:hidden mr-4"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <FaBars size={20} />
              </button>

              <div onClick={() => navigate("/")} className="cursor-pointer flex items-center mr-4">
                <FaChevronCircleLeft className="mr-2" />
                <span>Back</span>
              </div>

              <h2 className="text-xl font-bold flex-1 text-center">{pageLabels[displayPanel]}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {displayPanel === "account" && (
                <div className="flex flex-col min-h-full">
                  <div className="max-w-5xl w-full mx-auto space-y-6">
                    <div
                      className={`rounded-2xl border ${borderColor} ${cardBgColor} p-6 shadow-sm`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {user.profilePicture && (
                            <img
                              src={user.profilePicture}
                              alt="Profile"
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <p className={`text-xs uppercase tracking-wide ${secondaryTextColor}`}>
                              Signed in as
                            </p>
                            <h2 className="text-2xl font-bold">{user.username}</h2>
                            <p className={`text-sm ${secondaryTextColor}`}>{user.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs uppercase tracking-wide ${secondaryTextColor}`}>
                            Plan
                          </p>
                          <p className="text-lg font-semibold">{accountType}</p>
                          {user.isPremiumUser && (
                            <p className={`text-xs ${secondaryTextColor}`}>{nextChargeLabel}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl border ${borderColor} ${cardBgColor} p-6 shadow-sm space-y-6`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">Preferences</h3>
                          <p className={`text-sm ${secondaryTextColor}`}>
                            Quick controls for your workspace.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">Dark Mode</span>
                          <ToggleButton />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">Assistant model</p>
                          <SingleSelect
                            options={ASSISTANT_MODEL_TYPES}
                            value={assistantModel}
                            onChange={handleAssistantModelChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">Inference model</p>
                          <SingleSelect
                            options={INFERENCE_MODEL_TYPES}
                            value={inferenceModel}
                            onChange={handleInferenceModelChange}
                          />
                        </div>
                      </div>

                      {emailNotificationBlock}
                    </div>

                    <div
                      className={`rounded-2xl border ${borderColor} ${cardBgColor} p-6 shadow-sm space-y-4`}
                    >
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="text-lg font-semibold">Usage & Billing</h3>
                          <p className={`text-sm ${secondaryTextColor}`}>
                            Track credits and billing status.
                          </p>
                        </div>
                        <SecondaryButton onClick={() => goToPanel("billing")}>
                          Go to Billing
                        </SecondaryButton>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className={`rounded-xl border ${borderColor} p-4 ${mutedBg}`}>
                          <p className={`text-xs uppercase tracking-wide ${secondaryTextColor}`}>
                            Credits remaining
                          </p>
                          <p className="text-2xl font-bold">{user.generationCredits || 0}</p>
                        </div>
                        <div className={`rounded-xl border ${borderColor} p-4 ${mutedBg}`}>
                          <p className={`text-xs uppercase tracking-wide ${secondaryTextColor}`}>
                            Next charge
                          </p>
                          <p className="text-base font-semibold">
                            {user.isPremiumUser ? nextChargeLabel : "Not scheduled"}
                          </p>
                        </div>
                        <div className={`rounded-xl border ${borderColor} p-4 ${mutedBg}`}>
                          <p className={`text-xs uppercase tracking-wide ${secondaryTextColor}`}>
                            Auto-recharge
                          </p>
                          <p className="text-base font-semibold">{autoRechargeLabel}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sticky bottom-0 bg-inherit pt-6 mt-6">
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
              {displayPanel === "usage" && <UsagePanelContent />}
              {displayPanel === "scenes" && <SceneLibraryHome hideSelectButton />}
              {displayPanel === "videos" && <SceneLibraryHome hideSelectButton />}
            </div>
          </div>
        </div>
      </div>
    </OverflowContainer>
  );
}
