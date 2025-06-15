import React, { useEffect, useState } from "react";
import SecondaryButton from "../common/SecondaryButton.tsx";
import { useColorMode } from "../../contexts/ColorMode.jsx";
import { useUser } from "../../contexts/UserContext.jsx";
import axios from "axios";
import { getHeaders } from "../../utils/web.jsx";
import { toast } from "react-toastify";

export default function SettingsPanelContent(props) {
  const { logoutUser, updateUserDetails,
     deleteAllProjectsForUser, deleteAllGenerationsForUser, deleteAccountForUser } = props;
  const { colorMode } = useColorMode();
  const textColor =
    colorMode === "dark" ? "text-neutral-100" : "text-neutral-800";
  const cardBgColor = colorMode === "dark" ? "bg-neutral-800" : "bg-white";
  const { user, getUserAPI } = useUser();

  const [username, setUsername] = useState(user.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [contentFilterRating, setContentFilterRating] = useState(3);
  const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;


  useEffect(() => {
    if (user) {
      if (user.contentFilterRating) {
        setContentFilterRating(user.contentFilterRating);
      }
    }
  }, []);
  // Update Username Handler
  const handleUpdateUserDetails = (evt) => {
    evt.preventDefault(); // Prevent form default submission

    const updatedDetails = {
      username,
      contentFilterRating: user.isPremiumUser || user.isAdminUser ? contentFilterRating : undefined,
    };



    updateUserDetails(updatedDetails);
  };

  // Update Password Handler
  const handleUpdatePassword = () => {
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match", {
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
        toast.success("Password updated successfully!", {
          position: "bottom-center",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      })
      .catch((error) => {
        console.error("Error updating password", error);
        toast.error("Failed to update password", {
          position: "bottom-center",
        });
      });
  };

  // Danger Zone Handlers
  const handleDeleteAllProjects = () => {
    if (window.confirm("Are you sure you want to delete all projects? This action is not reversible.")) {
      // Make API call to delete all projects

      deleteAllProjectsForUser();
    }
  };

  const handleDeleteAllGenerations = () => {
    if (window.confirm("Are you sure you want to delete all generations? This action is not reversible.")) {
      // Make API call to delete all generations
      deleteAllGenerationsForUser();

    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to delete your account? This action is not reversible.")) {
      // Make API call to delete account
      deleteAccountForUser();

    }
  };

  const formBGColor = colorMode === "dark" ? "bg-gray-800" : "bg-gray-200";

  return (
    <div className={`p-6 rounded-lg shadow-md ${cardBgColor} ${textColor}`}>
      {/* Update Username */}
      <form onSubmit={handleUpdateUserDetails}>
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Update Settings</h3>
          <div className="grid grid-cols-2 w-full">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`border rounded-l px-4 py-2 w-auto ${formBGColor}`}
              />
            </div>
            <div>
              {user.isAdminUser && (
                <div className="flex items-center space-x-4 mb-4">
                  <label className="text-sm font-medium text-gray-600">
                    Content Filter Rating
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={contentFilterRating}
                    onChange={(e) => setContentFilterRating(e.target.value)}
                    className={`w-32 h-2 rounded-lg cursor-pointer ${colorMode === "dark" ? "bg-gray-700" : "bg-gray-300"}`}
                  />
                  <span className="text-xs text-gray-500">{contentFilterRating}</span>
                </div>
              )}
            </div>
          </div>
          <div className="block">
            <SecondaryButton
              className="rounded-l-none"
              type="submit"
            >
              Update
            </SecondaryButton>
          </div>
        </div>
      </form>

      {/* Update Password */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Update Password</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="password"
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={`border rounded px-4 py-2 w-full ${formBGColor}`}
          />
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={`border rounded px-4 py-2 w-full ${formBGColor}`}
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            className={`border rounded px-4 py-2 w-full ${formBGColor}`}
          />
        </div>
        <div className="mt-4">
          <SecondaryButton onClick={handleUpdatePassword}>
            Update Password
          </SecondaryButton>
        </div>
      </div>

      {/* Logout Button */}
      <div className="mb-8">
        <SecondaryButton onClick={logoutUser}>Logout</SecondaryButton>
      </div>

      {/* Danger Zone */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold text-red-600 mb-2">
          Danger Zone
        </h3>
        <p className="text-sm text-red-500 mb-4">
          This action is not reversible.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SecondaryButton
            onClick={handleDeleteAllProjects}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete All Projects
          </SecondaryButton>
          <SecondaryButton
            onClick={handleDeleteAllGenerations}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete All Generations
          </SecondaryButton>
          <SecondaryButton
            onClick={handleDeleteAccount}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete My Account
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
