import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function ClerkSsoCallbackPage() {
  return <AuthenticateWithRedirectCallback />;
}
