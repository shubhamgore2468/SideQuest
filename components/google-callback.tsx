'use client';
import { HandleSSOCallback, SignIn, SignUp } from '@clerk/nextjs';
import { useState } from 'react';

export function GoogleCallback() {
  const [step, setStep] = useState<'callback' | 'sign-in' | 'sign-up'>('callback');
  const appearance = { elements: { socialButtons: { display: 'none' } } };
  return <main className="site-shell">
    {step === 'sign-in' ? <SignIn routing="hash" forceRedirectUrl="/" appearance={appearance} /> :
      step === 'sign-up' ? <SignUp routing="hash" forceRedirectUrl="/" appearance={appearance} /> :
        <><p role="status">Completing Google sign-in…</p><HandleSSOCallback
          navigateToApp={({ decorateUrl }) => window.location.replace(decorateUrl('/'))}
          navigateToSignIn={() => setStep('sign-in')}
          navigateToSignUp={() => setStep('sign-up')}
        /></>}
  </main>;
}
