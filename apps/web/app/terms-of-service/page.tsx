import { LegalPage } from "../../components/LegalPage";

export const metadata = { title: "Terms & Conditions — Vouch" };

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms & Conditions" updatedDate="July 7, 2026">
      <p className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-800">
        This page is a placeholder template and has not been reviewed by
        legal counsel. Replace it with terms reviewed by a lawyer before
        launching publicly.
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By creating an account or otherwise using the Vouch mobile
        application or web dashboard (the &ldquo;Service&rdquo;), you agree
        to these Terms &amp; Conditions. If you do not agree, do not use the
        Service.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old, or the age of majority in your
        jurisdiction, to create an account. Registration requires an
        existing member to sponsor and approve your account.
      </p>

      <h2>3. Your Account</h2>
      <ul>
        <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
        <li>You are responsible for all activity that occurs under your account.</li>
        <li>You must provide accurate and complete registration information.</li>
      </ul>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Post content that is unlawful, defamatory, or infringes another person&rsquo;s rights.</li>
        <li>Impersonate any person or entity, or misrepresent your affiliation.</li>
        <li>Attempt to gain unauthorized access to the Service or other members&rsquo; accounts.</li>
        <li>Use the Service to send spam or unsolicited commercial messages outside the intended network features.</li>
      </ul>

      <h2>5. Content Ownership</h2>
      <p>
        You retain ownership of the posts, events, library items, images,
        and other content you submit. By submitting content, you grant us a
        non-exclusive, worldwide license to host, display, and distribute
        that content within the Service to deliver its features (e.g.
        sharing posts with your network).
      </p>

      <h2>6. Referral / Sponsor Structure</h2>
      <p>
        The Service organizes members into a sponsor-based network
        hierarchy. Approval of new members by a sponsor does not create any
        partnership, agency, or employment relationship between members or
        between a member and Vouch.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may request deletion of your account at any time. We may
        suspend or terminate accounts that violate these Terms or that we
        reasonably believe pose a risk to the Service or other members.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranties of
        any kind, whether express or implied, including warranties of
        merchantability, fitness for a particular purpose, or
        non-infringement.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Vouch shall not be liable
        for any indirect, incidental, special, or consequential damages
        arising out of or related to your use of the Service.
      </p>

      <h2>10. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the
        Service after changes take effect constitutes acceptance of the
        revised Terms.
      </p>

      <h2>11. Contact Us</h2>
      <p>
        Questions about these Terms can be sent through the Contact Us form
        in the app.
      </p>
    </LegalPage>
  );
}
