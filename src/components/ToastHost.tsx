"use client";
import { Toaster } from "sonner";

export default function ToastHost() {
  return (
    <Toaster
      position="bottom-center"
      offset={80} // <--- move toast up by 50px
      richColors
    />
  );
}
