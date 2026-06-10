import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api/axios'
import type { Election, Candidate } from '../../types'
import { ChevronLeft, User, Trophy } from 'lucide-react'

export default function ElectionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [election, setElection] = useState<Election | null>(null)
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const electionRes = await api.get(`/elections/${id}/`)
        setElection(electionRes.data)
        if (electionRes.data.status === 'results') {
          const resultsRes = await api.get(`/elections/${id}/results/`)
          setResults(resultsRes.data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-32 text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8">

        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6"
        >
          <ChevronLeft size={16} /> Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{election?.title}</h1>
              <p className="text-gray-500 text-sm mt-1">{election?.academic_year}</p>
            </div>
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
              election?.status === 'results' ? 'bg-blue-100 text-blue-700' :
              election?.status === 'closed' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {election?.status === 'results' ? 'Results Published' :
               election?.status === 'closed' ? 'Closed' : election?.status}
            </span>
          </div>
          <p className="text-gray-600 text-sm">{election?.description}</p>
          <div className="flex gap-6 mt-4 text-sm text-gray-400">
            <span>{election?.positions.length} positions</span>
            <span>{election?.total_voters} voters participated</span>
            <span>Closed {new Date(election?.end_time ?? '').toLocaleDateString()}</span>
          </div>
        </div>

        {/* Results */}
        {results ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Results</h2>
            {results.results.map((position: any, i: number) => {
              const winner = position.candidates.reduce((a: any, b: any) =>
                a.votes > b.votes ? a : b, position.candidates[0])
              return (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{position.position}</h3>
                  <div className="space-y-3">
                    {position.candidates
                      .sort((a: any, b: any) => b.votes - a.votes)
                      .map((candidate: any, j: number) => {
                        const percentage = position.total_votes > 0
                          ? Math.round((candidate.votes / position.total_votes) * 100)
                          : 0
                        const isWinner = candidate.name === winner?.name
                        return (
                          <div key={j} className={`rounded-xl p-4 ${isWinner ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {isWinner && <Trophy size={16} className="text-yellow-500" />}
                                <span className="font-medium text-gray-900">{candidate.name}</span>
                                {isWinner && (
                                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                                    Winner
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-gray-700">
                                {candidate.votes} votes · {percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${isWinner ? 'bg-yellow-400' : 'bg-blue-400'}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">{position.total_votes} total votes cast</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <p className="text-sm">Results will be published once the election is closed by the admin.</p>
          </div>
        )}
      </div>
    </div>
  )
}