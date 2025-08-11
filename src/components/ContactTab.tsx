import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAnalytics } from '../services/analytics';

interface ContactFormData {
  type: 'comment' | 'recommendation' | 'advertising' | 'partnership' | 'bug_report';
  subject: string;
  message: string;
  contactEmail: string; // Optional for follow-up
}

interface ContactTabProps {
  onSubmissionComplete?: (success: boolean, message: string) => void;
}

export default function ContactTab({ onSubmissionComplete }: ContactTabProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    type: 'comment',
    subject: '',
    message: '',
    contactEmail: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const analytics = useAnalytics();

  const inquiryTypes = [
    { value: 'comment', label: '💬 General Comment', description: 'Share your thoughts about the app' },
    { value: 'recommendation', label: '💡 Feature Recommendation', description: 'Suggest new features or improvements' },
    { value: 'advertising', label: '📢 Advertising Inquiry', description: 'Interested in advertising opportunities' },
    { value: 'partnership', label: '🤝 Partnership Inquiry', description: 'Explore partnership opportunities' },
    { value: 'bug_report', label: '🐛 Bug Report', description: 'Report issues or problems' }
  ];

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSubmitMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      setSubmitMessage({ 
        type: 'error', 
        text: 'Please fill in both subject and message fields.' 
      });
      return;
    }

    if (!formData.contactEmail.trim()) {
      setSubmitMessage({ 
        type: 'error', 
        text: 'Please provide your email address so we can respond to your inquiry.' 
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contactEmail.trim())) {
      setSubmitMessage({ 
        type: 'error', 
        text: 'Please enter a valid email address.' 
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // Submit to Firebase
      const { submitContactInquiry } = await import('../firebase/contact');
      
      const inquiryData = {
        type: formData.type,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        contactEmail: formData.contactEmail.trim() || '',
        timestamp: new Date(),
        status: 'new' as const,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      const result = await submitContactInquiry(inquiryData);
      
      // Track analytics
      analytics.trackConversion('contact_submit', {
        inquiryType: formData.type,
        hasEmail: !!formData.contactEmail.trim(),
        messageLength: formData.message.length
      });

      if (result.success) {
        setSubmitMessage({ 
          type: 'success', 
          text: '✅ Your inquiry has been submitted! We\'ll respond to your email within 24-48 hours.' 
        });
        
        // Reset form
        setFormData({
          type: 'comment',
          subject: '',
          message: '',
          contactEmail: ''
        });
        
        onSubmissionComplete?.(true, result.message);
      } else {
        setSubmitMessage({ 
          type: 'error', 
          text: `❌ ${result.message}` 
        });
        onSubmissionComplete?.(false, result.message);
      }

    } catch (error) {
      console.error('Contact submission error:', error);
      setSubmitMessage({ 
        type: 'error', 
        text: '❌ Failed to submit inquiry. Please try again later.' 
      });
      onSubmissionComplete?.(false, 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = inquiryTypes.find(type => type.value === formData.type);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.487L3 21l2.487-5.094A8.959 8.959 0 014 12C4 7.582 7.582 4 12 4s8 3.582 8 8z" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-secondary-700 dark:text-gray-200 mb-2">
          Contact Developer
        </h1>
        <p className="text-secondary-600 dark:text-gray-400">
          Get in touch with comments, suggestions, bug reports, or business inquiries
        </p>
      </motion.div>

      {/* Contact Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Inquiry Type */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-gray-200 mb-3">
              Type of Inquiry *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {inquiryTypes.map((type) => (
                <label
                  key={type.value}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.type === type.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="inquiryType"
                    value={type.value}
                    checked={formData.type === type.value}
                    onChange={(e) => handleInputChange('type', e.target.value as ContactFormData['type'])}
                    className="sr-only"
                  />
                  <div className="flex items-start">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-secondary-800 dark:text-gray-200 mb-1">
                        {type.label}
                      </div>
                      <div className="text-xs text-secondary-600 dark:text-gray-400">
                        {type.description}
                      </div>
                    </div>
                    {formData.type === type.value && (
                      <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-secondary-700 dark:text-gray-200 mb-2">
              Subject *
            </label>
            <input
              id="subject"
              type="text"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder={
                formData.type === 'bug_report' ? 'Brief description of the bug' :
                formData.type === 'advertising' ? 'Advertising partnership inquiry' :
                formData.type === 'partnership' ? 'Partnership opportunity' :
                'Brief subject line'
              }
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-secondary-700 dark:text-gray-200 mb-2">
              Message *
            </label>
            <textarea
              id="message"
              rows={6}
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-y"
              placeholder={
                formData.type === 'bug_report' 
                  ? 'Please describe the bug in detail:\n• What were you doing when it happened?\n• What did you expect to happen?\n• What actually happened?\n• Any error messages?\n• Browser and device info (if relevant)'
                  : formData.type === 'advertising'
                  ? 'Tell us about your advertising goals:\n• Target audience\n• Budget range\n• Campaign objectives\n• Timeline'
                  : formData.type === 'partnership'
                  ? 'Describe your partnership idea:\n• Your company/organization\n• Type of partnership\n• Mutual benefits\n• Next steps'
                  : 'Share your thoughts, ideas, or feedback...'
              }
            />
            <div className="mt-1 text-xs text-secondary-500 dark:text-gray-400">
              {formData.message.length}/2000 characters
            </div>
          </div>

          {/* Contact Email (Required) */}
          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-secondary-700 dark:text-gray-200 mb-2">
              Your Email *
            </label>
            <input
              id="contactEmail"
              type="email"
              required
              value={formData.contactEmail}
              onChange={(e) => handleInputChange('contactEmail', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="your.email@example.com"
            />
            <p className="text-xs text-secondary-500 dark:text-gray-400 mt-1">
              Required so we can respond to your inquiry
            </p>
          </div>

          {/* Submit Message */}
          {submitMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border ${
                submitMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300' :
                submitMessage.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300' :
                'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
              }`}
            >
              {submitMessage.text}
            </motion.div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-xs text-secondary-500 dark:text-gray-400">
              {selectedType?.label} • Response time: 24-48 hours
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !formData.subject.trim() || !formData.message.trim() || !formData.contactEmail.trim()}
              className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                isSubmitting || !formData.subject.trim() || !formData.message.trim() || !formData.contactEmail.trim()
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Submitting...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Message
                </div>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Additional Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Quick Response</h3>
          <p className="text-sm text-blue-600 dark:text-blue-400">Most inquiries get a response within 24-48 hours</p>
        </div>

        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">All Feedback Welcome</h3>
          <p className="text-sm text-green-600 dark:text-green-400">Your input helps make the app better for everyone</p>
        </div>

        <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
            </svg>
          </div>
          <h3 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">Business Inquiries</h3>
          <p className="text-sm text-purple-600 dark:text-purple-400">Open to partnerships and advertising opportunities</p>
        </div>
      </motion.div>
    </div>
  );
}
