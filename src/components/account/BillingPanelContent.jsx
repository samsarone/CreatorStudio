// BillingPanelContent.js

import React from "react";
import { useColorMode } from "../../contexts/ColorMode.jsx";

export default function BillingPanelContent() {
  const { colorMode } = useColorMode();
  const textColor =
    colorMode === "dark" ? "text-neutral-100" : "text-neutral-800";
  const cardBgColor = colorMode === "dark" ? "bg-neutral-800" : "bg-white";

  const tableBgColor = colorMode === "dark" ? "bg-gray-800" : "bg-gray-200";

  // Dummy billing data
  const billingData = [
    {
      billingDate: "2023-09-15",
      billingAmount: "$29.99",
      creditsAdded: "100",
      paymentType: "Credit Card",
    },
    {
      billingDate: "2023-08-15",
      billingAmount: "$29.99",
      creditsAdded: "100",
      paymentType: "Credit Card",
    },
    // Add more dummy data as needed
  ];

  return (
    <div className={`p-6 rounded-lg shadow-md ${cardBgColor} ${textColor}`}>
      <h3 className="text-xl font-semibold mb-4">Billing History will appear here.</h3>
      {/* <table className="min-w-full table-auto">
        <thead>
          <tr className="border-b ">
            <th className="px-4 py-2 text-left ">Billing Date</th>
            <th className="px-4 py-2 text-left">Billing Amount</th>
            <th className="px-4 py-2 text-left">Credits Added</th>
            <th className="px-4 py-2 text-left">Payment Type</th>
          </tr>
        </thead>
        <tbody>
          {billingData.map((item, index) => (
            <tr
              key={index}
              className={`border-b ${
                index % 2 === 0 ? "bg-neutral-50" : "bg-neutral-100"
              }`}
            >
              <td className={`px-4 py-2 ${tableBgColor}`}>{item.billingDate}</td>
              <td className={`px-4 py-2 ${tableBgColor}`}>{item.billingAmount}</td>
              <td className={`px-4 py-2 ${tableBgColor}`}>{item.creditsAdded}</td>
              <td className={`px-4 py-2 ${tableBgColor}`}>{item.paymentType}</td>
            </tr>
          ))}
        </tbody>
      </table> */}
    </div>
  );
}
