import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { FaBolt, FaClock, FaDatabase, FaSync } from "react-icons/fa";
import { toast } from "react-toastify";

import SecondaryButton from "../common/SecondaryButton.tsx";
import { useColorMode } from "../../contexts/ColorMode.jsx";
import { getHeaders } from "../../utils/web.jsx";

const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;
const numberFormatter = new Intl.NumberFormat("en-US");

const SOURCE_LABELS = {
  chat_enhance: "Chat Enhance",
  image_update_set: "Image list to set",
  image_remove_branding: "Image brand removal",
  image_replace_branding: "Image brand replace",
  image_enhance: "Image upscale",
  image_list_to_video: "Image list to video",
};

const formatSourceLabel = (source) => {
  if (!source) return "Unknown";
  if (SOURCE_LABELS[source]) return SOURCE_LABELS[source];
  return source
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatMetadataSummary = (metadata) => {
  if (!metadata || typeof metadata !== "object") return "—";
  const parts = [];

  if (metadata.duration) parts.push(`Duration: ${metadata.duration}s`);
  if (metadata.imageCount) parts.push(`Images: ${metadata.imageCount}`);
  if (metadata.targetImageCount) parts.push(`Targets: ${metadata.targetImageCount}`);
  if (metadata.aspectRatio) parts.push(`Aspect ratio: ${metadata.aspectRatio}`);
  if (metadata.resolution) parts.push(`Resolution: ${metadata.resolution}`);
  if (metadata.sessionId) parts.push(`Session: ${metadata.sessionId}`);
  if (metadata.pricing?.model) parts.push(`Model: ${metadata.pricing.model}`);
  if (metadata.pricing?.mode) parts.push(`Mode: ${metadata.pricing.mode}`);

  return parts.length > 0 ? parts.join(" • ") : "—";
};

const formatDate = (value) => {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("MMM D, YYYY h:mm A") : value;
};

export default function UsagePanelContent() {
  const { colorMode } = useColorMode();

  const [usageLogs, setUsageLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(false);

  const textColor = colorMode === "dark" ? "text-slate-100" : "text-slate-900";
  const secondaryTextColor = colorMode === "dark" ? "text-slate-400" : "text-slate-500";
  const cardBgColor = colorMode === "dark" ? "bg-[#0f1629]" : "bg-white";
  const borderColor = colorMode === "dark" ? "border-[#1f2a3d]" : "border-slate-200";
  const mutedBg = colorMode === "dark" ? "bg-[#111a2f]" : "bg-slate-50";
  const headerBg = colorMode === "dark" ? "bg-[#0b1224]" : "bg-slate-100";

  const fetchUsageLogs = async (pageToLoad = 1) => {
    setLoading(true);
    try {
      const headers = getHeaders() || {};
      const response = await axios.get(`${PROCESSOR_SERVER}/users/usage/logs`, {
        ...headers,
        params: { page: pageToLoad, pageSize: pagination.pageSize },
      });

      setUsageLogs(response.data?.items || []);
      setPagination((prev) => ({
        ...prev,
        ...(response.data?.pagination || {}),
      }));
    } catch (err) {
      toast.error("Failed to load usage logs", { position: "bottom-center" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCreditsUsed = useMemo(
    () =>
      usageLogs.reduce(
        (sum, item) => sum + Math.max(0, Number.parseFloat(item.credits || 0)),
        0
      ),
    [usageLogs]
  );

  const lastActivity = usageLogs[0]?.createdAt;
  const disablePrev = loading || !pagination.hasPreviousPage;
  const disableNext = loading || !pagination.hasNextPage;

  const goToPage = (pageToLoad) => {
    if (pageToLoad < 1) return;
    fetchUsageLogs(pageToLoad);
  };

  return (
    <div className={`flex flex-col gap-6 ${textColor}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Usage</h2>
          <p className={`text-sm ${secondaryTextColor}`}>
            Track every API call and the credits consumed.
          </p>
        </div>
        <SecondaryButton onClick={() => fetchUsageLogs(pagination.page)} isPending={loading}>
          <FaSync className={`mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </SecondaryButton>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={`rounded-2xl border ${borderColor} ${cardBgColor} p-4`}>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-rose-500/10 p-3 text-rose-400">
              <FaBolt />
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wide ${secondaryTextColor}`}>
                Credits used (page)
              </p>
              <p className="text-2xl font-bold">
                {numberFormatter.format(Math.round(totalCreditsUsed))}
              </p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border ${borderColor} ${cardBgColor} p-4`}>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-500/10 p-3 text-indigo-400">
              <FaDatabase />
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wide ${secondaryTextColor}`}>
                API calls (page)
              </p>
              <p className="text-2xl font-bold">{usageLogs.length}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border ${borderColor} ${cardBgColor} p-4`}>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-400">
              <FaClock />
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wide ${secondaryTextColor}`}>
                Last activity
              </p>
              <p className="text-base font-semibold">
                {lastActivity ? formatDate(lastActivity) : "No usage yet"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border ${borderColor} ${cardBgColor} overflow-hidden`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${borderColor} ${headerBg}`}>
          <div>
            <p className="text-lg font-semibold">Usage log</p>
            <p className={`text-xs ${secondaryTextColor}`}>
              Showing API charges (page {pagination.page || 1}) with {pagination.pageSize} per page.
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm">
              <FaSync className="animate-spin" />
              <span>Loading...</span>
            </div>
          )}
        </div>

        {usageLogs.length === 0 && !loading ? (
          <div className="p-6 text-center">
            <p className="text-lg font-semibold">No usage yet</p>
            <p className={`text-sm ${secondaryTextColor}`}>
              Calls you make with your API key will appear here with credit details.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className={headerBg}>
                <tr>
                  <th className="px-4 py-3 text-left">Endpoint</th>
                  <th className="px-4 py-3 text-left">Credits</th>
                  <th className="px-4 py-3 text-left">Details</th>
                  <th className="px-4 py-3 text-left">Balance</th>
                  <th className="px-4 py-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {usageLogs.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className={`border-t ${borderColor} ${
                      index % 2 === 0 ? mutedBg : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">{formatSourceLabel(item.source)}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-rose-400">
                        -{numberFormatter.format(Math.max(0, item.credits || 0))}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${secondaryTextColor}`}>
                      {formatMetadataSummary(item.metadata)}
                    </td>
                    <td className="px-4 py-3">
                      {item.balanceAfter === null || item.balanceAfter === undefined
                        ? "—"
                        : numberFormatter.format(item.balanceAfter)}
                    </td>
                    <td className={`px-4 py-3 ${secondaryTextColor}`}>
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className={`text-sm ${secondaryTextColor}`}>
          Page {pagination.page} of {pagination.totalPages || 1}
        </p>
        <div className="flex gap-2">
          <SecondaryButton
            onClick={() => {
              if (disablePrev) return;
              goToPage((pagination.page || 1) - 1);
            }}
            extraClasses={disablePrev ? "opacity-50 pointer-events-none" : ""}
            isPending={loading && pagination.hasPreviousPage}
          >
            Previous
          </SecondaryButton>
          <SecondaryButton
            onClick={() => {
              if (disableNext) return;
              goToPage((pagination.page || 1) + 1);
            }}
            extraClasses={disableNext ? "opacity-50 pointer-events-none" : ""}
            isPending={loading && pagination.hasNextPage}
          >
            Next
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
