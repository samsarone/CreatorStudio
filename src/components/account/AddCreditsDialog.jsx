import React, { useState } from 'react';
import SingleSelect from '../common/SingleSelect.jsx';
import CommonButton from '../common/CommonButton.tsx';
import SecondaryButton from '../common/SecondaryButton.tsx';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

import { getHeaders } from '../../utils/web.jsx';
import axios from 'axios';
const PROCESSOR_SERVER = import.meta.env.VITE_PROCESSOR_API;

const creditOptions = [
  { value: 10, label: '$10' },
  { value: 25, label: '$25' },
  { value: 50, label: '$50' },
  { value: 100, label: '$100' },
  { value: 500, label: '$500' },
  { value: 1000, label: '$1000' },
];

export default function AddCreditsDialog(props) {
  const {   requestApplyCreditsCoupon} = props;

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
  

  const [selectedOption, setSelectedOption] = useState({
    value: 10,
    label: '$10',
  });

  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  const handlePurchase = () => {
    if (selectedOption) {
      // Implement your purchase logic here
      purchaseCreditsForUser(selectedOption.value);
    }
  };

  const handleApplyCoupon = () => {


    // Implement coupon application logic here
    requestApplyCreditsCoupon(couponCode);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Purchase Credits</h2>
      
      <SingleSelect 
        options={creditOptions} 
        value={selectedOption} 
        onChange={setSelectedOption} 
        placeholder="Select amount"
        className="mb-4"
      />
      


      <div className="m-auto mb-8">
        <div
          className="m-auto cursor-pointer text-neutral-100 "
          onClick={() => setIsCouponOpen(!isCouponOpen)}
        >
          <span>Have a credits coupon?</span>
          {isCouponOpen ? <FaChevronUp className='inline-flex ml-2'/> : <FaChevronDown className='inline-flex ml-2'/>}
        </div>
        {isCouponOpen && (
          <div className="mt-4">
            <input
              type="text"
              placeholder="Enter credits code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className={`p-2 border rounded mb-2 bg-gray-950 text-neutral-100`}
            />
            <div>
              <SecondaryButton onClick={handleApplyCoupon}>
                Apply Coupon
              </SecondaryButton>
            </div>
          </div>
        )}
      </div>

      <CommonButton onClick={handlePurchase}>
        Purchase
      </CommonButton>
    </div>
  );
}
