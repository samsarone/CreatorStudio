import React, { useEffect, useRef, useState } from "react";
import { FaChevronDown, FaChevronRight, FaPause, FaPlay } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";

import SecondaryButton from "../common/SecondaryButton.tsx";
import { useColorMode } from "../../contexts/ColorMode.jsx";
import { useUser } from "../../contexts/UserContext.jsx";
import { useLocalization } from "../../contexts/LocalizationContext.jsx";
import { useAlertDialog } from "../../contexts/AlertDialogContext.jsx";
import { getHeaders } from "../../utils/web.jsx";
import { SUPPORTED_LANGUAGES } from "../../constants/supportedLanguages.js";
import {
  getFontOptionsForLanguage,
  mergeFontPreferencesWithDefaults,
} from "../../constants/fontPreferences.js";
import {
  AGENT_SPEAKER_GROUPS,
  buildSpeakerOptionsPayload,
  normalizeSpeakerOptionsState,
} from "../../constants/speakers/agentSpeakers.js";

const BACKING_TRACK_MODEL_OPTIONS = [
  { value: "ELEVENLABS_MUSIC", label: "ElevenLabs" },
  { value: "LYRIA2", label: "Lyria 2" },
];

const SETTINGS_TABS = [
  { key: "general", label: "General" },
  { key: "fonts", label: "Fonts" },
  { key: "agent", label: "Agent" },
  { key: "security", label: "Security" },
  { key: "danger", label: "Danger" },
];

export default function SettingsPanelContent(props) {
  const {
    logoutUser,
    updateUserDetails,
    deleteAllProjectsForUser,
    deleteAllGenerationsForUser,
    deleteAccountForUser,
  } = props;
  const { colorMode } = useColorMode();
  const { openAlertDialog, closeAlertDialog } = useAlertDialog();
  const { user } = useUser();
  const { t, setLanguage } = useLocalization();

  const textColor = colorMode === "dark" ? "text-slate-100" : "text-slate-900";
  const cardBgColor = colorMode === "dark" ? "bg-[#0f1629]" : "bg-white";
  const secondaryTextColor = colorMode === "dark" ? "text-slate-400" : "text-slate-600";
  const borderColor = colorMode === "dark" ? "border-[#1f2a3d]" : "border-slate-200";
  const inputBgColor = colorMode === "dark" ? "bg-[#0b1224]" : "bg-white";
  const mutedBg = colorMode === "dark" ? "bg-[#111a2f]" : "bg-slate-50";
  const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

  const [activeTab, setActiveTab] = useState("general");
  const [username, setUsername] = useState(user.username || "");
  const [preferredLanguage, setPreferredLanguage] = useState(user.preferredLanguage || "en");
  const [backingTrackModel, setBackingTrackModel] = useState(
    user.backingTrackModel || "ELEVENLABS_MUSIC"
  );
  const [fontPreferences, setFontPreferences] = useState(() =>
    mergeFontPreferencesWithDefaults(user?.fontPreferences)
  );
  const [speakerOptions, setSpeakerOptions] = useState(() =>
    normalizeSpeakerOptionsState(user?.speakerOptions)
  );
  const [expandedSpeakerProvider, setExpandedSpeakerProvider] = useState("OPENAI");
  const [currentlyPlayingSpeaker, setCurrentlyPlayingSpeaker] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const audioPreviewRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    setUsername(user.username || "");
    setPreferredLanguage(user.preferredLanguage || "en");
    setBackingTrackModel(user.backingTrackModel || "ELEVENLABS_MUSIC");
    setFontPreferences(mergeFontPreferencesWithDefaults(user.fontPreferences));
    setSpeakerOptions(normalizeSpeakerOptionsState(user.speakerOptions));
  }, [user]);

  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
    };
  }, []);

  const stopSpeakerPreview = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
      audioPreviewRef.current = null;
    }
    setCurrentlyPlayingSpeaker(null);
  };

  const toggleSpeakerPreview = async (speaker) => {
    if (!speaker?.previewURL) {
      toast.error("Preview unavailable for this speaker.", {
        position: "bottom-center",
      });
      return;
    }

    if (
      currentlyPlayingSpeaker?.value === speaker.value &&
      currentlyPlayingSpeaker?.provider === speaker.provider
    ) {
      stopSpeakerPreview();
      return;
    }

    stopSpeakerPreview();

    try {
      const audio = new Audio(speaker.previewURL);
      audioPreviewRef.current = audio;
      setCurrentlyPlayingSpeaker(speaker);
      audio.onended = () => {
        audioPreviewRef.current = null;
        setCurrentlyPlayingSpeaker(null);
      };
      await audio.play();
    } catch (error) {
      audioPreviewRef.current = null;
      setCurrentlyPlayingSpeaker(null);
      toast.error("Unable to play speaker preview.", {
        position: "bottom-center",
      });
    }
  };

  const handleUpdateUserDetails = (evt) => {
    evt.preventDefault();

    const updatedDetails = {
      username,
      preferredLanguage,
      backingTrackModel,
    };

    updateUserDetails(updatedDetails);
  };

  const handleFontPreferenceChange = (languageCode, key, value) => {
    setFontPreferences((prev) => {
      const current = prev && typeof prev === "object" ? prev : {};
      const currentPrefs = current[languageCode] || {};
      return {
        ...current,
        [languageCode]: {
          ...currentPrefs,
          [key]: value,
        },
      };
    });
  };

  const handleUpdateFontPreferences = (evt) => {
    evt.preventDefault();
    updateUserDetails({ fontPreferences });
  };

  const handleSpeakerProviderSelection = (allowKey) => {
    setSpeakerOptions((prev) => ({
      ...prev,
      [allowKey]: !prev[allowKey],
    }));
  };

  const handleSpeakerSelectionChange = (selectionKey, speakerValue) => {
    setSpeakerOptions((prev) => {
      const currentSelections = Array.isArray(prev[selectionKey]) ? prev[selectionKey] : [];
      const exists = currentSelections.includes(speakerValue);
      return {
        ...prev,
        [selectionKey]: exists
          ? currentSelections.filter((value) => value !== speakerValue)
          : [...currentSelections, speakerValue],
      };
    });
  };

  const handleSpeakerProviderExpand = (providerKey) => {
    setExpandedSpeakerProvider((current) => (current === providerKey ? null : providerKey));
  };

  const handleUpdateSpeakerOptions = (evt) => {
    evt.preventDefault();
    updateUserDetails({
      speakerOptions: buildSpeakerOptionsPayload(speakerOptions),
    });
  };

  const handleUpdatePassword = () => {
    if (newPassword !== confirmNewPassword) {
      toast.error(t("account.passwordMismatch"), {
        position: "bottom-center",
      });
      return;
    }

    axios
      .post(
        `${PROCESSOR_SERVER}/users/update_password`,
        { currentPassword, newPassword },
        getHeaders()
      )
      .then(() => {
        toast.success(t("account.passwordUpdateSuccess"), {
          position: "bottom-center",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      })
      .catch(() => {
        toast.error(t("account.passwordUpdateFail"), {
          position: "bottom-center",
        });
      });
  };

  const openDangerConfirmation = (actionKey) => {
    const actionMap = {
      projects: {
        title: t("account.deleteAllProjects"),
        description: t("account.confirmDeleteProjects"),
        confirmLabel: t("common.yes"),
        onConfirm: deleteAllProjectsForUser,
      },
      generations: {
        title: t("account.deleteAllGenerations"),
        description: t("account.confirmDeleteGenerations"),
        confirmLabel: t("common.yes"),
        onConfirm: deleteAllGenerationsForUser,
      },
      account: {
        title: t("account.deleteMyAccount"),
        description: t("account.confirmDeleteAccount"),
        confirmLabel: t("common.yes"),
        onConfirm: deleteAccountForUser,
      },
    };

    const actionConfig = actionMap[actionKey];
    if (!actionConfig) return;

    openAlertDialog(
      <DangerConfirmDialog
        colorMode={colorMode}
        title={actionConfig.title}
        description={actionConfig.description}
        confirmLabel={actionConfig.confirmLabel}
        cancelLabel={t("common.no")}
        onCancel={closeAlertDialog}
        onConfirm={actionConfig.onConfirm}
      />
    );
  };

  const formInputClasses = `border ${borderColor} rounded px-4 py-2 w-full ${inputBgColor} ${textColor}`;

  return (
    <div className={`p-6 rounded-2xl shadow-sm border ${borderColor} ${cardBgColor} ${textColor} space-y-6`}>
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Settings</h2>
          <p className={`text-sm ${secondaryTextColor}`}>
            Manage your workspace defaults, agent voices, and account security.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SETTINGS_TABS.map((tab) => (
            <SettingsTabButton
              key={tab.key}
              label={tab.label}
              isActive={activeTab === tab.key}
              colorMode={colorMode}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
        </div>
      </div>

      {activeTab === "general" && (
        <form onSubmit={handleUpdateUserDetails}>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("account.updateSettingsTitle")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 w-full gap-4">
              <div>
                <label className={`block text-sm mb-1 ${secondaryTextColor}`}>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={formInputClasses}
                />
              </div>
              <div>
                <label className={`block text-sm mb-1 ${secondaryTextColor}`}>
                  {t("account.preferredLanguageLabel")}
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => {
                    setPreferredLanguage(e.target.value);
                    setLanguage(e.target.value);
                  }}
                  className={formInputClasses}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm mb-1 ${secondaryTextColor}`}>
                  Express backing track
                </label>
                <select
                  value={backingTrackModel}
                  onChange={(e) => setBackingTrackModel(e.target.value)}
                  className={formInputClasses}
                >
                  {BACKING_TRACK_MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="block">
              <SecondaryButton className="rounded-l-none" type="submit">
                {t("account.updateButton")}
              </SecondaryButton>
            </div>
          </div>
        </form>
      )}

      {activeTab === "fonts" && (
        <form onSubmit={handleUpdateFontPreferences}>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Express Generation Fonts</h3>
            <p className={`text-sm ${secondaryTextColor}`}>
              Set the default subtitle and narrator fonts for each language.
            </p>
            <div className="space-y-3">
              {SUPPORTED_LANGUAGES.map((language) => {
                const fontOptions = getFontOptionsForLanguage(language.code);
                const preferences = fontPreferences?.[language.code] || {};
                return (
                  <div
                    key={language.code}
                    className={`grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border ${borderColor} p-4`}
                  >
                    <div>
                      <div className="text-sm font-semibold">{language.nativeName}</div>
                      <div className={`text-xs ${secondaryTextColor}`}>{language.name}</div>
                    </div>
                    <div>
                      <label className={`block text-sm mb-1 ${secondaryTextColor}`}>
                        Subtitle font
                      </label>
                      <select
                        value={preferences.expressGenerationTextFont || fontOptions[0]}
                        onChange={(e) =>
                          handleFontPreferenceChange(
                            language.code,
                            "expressGenerationTextFont",
                            e.target.value
                          )
                        }
                        className={formInputClasses}
                      >
                        {fontOptions.map((font) => (
                          <option key={font} value={font}>
                            {font}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm mb-1 ${secondaryTextColor}`}>
                        Narrator font
                      </label>
                      <select
                        value={preferences.expressGenerationSpeakerFont || fontOptions[0]}
                        onChange={(e) =>
                          handleFontPreferenceChange(
                            language.code,
                            "expressGenerationSpeakerFont",
                            e.target.value
                          )
                        }
                        className={formInputClasses}
                      >
                        {fontOptions.map((font) => (
                          <option key={font} value={font}>
                            {font}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="block">
              <SecondaryButton type="submit">Save Font Preferences</SecondaryButton>
            </div>
          </div>
        </form>
      )}

      {activeTab === "agent" && (
        <form onSubmit={handleUpdateSpeakerOptions}>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Speakers</h3>
              <p className={`text-sm ${secondaryTextColor}`}>
                Choose fallback TTS providers and preferred voices for agent-created speech.
                Sanskrit and Latin continue to use the legacy OpenAI speaker assignment.
              </p>
            </div>

            <div className="space-y-3">
              {AGENT_SPEAKER_GROUPS.map((group) => (
                <SpeakerProviderCard
                  key={group.key}
                  group={group}
                  colorMode={colorMode}
                  borderColor={borderColor}
                  mutedBg={mutedBg}
                  secondaryTextColor={secondaryTextColor}
                  speakerOptions={speakerOptions}
                  isExpanded={expandedSpeakerProvider === group.key}
                  currentlyPlayingSpeaker={currentlyPlayingSpeaker}
                  onToggleProvider={() => handleSpeakerProviderSelection(group.allowKey)}
                  onToggleExpand={() => handleSpeakerProviderExpand(group.key)}
                  onToggleSpeaker={(speakerValue) =>
                    handleSpeakerSelectionChange(group.selectionKey, speakerValue)
                  }
                  onTogglePreview={toggleSpeakerPreview}
                />
              ))}
            </div>

            <div className="block">
              <SecondaryButton type="submit">Save Speaker Preferences</SecondaryButton>
            </div>
          </div>
        </form>
      )}

      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">{t("account.updatePasswordTitle")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="password"
                placeholder={t("account.currentPassword")}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={formInputClasses}
              />
              <input
                type="password"
                placeholder={t("account.newPassword")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={formInputClasses}
              />
              <input
                type="password"
                placeholder={t("account.confirmNewPassword")}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className={formInputClasses}
              />
            </div>
            <div className="mt-4">
              <SecondaryButton onClick={handleUpdatePassword}>
                {t("account.updatePassword")}
              </SecondaryButton>
            </div>
          </div>

          <div>
            <SecondaryButton onClick={logoutUser}>{t("account.logout")}</SecondaryButton>
          </div>
        </div>
      )}

      {activeTab === "danger" && (
        <div className={`pt-2 space-y-3`}>
          <h3 className="text-xl font-semibold text-red-600">{t("account.dangerZoneTitle")}</h3>
          <p className="text-sm text-red-500">{t("account.dangerZoneDescription")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SecondaryButton
              onClick={() => openDangerConfirmation("projects")}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("account.deleteAllProjects")}
            </SecondaryButton>
            <SecondaryButton
              onClick={() => openDangerConfirmation("generations")}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("account.deleteAllGenerations")}
            </SecondaryButton>
            <SecondaryButton
              onClick={() => openDangerConfirmation("account")}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("account.deleteMyAccount")}
            </SecondaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsTabButton({ label, isActive, onClick, colorMode }) {
  const activeClasses =
    colorMode === "dark"
      ? "bg-[#16213a] text-rose-200 border border-rose-400/40"
      : "bg-rose-50 text-rose-700 border border-rose-100";
  const idleClasses =
    colorMode === "dark"
      ? "bg-[#0b1224] text-slate-300 border border-[#1f2a3d] hover:bg-[#16213a]"
      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? activeClasses : idleClasses}`}
    >
      {label}
    </button>
  );
}

function SpeakerProviderCard({
  group,
  colorMode,
  borderColor,
  mutedBg,
  secondaryTextColor,
  speakerOptions,
  isExpanded,
  currentlyPlayingSpeaker,
  onToggleProvider,
  onToggleExpand,
  onToggleSpeaker,
  onTogglePreview,
}) {
  const selectedSpeakers = Array.isArray(speakerOptions?.[group.selectionKey])
    ? speakerOptions[group.selectionKey]
    : [];
  const providerEnabled = Boolean(speakerOptions?.[group.allowKey]);

  return (
    <div className={`rounded-xl border ${borderColor} ${mutedBg} p-4 space-y-3`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={providerEnabled}
            onChange={onToggleProvider}
            className="mt-1 h-4 w-4 accent-rose-500"
          />
          <div>
            <div className="text-sm font-semibold">{group.label}</div>
            <div className={`text-xs ${secondaryTextColor}`}>
              Limit fallback speaker assignment to this provider when individual selections are
              exhausted.
            </div>
            <div className={`text-xs ${secondaryTextColor} mt-1`}>
              {selectedSpeakers.length} preferred speaker{selectedSpeakers.length === 1 ? "" : "s"} selected
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleExpand}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${borderColor} ${
            colorMode === "dark" ? "bg-[#0b1224] hover:bg-[#16213a]" : "bg-white hover:bg-slate-50"
          }`}
        >
          {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
          {isExpanded ? "Hide Speakers" : "Choose Speakers"}
        </button>
      </div>

      {isExpanded && (
        <div className="grid gap-2">
          {group.speakers.map((speaker) => {
            const isSelected = selectedSpeakers.includes(speaker.value);
            const isPlaying =
              currentlyPlayingSpeaker?.provider === speaker.provider &&
              currentlyPlayingSpeaker?.value === speaker.value;

            return (
              <div
                key={`${speaker.provider}:${speaker.value}`}
                className={`rounded-lg border ${borderColor} px-3 py-3 ${
                  colorMode === "dark" ? "bg-[#0b1224]" : "bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSpeaker(speaker.value)}
                    className="h-4 w-4 accent-rose-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{speaker.label}</div>
                    <div className={`text-xs ${secondaryTextColor}`}>
                      {speaker.genderLabel}
                      {speaker.accent ? ` | ${speaker.accent}` : ""}
                      {speaker.description ? ` | ${speaker.description}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTogglePreview(speaker)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${borderColor} ${
                      colorMode === "dark" ? "bg-[#16213a] hover:bg-[#1d2b49]" : "bg-slate-50 hover:bg-slate-100"
                    }`}
                    aria-label={isPlaying ? `Pause ${speaker.label}` : `Play ${speaker.label}`}
                  >
                    {isPlaying ? <FaPause /> : <FaPlay />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DangerConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  colorMode,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const surfaceClasses =
    colorMode === "dark"
      ? "bg-[#0f1629] text-slate-100 border border-[#1f2a3d]"
      : "bg-white text-slate-900 border border-slate-200";
  const mutedText = colorMode === "dark" ? "text-slate-400" : "text-slate-600";
  const iconBg =
    colorMode === "dark"
      ? "bg-red-500/10 text-red-200 border border-red-500/30"
      : "bg-red-50 text-red-600 border border-red-100";

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (onConfirm) {
        await onConfirm();
      }
      if (onCancel) {
        onCancel();
      }
    } catch (_) {
      // Existing toast flows surface errors to the user.
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className={`rounded-2xl p-6 shadow-xl ${surfaceClasses}`}>
      <div className="flex gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}>
          <span className="text-xl font-bold">!</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold leading-tight">{title}</h3>
          <p className={`text-sm leading-relaxed ${mutedText}`}>{description}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          className={`px-4 py-2 rounded-lg border ${mutedText} ${
            colorMode === "dark"
              ? "border-[#1f2a3d] hover:bg-[#0b1224]"
              : "border-slate-200 hover:bg-slate-50"
          }`}
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {cancelLabel}
        </button>
        <button
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Working..." : confirmLabel}
        </button>
      </div>
    </div>
  );
}
