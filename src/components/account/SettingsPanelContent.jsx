import React, { useEffect, useRef, useState } from "react";
import SecondaryButton from "../common/SecondaryButton.tsx";
import { useColorMode } from "../../contexts/ColorMode.jsx";
import { useUser } from "../../contexts/UserContext.jsx";
import { useLocalization } from "../../contexts/LocalizationContext.jsx";
import axios from "axios";
import { getHeaders } from "../../utils/web.jsx";
import { toast } from "react-toastify";
import { SUPPORTED_LANGUAGES } from "../../constants/supportedLanguages.js";
import { useAlertDialog } from "../../contexts/AlertDialogContext.jsx";
import {
  getFontOptionsForLanguage,
  mergeFontPreferencesWithDefaults,
} from "../../constants/fontPreferences.js";

export default function SettingsPanelContent(props) {
  const { logoutUser, updateUserDetails,
     deleteAllProjectsForUser, deleteAllGenerationsForUser, deleteAccountForUser } = props;
  const { colorMode } = useColorMode();
  const { openAlertDialog, closeAlertDialog } = useAlertDialog();
  const textColor = colorMode === "dark" ? "text-slate-100" : "text-slate-900";
  const cardBgColor = colorMode === "dark" ? "bg-[#0f1629]" : "bg-white";
  const secondaryTextColor = colorMode === "dark" ? "text-slate-400" : "text-slate-600";
  const borderColor = colorMode === "dark" ? "border-[#1f2a3d]" : "border-slate-200";
  const inputBgColor = colorMode === "dark" ? "bg-[#0b1224]" : "bg-white";
  const { user } = useUser();
  const { t, setLanguage } = useLocalization();

  const [username, setUsername] = useState(user.username || "");
  const [preferredLanguage, setPreferredLanguage] = useState(user.preferredLanguage || "en");
  const [fontPreferences, setFontPreferences] = useState(() =>
    mergeFontPreferencesWithDefaults(user?.fontPreferences)
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;


  useEffect(() => {
    if (user) {
      if (user.preferredLanguage) {
        setPreferredLanguage(user.preferredLanguage);
      }
      setFontPreferences(mergeFontPreferencesWithDefaults(user.fontPreferences));
    }
  }, [user]);
  // Update Username Handler
  const handleUpdateUserDetails = (evt) => {
    evt.preventDefault(); // Prevent form default submission

    const updatedDetails = {
      username,
      preferredLanguage,
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

  // Update Password Handler
  const handleUpdatePassword = () => {
    if (newPassword !== confirmNewPassword) {
      toast.error(t("account.passwordMismatch"), {
        position: "bottom-center",
      });
      return;
    }
    const headers = getHeaders();
    axios
      .post(
        `${PROCESSOR_SERVER}/users/update_password`, // Adjust API endpoint as needed
        { currentPassword, newPassword },
        headers
      )
      .then(() => {
        toast.success(t("account.passwordUpdateSuccess"), {
          position: "bottom-center",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      })
      .catch((error) => {

        toast.error(t("account.passwordUpdateFail"), {
          position: "bottom-center",
        });
      });
  };

  // Danger Zone Handlers
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

  const handleDeleteAllProjects = () => openDangerConfirmation("projects");

  const handleDeleteAllGenerations = () => openDangerConfirmation("generations");

  const handleDeleteAccount = () => openDangerConfirmation("account");

  const formInputClasses = `border ${borderColor} rounded px-4 py-2 w-full ${inputBgColor} ${textColor}`;

  return (
    <div className={`p-6 rounded-2xl shadow-sm border ${borderColor} ${cardBgColor} ${textColor} space-y-8`}>
      {/* Update Username */}
      <form onSubmit={handleUpdateUserDetails}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t("account.updateSettingsTitle")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-4">
            <div>
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
          </div>
          <div className="block">
            <SecondaryButton
              className="rounded-l-none"
              type="submit"
            >
              {t("account.updateButton")}
            </SecondaryButton>
          </div>
        </div>
      </form>

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

      {/* Update Password */}
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

      {/* Logout Button */}
      <div className="mb-4">
        <SecondaryButton onClick={logoutUser}>{t("account.logout")}</SecondaryButton>
      </div>

      {/* Danger Zone */}
      <div className={`mt-8 pt-4 border-t ${borderColor} space-y-3`}>
        <h3 className="text-xl font-semibold text-red-600 mb-2">
          {t("account.dangerZoneTitle")}
        </h3>
        <p className="text-sm text-red-500">
          {t("account.dangerZoneDescription")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SecondaryButton
            onClick={handleDeleteAllProjects}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {t("account.deleteAllProjects")}
          </SecondaryButton>
          <SecondaryButton
            onClick={handleDeleteAllGenerations}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {t("account.deleteAllGenerations")}
          </SecondaryButton>
          <SecondaryButton
            onClick={handleDeleteAccount}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {t("account.deleteMyAccount")}
          </SecondaryButton>
        </div>
      </div>
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
    } catch (err) {
      // Surface errors via existing toast messaging; keep dialog open for retry.
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
          className={`px-4 py-2 rounded-lg border ${mutedText} ${colorMode === "dark" ? "border-[#1f2a3d] hover:bg-[#0b1224]" : "border-slate-200 hover:bg-slate-50"}`}
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
