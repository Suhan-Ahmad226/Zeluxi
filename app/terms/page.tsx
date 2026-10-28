import type { Metadata } from 'next';
import { CmsPageContent, getPublicCmsPage, pageMetadata } from '../_components/PublicCmsPage';
import { CmsPageShell } from '../_components/CmsPageShell';

const title = "Terms of Service";
const description = "Terms and conditions for using the online store.";
const canonical = "/terms";
const slugs = ["terms","terms-of-service"];
const fallbackContent = "<p>These Terms apply to your use of the {{storeName}} online store and placement of orders. By using the website, you agree to these Terms.</p><h2>Products and availability</h2><p>We aim to keep product descriptions, prices, images, and availability accurate. Products may become unavailable, and errors may occur. We may correct errors or cancel an order where necessary and permitted by law.</p><h2>Orders and payment</h2><p>Orders may be reviewed before confirmation. You agree to provide accurate contact, delivery, and payment-reference information. Orders may be delayed, declined, or cancelled if information is incomplete, payment cannot be verified, a product is unavailable, or fraud is suspected.</p><h2>Delivery, returns, and refunds</h2><p>Delivery timing and charges depend on destination, courier, and order. Returns, exchanges, cancellations, and refunds are subject to the policies published by {{storeName}} and applicable law. Contact us promptly if an order is damaged, incomplete, or incorrect.</p><h2>Accounts and acceptable use</h2><p>Keep your sign-in credentials secure and provide accurate information. Do not submit fraudulent orders, attempt unauthorized access, interfere with the website, or violate applicable law.</p><h2>Third-party services</h2><p>Features such as Facebook sign-in, payment providers, hosting, and delivery services may also be governed by their own terms and privacy policies.</p><h2>Availability and changes</h2><p>We aim to keep the website available but do not guarantee uninterrupted service. We may update these Terms when needed. Questions can be sent to <a href=\"mailto:lofimartbd@gmail.com\">lofimartbd@gmail.com</a>.</p>";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublicCmsPage(slugs);
  return await pageMetadata(page, title, description, canonical) as Metadata;
}

export default async function PublicPage() {
  const page = await getPublicCmsPage(slugs);
  return (
    <CmsPageShell>
      <CmsPageContent page={page} fallbackTitle={title} fallbackContent={page?.content || fallbackContent} />
    </CmsPageShell>
  );
}
