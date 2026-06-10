import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api/axios'
import type { Election, Candidate } from '../../types'
import { CheckCircle, ChevronLeft, ChevronRight, User } from 'lucide-react'

type SelectionMap = Record<number, number> // position_id -> candidate_id

export default function BallotPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [election, setElection] = useState<Election | null>(null)
  const [candidatesByPosition, setCandidatesByPosition] = useState<Record<number, Candidate[]>>({})
  const [selections, setSelections] = useState<SelectionMap>({})
  const [votedPositions, setVotedPositions] = useState<number[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [electionRes, votesRes] = await Promise.all([
          api.get(`/elections/${id}/`),
          api.get('/elections/my-votes/'),
        ])
        const electionData: Election = electionRes.data
        setElection(electionData)
        setVotedPositions(votesRes.data.voted_position_ids)

        // Fetch candidates for each position
        const candidatesMap: Record<number, Candidate[]> = {}
        await Promise.all(
          electionData.positions.map(async (position) => {
            const res = await api.get(`/elections/positions/${position.id}/candidates/`)
            candidatesMap[position.id] = res.data
          })
        )
        setCandidatesByPosition(candidatesMap)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const positions = election?.positions ?? []
  const currentPosition = positions[currentStep]
  const candidates = currentPosition ? (candidatesByPosition[currentPosition.id] ?? []) : []
  const alreadyVoted = currentPosition ? votedPositions.includes(currentPosition.id) : false
  const totalSteps = positions.length

  const handleSelect = (candidateId: number) => {
    if (alreadyVoted) return
    setSelections((prev) => ({ ...prev, [currentPosition.id]: candidateId }))
  }

  const handleSubmitVote = async () => {
    if (!currentPosition || !selections[currentPosition.id]) return
    setSubmitting(true)
    setError('')
    try {
      await api.post('/elections/vote/', {
        position: currentPosition.id,
        candidate: selections[currentPosition.id],
      })
      setVotedPositions((prev) => [...prev, currentPosition.id])

      if (currentStep < totalSteps - 1) {
        setCurrentStep((s) => s + 1)
      } else {
        setSubmitted(true)
      }
    } catch (err: any) {
      setError(err.response?.data?.non_field_errors?.[0] || 'Failed to cast vote. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-32 text-gray-400">Loading ballot...</div>
      </div>
    )
  }

  if (submitted || (positions.length > 0 && positions.every((p) => votedPositions.includes(p.id)))) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Votes Submitted!</h2>
          <p className="text-gray-500 mb-8">
            Your votes have been recorded securely. Results will be published after the election closes.
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

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
          >
            <ChevronLeft size={16} /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{election?.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{election?.academic_year}</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>Position {currentStep + 1} of {totalSteps}</span>
            <span>{Math.round(((currentStep) / totalSteps) * 100)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="flex gap-2 mt-3">
            {positions.map((p, i) => (
              <div
                key={p.id}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  votedPositions.includes(p.id)
                    ? 'bg-green-500'
                    : i === currentStep
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Ballot card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">{currentPosition?.title}</h2>
            {currentPosition?.description && (
              <p className="text-gray-500 text-sm mt-1">{currentPosition.description}</p>
            )}
            {alreadyVoted && (
              <div className="mt-3 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                <CheckCircle size={16} />
                You have already voted for this position
              </div>
            )}
          </div>

          {/* Candidates */}
          <div className="space-y-3 mb-6">
            {candidates.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No approved candidates for this position.</p>
            ) : (
              candidates.map((candidate) => {
                const isSelected = selections[currentPosition.id] === candidate.id
                return (
                  <button
                    key={candidate.id}
                    onClick={() => handleSelect(candidate.id)}
                    disabled={alreadyVoted}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                      alreadyVoted
                        ? 'border-gray-100 cursor-default'
                        : isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {candidate.photo ? (
                        <img
                          src={candidate.photo}
                          alt={candidate.user.full_name}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                          <User size={24} className="text-blue-500" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{candidate.user.full_name}</p>
                        <p className="text-xs text-gray-500">{candidate.user.registration_number} · {candidate.user.faculty.toUpperCase()}</p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{candidate.manifesto}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} /> Previous
            </button>

            {alreadyVoted ? (
              <button
                onClick={() => currentStep < totalSteps - 1 ? setCurrentStep((s) => s + 1) : setSubmitted(true)}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {currentStep < totalSteps - 1 ? <>Next <ChevronRight size={16} /></> : 'Finish'}
              </button>
            ) : (
              <button
                onClick={handleSubmitVote}
                disabled={!selections[currentPosition?.id] || submitting}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {submitting ? 'Submitting...' : currentStep < totalSteps - 1 ? 'Vote & Continue' : 'Submit Final Vote'}
                {!submitting && <ChevronRight size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}