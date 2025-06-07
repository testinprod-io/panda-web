"use client";

import { useSearchParams } from "next/navigation";
import CreatePassword from "./create-password";
import { Suspense } from "react";
import LoginSignupForm from "@/components/login/login-signup-form";

function SignUpPageContent() {
  const searchParams = useSearchParams();
  const step = searchParams.get("step");

  if (step === "password") {
    return <CreatePassword />;
  }

  return <LoginSignupForm mode="signup" />;
}

export default function SignUpPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SignUpPageContent />
        </Suspense>
    )
}