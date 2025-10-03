// src/services/payment.ts
import api from "./api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export async function createRazorpayOrder(payload: { amount: number; currency?: string; metadata?: any }) {
  // amount in smallest currency unit (e.g., paise if INR)
  const res = await api.post("/payment/razorpay/create-order", {
    amount: payload.amount,
    currency: payload.currency || "INR",
    metadata: payload.metadata || {},
  });
  return res.data; // expect { orderId, amount, currency, receipt? }
}

export async function openRazorpayCheckout({
  key,
  orderId,
  amount,
  name,
  description,
  prefill,
  onSuccess,
  onFailure,
}: {
  key: string;
  orderId: string;
  amount: number;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  onSuccess?: (payload: any) => void;
  onFailure?: (err: any) => void;
}) {
  // ensure script loaded
  if (!window.Razorpay) {
    await loadRazorpayScript();
  }

  const options = {
    key,
    amount,
    currency: "INR",
    name: name || "RideFlow",
    description: description || "Ride Payment",
    order_id: orderId,
    handler: function (response: any) {
      onSuccess?.(response);
    },
    modal: {
      ondismiss: function () {
        onFailure?.({ dismissed: true });
      },
    },
    prefill: prefill || {},
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}

export function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
}
