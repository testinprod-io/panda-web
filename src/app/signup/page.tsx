"use client";

import { useSearchParams } from "next/navigation";
import CreateAccount from "./create-account";
import CreatePassword from "./create-password";
import { Suspense } from "react";

function SignUpPageContent() {
  const searchParams = useSearchParams();
  const step = searchParams.get("step");

  if (step === "password") {
    return <CreatePassword />;
  }

  return <CreateAccount />;
}

export default function SignUpPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SignUpPageContent />
        </Suspense>
    )
}