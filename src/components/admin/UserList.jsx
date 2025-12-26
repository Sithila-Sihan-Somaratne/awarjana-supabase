import { User, Mail, Shield, CheckCircle, XCircle, Edit2, Trash2 } from 'lucide-react'

function UserList({ users = [], onEdit, onDelete, showActions = true }) {
  const getRoleBadge = (role) => {
    const badges = {
      admin: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
      worker: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      customer: 'bg-green-500/20 text-green-500 border-green-500/30'
    }
    return badges[role] || 'bg-gray-500/20 text-gray-500 border-gray-500/30'
  }

  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <User size={20} className="text-primary" />
          Users
        </h3>
        <span className="text-sm text-gray-400">
          Total: {users.length}
        </span>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <User size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No users found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">User</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Email</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Role</th>
                <th className="text-center py-3 px-4 text-sm text-gray-400 font-medium">Verified</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Joined</th>
                {showActions && (
                  <th className="text-center py-3 px-4 text-sm text-gray-400 font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <User size={16} className="text-primary" />
                      </div>
                      <span className="text-white font-medium">
                        {user.name || user.email?.split('@')[0] || 'User'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail size={14} className="text-gray-500" />
                      {user.email}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getRoleBadge(user.role)}`}>
                      <Shield size={12} />
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {user.email_verified ? (
                      <CheckCircle size={18} className="text-green-500 inline" />
                    ) : (
                      <XCircle size={18} className="text-red-500 inline" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  {showActions && (
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(user)}
                            className="text-blue-500 hover:text-blue-400 transition-colors"
                            title="Edit user"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(user.id)}
                            className="text-red-500 hover:text-red-400 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export { UserList }
export default UserList
