import type { Metadata } from 'next';
import { CmsPageContent, getPublicCmsPage, pageMetadata } from '../_components/PublicCmsPage';
import { CmsPageShell } from '../_components/CmsPageShell';

const title = "Privacy Policy";
const description = "Learn how Zeluxi collects, uses, and protects personal information.";
const canonical = "/privacy";
const slugs = ["privacy","privacy-policy"];
const fallbackContent = "<p>Zeluxi respects your privacy. This policy explains how information may be collected, used, stored, and shared when you use our online store, create an account, or place an order.</p><h2>Information we collect</h2><p>Depending on your use of the store, information may include your name, email address, phone number, delivery address, account identifiers, order details, and payment reference information you submit. If you use Facebook sign-in, we may receive profile information you authorize Facebook to share.</p><h2>How information is used</h2><ul><li>Create and secure accounts.</li><li>Process orders, arrange delivery, and provide support.</li><li>Maintain and improve the website and prevent misuse.</li><li>Meet legal obligations.</li></ul><h2>Sharing and retention</h2><p>Information may be shared with service providers needed to operate the store, authenticate accounts, host data, process payments, or deliver orders. We retain information only as long as reasonably needed for service, business, dispute resolution, and legal purposes. We do not sell personal information to advertisers.</p><h2>Facebook and third-party services</h2><p>If you sign in with Facebook, we use only information and permissions needed for the feature you choose. You may remove the app from your Facebook account settings. To request deletion of information stored by Zeluxi, visit the <a href=\"/data-deletion\">Data Deletion page</a>.</p><h2>Your choices and contact</h2><p>You may request access, correction, or deletion of personal information, subject to applicable law. Email privacy requests to <a href=\"mailto:lofimartbd@gmail.com\">lofimartbd@gmail.com</a>.</p><h2>Security and changes</h2><p>We use reasonable safeguards, but no online service can guarantee absolute security. We may update this policy when practices or legal requirements change.</p>";

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
