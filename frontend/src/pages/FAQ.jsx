import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const faqs = [
  {
    question: "What is LockStrata?",
    answer: "LockStrata is a platform for discovering, activating, and managing software licenses."
  },
  {
    question: "What license types are available?",
    answer: "LockStrata supports Per User, Per Device, Subscription, Volume, and Open Source licensing models."
  },
  {
    question: "Can I browse products without an account?",
    answer: "Yes. The public Product Catalog can be browsed without registering."
  },
  {
    question: "Can companies purchase multiple licenses?",
    answer: "Yes. Organizations can use volume licensing when supported by the product."
  },
  {
    question: "What is a Product Owner Company?",
    answer: "A Product Owner Company creates software products and manages licenses issued to its customers."
  },
  {
    question: "What is a Bulk Buyer Company?",
    answer: "A Bulk Buyer Company purchases multiple licenses for organizational use and can manage those licenses for its users."
  },
  {
    question: "Can I activate my license?",
    answer: "Supported licenses can be activated through the LockStrata activation process."
  },
  {
    question: "What happens when a license expires?",
    answer: "The license status can change according to the licensing rules configured for that product."
  },
  {
    question: "Can I manage my licenses after activation?",
    answer: "Yes, users can manage their licenses through the appropriate LockStrata experience."
  }
]

function FAQ() {
  const [openIndex, setOpenIndex] = useState(0)

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? -1 : index)
  }

  return (
    <div className="w-full min-h-screen pt-8 pb-24 px-6 lg:px-8 max-w-4xl mx-auto">
      {/* PAGE HEADER */}
      <div className="mb-12 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start text-sm font-medium text-slate-500 mb-4">
          <Link to="/" className="hover:text-blue-500 transition-colors">Home</Link>
          <span className="mx-2">&rarr;</span>
          <span className="text-slate-900 dark:text-white">FAQ</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
          Frequently Asked Questions
        </h1>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div 
            key={index} 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all"
          >
            <button
              onClick={() => toggleAccordion(index)}
              className="w-full text-left px-6 py-5 flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
            >
              <span className={`font-semibold text-base transition-colors ${openIndex === index ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                {faq.question}
              </span>
              <span className={`ml-4 flex-shrink-0 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : 'rotate-0'}`}>
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </span>
            </button>
            <div 
              className={`px-6 transition-all duration-300 ease-in-out overflow-hidden ${openIndex === index ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
            >
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {faq.answer}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-slate-600 dark:text-slate-400 mb-4">Have a question that isn't answered here?</p>
        <Link to="/contact" className="inline-flex items-center justify-center rounded-lg bg-slate-900 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all">
          Contact Support
        </Link>
      </div>

    </div>
  )
}

export default FAQ
