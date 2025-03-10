import React, { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { FaSpinner } from "react-icons/fa6";
import { useUser } from "../../contexts/UserContext";
import { useColorMode } from "../../contexts/ColorMode";

/**
 * A split-button that replicates the styling of CommonButton
 * but provides a main action + dropdown items, using Headless UI.
 *
 * Props:
 * - mainLabel:     string or JSX – the text shown on the main (left) button.
 * - onMainClick:   function – callback when user clicks the main (left) button.
 * - isPending:     boolean – show spinner & disable if true (similar to CommonButton).
 * - isDisabled:    boolean – additional disable logic.
 * - extraClasses:  string – optional extra tailwind classes for further styling.
 * - dropdownItems: array of { label: string, onClick: () => void } – the items in the dropdown.
 */
export default function CommonDropdownButton({
  mainLabel,
  onMainClick,
  isPending,
  isDisabled,
  extraClasses = "",
  dropdownItems = []
}) {
  // Access user context & color mode to replicate CommonButton logic
  const { user } = useUser();
  const { colorMode } = useColorMode();

  // Determine if button should be disabled
  const isBtnDisabled = !user?. _id || isPending || isDisabled;

  // If isPending, show the spinner
  const pendingSpinner = isPending ? (
    <FaSpinner className="animate-spin inline-flex ml-2" />
  ) : null;

  // Replicate the gradient styles from CommonButton
  const gradientBg =
    colorMode === "dark"
      ? "text-neutral-100 border-2 border-neutral-500 from-gray-950 to-gray-800 hover:from-gray-800 hover:text-neutral-100"
      : "text-neutral-100 from-green-500 to-green-600 hover:text-neutral-300";

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div className="flex shadow-lg">
        {/* Main (left) portion of the split-button */}
        <button
          onClick={onMainClick}
          disabled={isBtnDisabled}
          className={`
            m-auto text-center min-w-16
            rounded-l-lg shadow-sm
            font-bold bg-gradient-to-r
            px-3 py-2
            cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            disabled:bg-gray-800 disabled:text-neutral-100
            ${gradientBg}
            ${extraClasses}
          `}
        >
          {mainLabel}
          {pendingSpinner}
        </button>

        {/* Chevron (right) portion of the split-button */}
        <Menu.Button
          disabled={isBtnDisabled}
          className={`
            inline-flex items-center justify-center
            rounded-r-lg
            px-2
            font-bold bg-gradient-to-r
            cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            disabled:bg-gray-800 disabled:text-neutral-100
            ${gradientBg}
          `}
        >
          ▼
        </Menu.Button>
      </div>

      {/* Dropdown menu (Headless UI Transition for animations) */}
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <Menu.Items
          className={`
            origin-top-right absolute right-0 mt-2
            w-36 bg-neutral-900 border border-gray-600
            rounded shadow-lg z-50
          `}
        >
          {dropdownItems.map((item, idx) => (
            <Menu.Item key={idx}>
              {({ active }) => (
                <div
                  onClick={item.onClick}
                  className={`
                    block pl-8 py-2 text-sm text-gray-300
                    ${active ? "bg-gray-800 text-white" : ""}
                    cursor-pointer
                  `}
                >
                  {item.label}
                </div>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
