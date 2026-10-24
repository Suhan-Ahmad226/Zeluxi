import { permanentRedirect } from 'next/navigation';

export default function LegacyPrivacyPolicyRoute() {
  permanentRedirect('/privacy');
}
