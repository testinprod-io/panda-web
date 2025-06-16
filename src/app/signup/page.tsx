"use client";

import { useSearchParams } from "next/navigation";
import CreatePassword from "./create-password";
import { Suspense } from "react";
import LoginSignupForm from "@/components/login/login-signup-form";
import PasswordConfirmation from "./password-confirmation";

function SignUpPageContent() {
  const searchParams = useSearchParams();
  const step = searchParams.get("step");

  if (step === "create-password") {
    return <CreatePassword />;
  }

  if (step === "password-confirmation") {
    return <PasswordConfirmation />;
  }

  return <LoginSignupForm mode="signup" />;
}

export default function SignUpPage() {
    return (
        <Suspense fallback={<div></div>}>
            <SignUpPageContent />
        </Suspense>
    )
}