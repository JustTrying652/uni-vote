import { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import api from '../../api/axios'
import type { Election } from '../../types'
import { Plus, ChevronDown } from 'lucide-react'

const statusConfig: Record<string, { label: string; classes: string }> = {
  draft:   { label: 'Draft',             classes: 'bg-gray-100 text-gray-600' },
  open:    { label: 'Open',              classes: 'bg-green-100 text-green-700' },
  closed:  { label: 'Closed',            classes: 'bg-yellow-100 text-yellow-700' },
  results: { label: 'Results Published', classes: 'bg-blue-100 text-blue-700' },
}

const nextAction: Record<string, { label: string; action: string; classes: string } | null> = {
  draft:   { label: 'Open Election',      action: 'open',    classes: 'bg-green-600 hover:bg-green-700 text-white' },
  open:    { label: 'Close Election',     action: 'close',   classes: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
  closed:  { label: 'Publish Results',   action: 'publish', classes: 'bg-blue-600 hover:bg-blue-700 text-white' },
  results: null,
}

export default function ManageElections() {
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showPositionForm, setShowPositionForm] = useState<number | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const [form, setForm] = useState({
    title: '', description: '', academic_year: '', start_time: '', end_time: ''
  })
  const [positionForm, setPositionForm] = useState({
    title: '', description: '', order: '1'
  })
  const [formError, setFormError] = useState('')

  const fetchElections = async () => {
    const res = await api.get('/elections/')
    setElections(res.data)
    setLoading(false)
  }

  useEffect(() => { fetchElections() }, [])

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    try {
      await api.post('/elections/create/', form)
      setShowForm(false)
      setForm({ title: '', description: '', academic_year: '', start_time: '', end_time: '' })
      fetchElections()
    } catch (err: any) {
      const data = err.response?.data
      setFormError(Object.values(data).flat().join(' ') || 'Failed to create election')
    }
  }

  const handleAddPosition = async (e: React.FormEvent, electionId: number) => {
    e.preventDefault()
    try {
      await api.post(`/elections/${electionId}/positions/`, {
        ...positionForm,
        order: parseInt(positionForm.order),
        max_votes: 1,
      })
      setShowPositionForm(null)
      setPositionForm({ title: '', description: '', order: '1' })
      fetchElections()
    } catch (err) {
      console.error(err)
    }
  }

  const handleStatusChange = async (electionId: number, action: string) => {
    setActionLoading(electionId)
    try {
      await api.post(`/elections/${electionId}/status/`, { action })
      fetchElections()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Elections</h1>
            <p className="text-gray-500 text-sm mt-1">Create and control election lifecycle</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> New Election
          </button>
        </div>

        {/* Create election form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">New Election</h2>
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
                {formError}
              </div>
            )}
            <form onSubmit={handleCreateElection} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    placeholder="e.g. 2025/2026"
                    value={form.academic_year}
                    onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Create Election
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Elections */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : elections.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No elections yet.</div>
        ) : (
          <div className="space-y-4">
            {elections.map((election) => (
              <div key={election.id} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{election.title}</h3>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig[election.status].classes}`}>
                        {statusConfig[election.status].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{election.description}</p>
                    <div className="flex gap-4 text-xs text-gray-400 mt-2">
                      <span>{election.positions.length} positions</span>
                      <span>{election.total_voters} voters</span>
                      <span>{new Date(election.start_time).toLocaleString()} → {new Date(election.end_time).toLocaleString()}</span>
                    </div>
                  </div>
                  {nextAction[election.status] && (
                    <button
                      onClick={() => handleStatusChange(election.id, nextAction[election.status]!.action)}
                      disabled={actionLoading === election.id}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${nextAction[election.status]!.classes}`}
                    >
                      {actionLoading === election.id ? 'Processing...' : nextAction[election.status]!.label}
                    </button>
                  )}
                </div>

                {/* Positions */}
                {election.positions.length > 0 && (
                  <div className="border-t border-gray-100 pt-4 mb-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Positions</p>
                    <div className="flex flex-wrap gap-2">
                      {election.positions.map((p) => (
                        <span key={p.id} className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                          {p.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add position */}
                {election.status === 'draft' && (
                  <div>
                    {showPositionForm === election.id ? (
                      <form onSubmit={(e) => handleAddPosition(e, election.id)} className="space-y-3 border-t border-gray-100 pt-4">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Add Position</p>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Position title"
                            value={positionForm.title}
                            onChange={(e) => setPositionForm({ ...positionForm, title: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Description"
                            value={positionForm.description}
                            onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                            Add
                          </button>
                          <button type="button" onClick={() => setShowPositionForm(null)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setShowPositionForm(election.id)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 border-t border-gray-100 pt-4 w-full"
                      >
                        <Plus size={14} /> Add Position
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}