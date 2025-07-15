"use client";

import { Suspense } from "react";
import LoginSignupForm from "@/components/login/login-signup-form";

export default function SignUpPage() {
    return (
        <Suspense fallback={<div></div>}>
            <LoginSignupForm mode="signup" />;
        </Suspense>
    )
}