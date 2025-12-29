// src/lib/utils.js
// Utility functions for Shadcn UI components

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 * @param {...ClassValue} inputs - Class values to merge
 * @returns {string} - Merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in LKR (Sri Lankan Rupees)
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export function formatLKR(amount) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('LKR', 'Rs.');
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} - Formatted number string
 */
export function formatNumber(num) {
  return new Intl.NumberFormat('en-LK').format(num);
}

/**
 * Format date to local string
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time to local string
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted time string
 */
export function formatTime(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-LK', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date and time to local string
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date and time string
 */
export function formatDateTime(date) {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {Date|string} date - Date to format
 * @returns {string} - Relative time string
 */
export function getRelativeTime(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now - d) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(d);
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
export function truncateText(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generate a random ID
 * @returns {string} - Random ID
 */
export function generateId() {
  return crypto.randomUUID();
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether email is valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with errors array
 */
export function validatePassword(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sleep for a specified time
 * @param {number} ms - Time to sleep in milliseconds
 * @returns {Promise} - Promise that resolves after the specified time
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Whether copy was successful
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
}

/**
 * Get initials from name
 * @param {string} name - Name to get initials from
 * @returns {string} - Initials (max 2 characters)
 */
export function getInitials(name) {
  if (!name) return '';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Status color mapping
 */
export const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  review: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  delayed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

/**
 * Get status color class
 * @param {string} status - Status to get color for
 * @returns {string} - Color class string
 */
export function getStatusColor(status) {
  return statusColors[status] || statusColors.pending;
}

/**
 * Credit status colors
 */
export const creditStatusColors = {
  healthy: 'text-green-500',
  warning: 'text-yellow-500',
  low: 'text-orange-500',
  critical: 'text-red-500',
};

/**
 * Get credit status display info
 * @param {number} credits - Number of credits remaining
 * @returns {object} - Status info object
 */
export function getCreditStatusInfo(credits) {
  if (credits <= 1) {
    return {
      status: 'critical',
      label: 'Critical',
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900',
      icon: '⚠️',
    };
  }
  if (credits <= 3) {
    return {
      status: 'low',
      label: 'Low',
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
      icon: '🔔',
    };
  }
  if (credits <= 5) {
    return {
      status: 'warning',
      label: 'Warning',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      icon: '💡',
    };
  }
  return {
    status: 'healthy',
    label: 'Healthy',
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900',
    icon: '✅',
  };
}
