import React from 'react'
import { Link } from 'react-router-dom'

function Privacy() {
  return (
    <div className="w-full min-h-screen pt-8 pb-24 px-6 lg:px-8 max-w-4xl mx-auto">
      {/* PAGE HEADER */}
      <div className="mb-12">
        <div className="flex items-center text-sm font-medium text-slate-500 mb-4">
          <Link to="/" className="hover:text-blue-500 transition-colors">Home</Link>
          <span className="mx-2">&rarr;</span>
          <span className="text-slate-900 dark:text-white">Privacy Policy</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
          Privacy Policy
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Last updated: August 2026
        </p>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-a:text-blue-600 dark:prose-a:text-blue-400">
        <p>
          Welcome to LockStrata. This Privacy Policy explains how we collect, use, and handle your information when you use our software licensing platform.
        </p>

        <h3>1. Information We Collect</h3>
        <p>
          We collect information you provide directly to us when you create an account, purchase software licenses, or communicate with our support team. This may include your name, email address, company details, and authentication credentials. We also automatically collect technical data regarding license activations, such as hardware identifiers, IP addresses, and timestamps required for license verification.
        </p>

        <h3>2. How We Use Information</h3>
        <p>
          We use the information we collect to provide, maintain, and improve the LockStrata platform. Specifically, your information is used to authenticate accounts, validate license keys, track license usage limits, and communicate administrative messages regarding your account or licenses.
        </p>

        <h3>3. Account Information</h3>
        <p>
          Your account information is used to establish your identity and role within the platform (such as Private Customer, Bulk Buyer Company, or Product Owner Company). You may update or correct your account information through your dashboard settings.
        </p>

        <h3>4. License and Product Information</h3>
        <p>
          To enforce software licensing rules, LockStrata processes data related to product catalogs, generated license keys, and activation attempts. If you are a Product Owner, information about your software products and the licenses you issue will be stored and processed by the platform.
        </p>

        <h3>5. Information Sharing</h3>
        <p>
          We do not sell your personal information. We may share information with third-party service providers who assist us in operating our platform, conducting our business, or serving our users. Information may also be shared if required by law or to protect the rights, property, or safety of LockStrata, our users, or others.
        </p>

        <h3>6. Data Security</h3>
        <p>
          We implement standard security measures designed to protect your information from unauthorized access, disclosure, alteration, or destruction. This includes the use of cryptographic algorithms for license generation and secure communication protocols. However, no electronic transmission or storage system is entirely secure, and we cannot guarantee absolute security.
        </p>

        <h3>7. Data Retention</h3>
        <p>
          We retain your personal and licensing information for as long as your account is active or as needed to provide you with our services. We may also retain and use your information to comply with our legal obligations, resolve disputes, and enforce our agreements.
        </p>

        <h3>8. User Rights</h3>
        <p>
          Depending on your location, you may have rights to access, correct, or delete the personal information we hold about you. You can typically manage your information directly within your account settings. If you require further assistance, please contact our support team.
        </p>

        <h3>9. Changes to This Policy</h3>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy on this page and updating the "Last updated" date.
        </p>

        <h3>10. Contact</h3>
        <p>
          If you have any questions or concerns about this Privacy Policy or our data practices, please <Link to="/contact">contact our support team</Link>.
        </p>
      </div>
    </div>
  )
}

export default Privacy
