import React from 'react'
import { Link } from 'react-router-dom'

function Terms() {
  return (
    <div className="w-full min-h-screen pt-8 pb-24 px-6 lg:px-8 max-w-4xl mx-auto">
      {/* PAGE HEADER */}
      <div className="mb-12">
        <div className="flex items-center text-sm font-medium text-slate-500 mb-4">
          <Link to="/" className="hover:text-blue-500 transition-colors">Home</Link>
          <span className="mx-2">&rarr;</span>
          <span className="text-slate-900 dark:text-white">Terms of Service</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
          Terms of Service
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Last updated: August 2026
        </p>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-a:text-blue-600 dark:prose-a:text-blue-400">
        <p>
          Please read these Terms of Service carefully before using the LockStrata platform.
        </p>

        <h3>1. Acceptance of Terms</h3>
        <p>
          By accessing or using LockStrata, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the platform.
        </p>

        <h3>2. Using LockStrata</h3>
        <p>
          LockStrata provides a platform for discovering, purchasing, activating, and managing software licenses. You agree to use the service only for lawful purposes and in accordance with these Terms.
        </p>

        <h3>3. User Accounts</h3>
        <p>
          To access certain features, you must register for an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
        </p>

        <h3>4. Software Products</h3>
        <p>
          The software products listed in the Product Catalog are subject to their respective terms and conditions as determined by the Product Owner. LockStrata facilitates the licensing process but does not claim ownership of the software products unless explicitly stated.
        </p>

        <h3>5. Software Licenses</h3>
        <p>
          Licenses purchased or managed through LockStrata are subject to specific rules configured for that product, including expiration dates, usage limits, and renewal policies.
        </p>

        <h3>6. License Activation</h3>
        <p>
          You may use LockStrata to activate supported software licenses. Activation may require submitting hardware identifiers or other validation data as defined by the licensing model. Both online and offline activation mechanisms must be used according to their intended design.
        </p>

        <h3>7. Volume Licensing</h3>
        <p>
          Bulk Buyer Companies may purchase and manage multiple licenses. The organization is responsible for ensuring that licenses are distributed and used in compliance with the product's volume licensing terms.
        </p>

        <h3>8. Product Owner Responsibilities</h3>
        <p>
          Product Owner Companies are responsible for accurately describing their software products, defining appropriate license models, and supporting their end-users regarding product-specific issues.
        </p>

        <h3>9. User Responsibilities</h3>
        <p>
          You agree not to attempt to bypass, circumvent, or exploit the license generation, activation, or validation mechanisms provided by LockStrata.
        </p>

        <h3>10. Prohibited Activities</h3>
        <p>
          You may not reverse engineer, decompile, or disassemble any part of the LockStrata platform, nor use the service to distribute unauthorized software licenses.
        </p>

        <h3>11. Account Suspension</h3>
        <p>
          LockStrata reserves the right to suspend or terminate your account and revoke active licenses if we determine that you have violated these Terms or engaged in fraudulent activity.
        </p>

        <h3>12. Changes to the Service</h3>
        <p>
          We reserve the right to modify, suspend, or discontinue any part of the LockStrata service at any time, with or without notice.
        </p>

        <h3>13. Changes to These Terms</h3>
        <p>
          We may modify these Terms at any time. We will post the revised Terms on this page. Your continued use of the platform after such changes constitutes your acceptance of the new Terms.
        </p>

        <h3>14. Contact</h3>
        <p>
          For any questions regarding these Terms, please <Link to="/contact">contact us</Link>.
        </p>
      </div>
    </div>
  )
}

export default Terms
