import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api/axios'
import type { Election } from '../../types'
import { ChevronLeft, CheckCircle } from 'lucide-react'

export default function ApplyPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [election, setElection] = useState<Election | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [manifesto, setManifesto] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [myApplications, setMyApplications] = useState<number[]>([]) // position ids already applied

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/elections/${id}/`)
        setElection(res.data)
        // fetch my existing applications
        const appsRes = await api.get('/elections/my-applications/')
        setMyApplications(appsRes.data.position_ids)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPosition) return
    setError('')
    setSubmitting(true)
    try {
      await api.post('/elections/candidates/apply/', {
        position: selectedPosition,
        manifesto,
      })
      setSuccess(true)
    } catch (err: any) {
      const data = err.response?.data
      setError(
        data?.non_field_errors?.[0] ||
        data?.position?.[0] ||
        data?.manifesto?.[0] ||
        'Failed to submit application.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted</h2>
          <p className="text-gray-500 mb-8">
            Your candidacy application is pending admin approval. You'll be able to vote once approved.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-8">

        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6"
        >
          <ChevronLeft size={16} /> Back to Dashboard
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Apply as Candidate</h1>
          <p className="text-gray-500 text-sm mt-1">{election?.title} · {election?.academic_year}</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Position selector */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Select a Position</h2>
              <div className="space-y-3">
                {election?.positions.map((position) => {
                  const alreadyApplied = myApplications.includes(position.id)
                  return (
                    <button
                      key={position.id}
                      type="button"
                      disabled={alreadyApplied}
                      onClick={() => setSelectedPosition(position.id)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                        alreadyApplied
                          ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                          : selectedPosition === position.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{position.title}</p>
                          {position.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{position.description}</p>
                          )}
                        </div>
                        {alreadyApplied ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                            Applied
                          </span>
                        ) : (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedPosition === position.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}>
                            {selectedPosition === position.id && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Manifesto */}
            {selectedPosition && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Your Manifesto</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Tell students what you stand for and what you'll deliver if elected.
                </p>
                <textarea
                  value={manifesto}
                  onChange={(e) => setManifesto(e.target.value)}
                  rows={6}
                  placeholder="Write your manifesto here..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                  minLength={50}
                />
                <p className="text-xs text-gray-400 mt-1">{manifesto.length} characters · minimum 50</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {selectedPosition && (
              <button
                type="submit"
                disabled={submitting || manifesto.length < 50}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-lg py-3 text-sm transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}