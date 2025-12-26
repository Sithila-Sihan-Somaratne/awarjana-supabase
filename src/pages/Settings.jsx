import { Settings as SettingsIcon } from 'lucide-react'

function Settings() {
  return (
    <div className="min-h-screen bg-dark p-8">
      <div className="max-w-7xl mx-auto">
        <div className="card p-8 text-center">
          <SettingsIcon size={48} className="mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">This feature is under development.</p>
        </div>
      </div>
    </div>
  )
}

export default Settings
