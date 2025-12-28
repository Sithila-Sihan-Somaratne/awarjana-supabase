// src/pages/Settings.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import {
  Settings as SettingsIcon, Moon, Sun, Bell, Lock, Mail, Save, Shield
} from 'lucide-react'
import Alert from '../components/common/Alert'

export default function Settings() {
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [success, setSuccess] = useState(null)
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    orderUpdates: true,
    marketingEmails: false,
    darkMode: theme === 'dark'
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    // Load preferences from localStorage
    const saved = localStorage.getItem('userPreferences')
    if (saved) {
      setPreferences({ ...JSON.parse(saved), darkMode: theme === 'dark' })
    }
  }, [user, navigate, theme])

  const handleSavePreferences = () => {
    localStorage.setItem('userPreferences', JSON.stringify(preferences))
    setSuccess('Settings saved successfully!')
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleThemeToggle = () => {
    toggleTheme()
    setPreferences({ ...preferences, darkMode: theme !== 'dark' })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your application preferences</p>
        </div>

        {/* Success Alert */}
        {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Appearance Settings */}
          <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                {theme === 'dark' ? <Moon size={24} className="mr-2" /> : <Sun size={24} className="mr-2" />}
                Appearance
              </h2>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Theme</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose between light and dark mode
                  </p>
                </div>
                <button
                  onClick={handleThemeToggle}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                    theme === 'dark' ? 'bg-primary-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      theme === 'dark' ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="mt-4 p-4 bg-gray-50 dark:bg-dark rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Current theme: <span className="font-semibold text-gray-900 dark:text-white capitalize">{theme}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Bell size={24} className="mr-2" />
                Notifications
              </h2>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">Email Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive email notifications for important updates
                  </p>
                </div>
                <button
                  onClick={() => setPreferences({ ...preferences, emailNotifications: !preferences.emailNotifications })}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                    preferences.emailNotifications ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      preferences.emailNotifications ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">Order Updates</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Get notified when your order status changes
                  </p>
                </div>
                <button
                  onClick={() => setPreferences({ ...preferences, orderUpdates: !preferences.orderUpdates })}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                    preferences.orderUpdates ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      preferences.orderUpdates ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">Marketing Emails</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive promotional offers and news
                  </p>
                </div>
                <button
                  onClick={() => setPreferences({ ...preferences, marketingEmails: !preferences.marketingEmails })}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                    preferences.marketingEmails ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      preferences.marketingEmails ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Lock size={24} className="mr-2" />
                Security
              </h2>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">Password</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Last changed: Never
                  </p>
                </div>
                <button
                  onClick={() => navigate('/reset-password')}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Change Password
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">Email Verification</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Your email is verified
                  </p>
                </div>
                <Shield size={24} className="text-green-500" />
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white dark:bg-dark-lighter shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Mail size={24} className="mr-2" />
                Account Information
              </h2>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email Address</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Account Type</p>
                <p className="text-base font-medium text-gray-900 dark:text-white capitalize">{userRole}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">User ID</p>
                <p className="text-xs font-mono text-gray-600 dark:text-gray-400">{user?.id}</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSavePreferences}
              className="inline-flex items-center px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
            >
              <Save size={20} className="mr-2" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
