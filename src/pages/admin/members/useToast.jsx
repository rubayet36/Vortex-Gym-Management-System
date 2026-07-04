import React, { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };
  const ToastEl = toast ? (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
        toast.type === "error"
          ? "bg-primary/10 border-primary/30 text-primary"
          : "bg-accent/10 border-accent/30 text-accent"
      }`}
    >
      {toast.type === "error" ? (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      )}
      {toast.msg}
    </div>
  ) : null;
  return { show, ToastEl };
}
