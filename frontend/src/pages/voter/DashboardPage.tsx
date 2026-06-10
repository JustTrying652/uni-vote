import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Navbar from '../../components/Navbar'
import api from '../../api/axios'
import type { Election } from '../../types'
import { Vote, Clock, CheckCircle, AlertCircle } from 'lucide-react'

function StatusBadge({ status }: { status: Election['status'] }) {
  const config = {
    draft:   { label: 'Draft',            classes: 'bg-gray-100 text-gray-600' },
    open:    { label: 'Open',             classes: 'bg-green-100 text-green-700' },
    closed:  { label: 'Closed',           classes: 'bg-yellow-100 text-yellow-700' },
    results: { label: 'Results Out',      classes: 'bg-blue-100 text-blue-700' },
  }
  const { label, classes } = config[status]
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${classes}`}>
      {label}
    </span>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [elections, setElections] = useState<Election[]>([])
  const [votedIds, setVotedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [electionsRes, votesRes] = await Promise.all([
          api.get('/elections/'),
          api.get('/elections/my-votes/'),
        ])
        setElections(electionsRes.data)
        setVotedIds(votesRes.data.voted_position_ids)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const hasVotedInElection = (election: Election) => {
    return election.positions.some((p) => votedIds.includes(p.id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Welcome banner */}
        <div className="bg-blue-600 rounded-2xl p-6 text-white mb-8">
          <h1 className="text-2xl font-bold mb-1">Welcome, {user?.first_name} 👋</h1>
          <p className="text-blue-100 text-sm">{user?.course} · Year {user?.year_of_study}</p>
          {!user?.is_verified && (
            <div className="mt-4 bg-yellow-400 text-yellow-900 rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 w-fit">
              <AlertCircle size={16} />
              Your account is pending verification by admin
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Vote size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {elections.filter((e) => e.status === 'open').length}
                </p>
                <p className="text-xs text-gray-500">Active Elections</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{votedIds.length}</p>
                <p className="text-xs text-gray-500">Positions Voted</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {elections.filter((e) => e.status === 'results').length}
                </p>
                <p className="text-xs text-gray-500">Results Published</p>
              </div>
            </div>
          </div>
        </div>

        {/* Elections list */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Elections</h2>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading elections...</div>
        ) : elections.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No elections available yet.</div>
        ) : (
          <div className="grid gap-4">
            {elections.map((election) => (
              <div key={election.id} className="bg-white rounded-xl border border-gray-100 p-6 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{election.title}</h3>
                    <StatusBadge status={election.status} />
                    {hasVotedInElection(election) && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                        ✓ Voted
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{election.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{election.positions.length} position{election.positions.length !== 1 ? 's' : ''}</span>
                    <span>{election.total_voters} voter{election.total_voters !== 1 ? 's' : ''} participated</span>
                    <span>Closes {new Date(election.end_time).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="ml-6 flex gap-2">
  {election.status === 'open' && (
    <button
      onClick={() => navigate(`/elections/${election.id}/apply`)}
      className="px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm font-medium rounded-lg transition-colors"
    >
      Apply
    </button>
  )}
  <button
    onClick={() => navigate(
      election.status === 'open' ? `/elections/${election.id}/ballot` : `/elections/${election.id}`
    )}
    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
  >
    {election.status === 'open' ? 'Vote Now' : 'View'}
  </button>
</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}