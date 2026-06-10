import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LogOut, Vote, LayoutDashboard, Settings, Users } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">UV</span>
          </div>
          <span className="font-bold text-gray-900">UniVote</span>
        </Link>

        <div className="flex items-center gap-6">
          {user?.role === 'admin' ? (
            <>
              <Link to="/admin" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
              <Link to="/admin/elections" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                <Vote size={16} />
                Elections
              </Link>
              <Link to="/admin/candidates" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                <Settings size={16} />
                Candidates
              </Link>
              <Link to="/admin/users" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                <Users size={16} />
                Users
              </Link>
            </>
          ) : (
            <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors">
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
            <p className="text-xs text-gray-500">{user?.registration_number}</p>
          </div>
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  )
}