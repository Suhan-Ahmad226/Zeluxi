import type { Metadata } from 'next';
import { CmsPageContent, getPublicCmsPage, pageMetadata } from '../_components/PublicCmsPage';
import { CmsPageShell } from '../_components/CmsPageShell';

const title = "Data Deletion Instructions";
const description = "How to request deletion of personal information associated with Zeluxi.";
const canonical = "/data-deletion";
const slugs = ["data-deletion","data-deletion-instructions"];
const fallbackContent = "<p>You can request deletion of personal information associated with your Zeluxi account, including information obtained through Facebook sign-in, by following these steps:</p><ol><li>Email <a href=\"mailto:lofimartbd@gmail.com\">lofimartbd@gmail.com</a> with the subject <strong>“Zeluxi Data Deletion Request”</strong>.</li><li>Include the email address associated with your Zeluxi account and state that you want your personal data deleted. Do not send passwords or payment card details.</li><li>We may ask for reasonable information to verify your identity before processing the request.</li></ol><p>We will review the request and delete or anonymize eligible personal information, subject to applicable law and records we are required or legitimately permitted to retain (for example, transaction records needed for accounting or fraud prevention). We will contact you if more information is required or when processing is complete.</p><p>You may also remove Zeluxi from your Facebook account's Apps and Websites settings. Removing Facebook access does not automatically delete information already stored by Zeluxi, so please also email us if you want deletion.</p><p>Contact: <a href=\"mailto:lofimartbd@gmail.com\">lofimartbd@gmail.com</a>.</p>";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublicCmsPage(slugs);
  return pageMetadata(page, title, description, canonical) as Metadata;
}

export default async function PublicPage() {
  const page = await getPublicCmsPage(slugs);
  return (
    <CmsPageShell>
      <CmsPageContent page={page} fallbackTitle={title} fallbackContent={page?.content || fallbackContent} />
    </CmsPageShell>
  );
}
