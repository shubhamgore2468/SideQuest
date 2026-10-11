import { MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';

export function ContactActions({ twitter, phone }: { twitter?: string; phone?: string }) {
  const number = phone?.trim().replace(/[\s().-]/g, '') || '';
  const canMessage = /^\+?\d{7,15}$/.test(number);
  return <div className="contact-actions">
    <div className="button-row">
      {twitter && <Button asChild variant="outline"><a href={twitter} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Twitter / X profile</a></Button>}
      {canMessage && <Button asChild><a href={`sms:${number}`}><MessageCircle size={16}/>iMessage / Text</a></Button>}
    </div>
    {twitter && <p className="fine">Open their X profile, then tap Message if they allow DMs.</p>}
    {canMessage && <p className="fine">Opens your messaging app with their number. On Apple devices, Messages chooses iMessage or SMS.</p>}
  </div>;
}
