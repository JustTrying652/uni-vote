import { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import api from '../../api/axios'
import type { User } from '../../types'
import { CheckCircle, XCircle, User as UserIcon, Search, Filter } from 'lucide-react'

export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [filtered, setFiltered] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all')

  const fetchUsers = async () => {
    const res = await api.get('/auth/users/')
    setUsers(res.data)
    setFiltered(res.data)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  useEffect(() => {
    let result = users
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.registration_number.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    }
    if (filterVerified === 'verified') result = result.filter((u) => u.is_verified)
    if (filterVerified === 'unverified') result = result.filter((u) => !u.is_verified)
    setFiltered(result)
  }, [search, filterVerified, users])

  const handleVerify = async (userId: number, verify: boolean) => {
    setActionLoading(userId)
    try {
      await api.patch(`/auth/users/${userId}/verify/`, { is_verified: verify })
      fetchUsers()
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  const stats = {
    total: users.filter((u) => u.role !== 'admin').length,
    verified: users.filter((u) => u.is_verified && u.role !== 'admin').length,
    pending: users.filter((u) => !u.is_verified && u.role !== 'admin').length,
  }

  const facultyLabel: Record<string, string> = {
    engineering: 'Engineering', business: 'Business', science: 'Science',
    arts: 'Arts', health: 'Health', ict: 'ICT',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-gray-500 text-sm mt-1">Verify students to allow them to vote</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Students', value: stats.total, classes: 'bg-blue-50 border-blue-200 text-blue-700' },
            { label: 'Verified', value: stats.verified, classes: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'Pending Verification', value: stats.pending, classes: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl border p-4 ${stat.classes}`}>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search and filter */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, reg number, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
            <select
              value={filterVerified}
              onChange={(e) => setFilterVerified(e.target.value as any)}
              className="border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
            >
              <option value="all">All Students</option>
              <option value="unverified">Pending Only</option>
              <option value="verified">Verified Only</option>
            </select>
          </div>
        </div>

        {/* Users table */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No users found.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">Student</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">Faculty</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">Year</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">Joined</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered
                  .filter((u) => u.role !== 'admin')
                  .map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 text-xs font-semibold">
                              {user.first_name[0]}{user.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-xs text-gray-500">{user.registration_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {facultyLabel[user.faculty] ?? user.faculty}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        Year {user.year_of_study}
                      </td>
                      <td className="px-6 py-4">
                        {user.is_verified ? (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                            Verified
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(user.date_joined).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {user.is_verified ? (
                          <button
                            onClick={() => handleVerify(user.id, false)}
                            disabled={actionLoading === user.id}
                            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 disabled:opacity-50 transition-colors font-medium"
                          >
                            <XCircle size={14} />
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleVerify(user.id, true)}
                            disabled={actionLoading === user.id}
                            className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            <CheckCircle size={14} />
                            {actionLoading === user.id ? 'Verifying...' : 'Verify'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}