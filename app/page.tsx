import { SidequestSession } from '@/components/sidequest-session';
import { authConfigured } from '@/lib/auth-config';
export default function Home() { return <SidequestSession authEnabled={authConfigured()} />; }
