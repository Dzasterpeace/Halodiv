'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const divisionInfo = {
  1: { name: 'Division One', color: '#FFD700' },
  2: { name: 'Division Two', color: '#C0C0C0' },
  3: { name: 'Division Three', color: '#CD7F32' },
  4: { name: 'Division Four', color: '#4A90A4' },
}

export default function Home() {
  const [view, setView] = useState('standings')
  const [selectedDivision, setSelectedDivision] = useState(1)
  const [teams, setTeams] = useState([])
  const [standings, setStandings] = useState([])
  const [matches, setMatches] = useState([])
  const [pendingSubmissions, setPendingSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)

  // Fetch data on mount
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    const [teamsRes, standingsRes, matchesRes, submissionsRes] = await Promise.all([
      supabase.from('teams').select('*').order('division').order('name'),
      supabase.from('standings').select('*'),
      supabase.from('matches').select('*').order('created_at', { ascending: false }),
      supabase.from('match_submissions').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    ])

    if (teamsRes.data) setTeams(teamsRes.data)
    if (standingsRes.data) setStandings(standingsRes.data)
    if (matchesRes.data) setMatches(matchesRes.data)
    if (submissionsRes.data) setPendingSubmissions(submissionsRes.data)
    
    setLoading(false)
  }

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId)
    return team?.name || 'Unknown'
  }

  const getDivisionStandings = (divisionId) => {
    return standings
      .filter(s => s.division === divisionId)
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins
        return b.map_diff - a.map_diff
      })
  }

  const getDivisionMatches = (divisionId) => {
    return matches.filter(m => m.division === divisionId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">
      {/* Header */}
      <header className="relative overflow-hidden border-b border-cyan-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='%2306b6d4' stroke-width='0.5' opacity='0.3'/%3E%3C/svg%3E")`
        }} />
        
        <div className="relative max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-2xl font-black">
              HDC
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                HALO DIVISIONAL CHAMPIONSHIP
              </h1>
              <p className="text-cyan-500/60 text-sm tracking-widest uppercase">Season 1 • 5 Week Cycle</p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-cyan-500/20 bg-black/40 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'standings', label: 'Standings' },
              { id: 'fixtures', label: 'Fixtures' },
              { id: 'leaderboards', label: 'Leaderboards' },
              { id: 'submit', label: 'Submit Result' },
              { id: 'admin', label: 'Admin' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`px-6 py-4 text-sm font-semibold tracking-wide transition-all relative whitespace-nowrap
                  ${view === tab.id 
                    ? 'text-cyan-400' 
                    : 'text-gray-500 hover:text-gray-300'}`}
              >
                {tab.label}
                {view === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500" />
                )}
                {tab.id === 'admin' && pendingSubmissions.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {pendingSubmissions.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {view === 'standings' && !selectedTeam && (
          <StandingsView 
            selectedDivision={selectedDivision}
            setSelectedDivision={setSelectedDivision}
            standings={getDivisionStandings(selectedDivision)}
            matches={getDivisionMatches(selectedDivision)}
            getTeamName={getTeamName}
            onTeamClick={setSelectedTeam}
          />
        )}

        {view === 'standings' && selectedTeam && (
          <TeamView 
            team={selectedTeam}
            matches={matches}
            getTeamName={getTeamName}
            onBack={() => setSelectedTeam(null)}
          />
        )}

        {view === 'submit' && (
          <SubmitResultForm 
            teams={teams}
            onSubmitSuccess={fetchData}
          />
        )}

        {view === 'fixtures' && (
          <FixturesView 
            selectedDivision={selectedDivision}
            setSelectedDivision={setSelectedDivision}
            teams={teams}
            getTeamName={getTeamName}
          />
        )}

        {view === 'leaderboards' && (
          <LeaderboardsView 
            selectedDivision={selectedDivision}
            setSelectedDivision={setSelectedDivision}
          />
        )}

        {view === 'admin' && (
          <AdminPanel 
            isAdmin={isAdmin}
            setIsAdmin={setIsAdmin}
            pendingSubmissions={pendingSubmissions}
            teams={teams}
            getTeamName={getTeamName}
            onDataChange={fetchData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-600 text-sm">
          Halo Divisional Championship • Season 1
        </div>
      </footer>
    </div>
  )
}

// Standings View Component
function StandingsView({ selectedDivision, setSelectedDivision, standings, matches, getTeamName, onTeamClick }) {
  return (
    <div className="space-y-8">
      {/* Division Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4].map(div => (
          <button
            key={div}
            onClick={() => setSelectedDivision(div)}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all
              ${selectedDivision === div 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
          >
            {divisionInfo[div].name}
          </button>
        ))}
      </div>

      {/* Standings Table */}
      <div className="bg-gradient-to-b from-white/5 to-transparent rounded-xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: divisionInfo[selectedDivision].color }}
            />
            {divisionInfo[selectedDivision].name}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Bo5 series • Map differential tiebreaker
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-white/10">
                <th className="text-left py-4 px-6 w-12">#</th>
                <th className="text-left py-4 px-6">Team</th>
                <th className="text-center py-4 px-4">W</th>
                <th className="text-center py-4 px-4">L</th>
                <th className="text-center py-4 px-4">MW</th>
                <th className="text-center py-4 px-4">ML</th>
                <th className="text-center py-4 px-4">+/-</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, idx) => (
                <tr 
                  key={team.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => onTeamClick(team)}
                >
                  <td className="py-4 px-6">
                    <span className={`font-bold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-semibold">{team.name}</div>
                    <div className="text-xs text-gray-500">
                      {Array.isArray(team.players) ? team.players.join(', ') : ''}
                    </div>
                  </td>
                  <td className="text-center py-4 px-4 font-bold text-green-400">{team.wins}</td>
                  <td className="text-center py-4 px-4 font-bold text-red-400">{team.losses}</td>
                  <td className="text-center py-4 px-4 text-gray-400">{team.maps_won}</td>
                  <td className="text-center py-4 px-4 text-gray-400">{team.maps_lost}</td>
                  <td className="text-center py-4 px-4">
                    <span className={`font-bold ${team.map_diff > 0 ? 'text-green-400' : team.map_diff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {team.map_diff > 0 ? '+' : ''}{team.map_diff}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Results */}
      <div className="bg-gradient-to-b from-white/5 to-transparent rounded-xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold">Recent Results</h2>
        </div>
        <div className="p-6">
          {matches.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No confirmed matches yet</p>
          ) : (
            <div className="space-y-3">
              {matches.slice(0, 10).map(match => (
                <div key={match.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex-1 text-right font-semibold">{getTeamName(match.team1_id)}</div>
                  <div className="px-6 py-2 mx-4 bg-black/40 rounded-lg font-mono font-bold">
                    <span className={match.team1_maps > match.team2_maps ? 'text-green-400' : 'text-gray-400'}>{match.team1_maps}</span>
                    <span className="text-gray-600 mx-2">-</span>
                    <span className={match.team2_maps > match.team1_maps ? 'text-green-400' : 'text-gray-400'}>{match.team2_maps}</span>
                  </div>
                  <div className="flex-1 font-semibold">{getTeamName(match.team2_id)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Team View Component
function TeamView({ team, matches, getTeamName, onBack }) {
  const teamMatches = matches.filter(m => 
    m.team1_id === team.id || m.team2_id === team.id
  )

  return (
    <div className="space-y-6">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        ← Back to standings
      </button>
      
      <div className="bg-gradient-to-b from-white/5 to-transparent rounded-xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold">{team.name}</h2>
          <div className="flex gap-4 mt-2 text-gray-400">
            {Array.isArray(team.players) && team.players.map((player, idx) => (
              <span key={idx} className="text-sm">{player}</span>
            ))}
          </div>
        </div>
        
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Match History</h3>
          {teamMatches.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No matches played yet</p>
          ) : (
            <div className="space-y-3">
              {teamMatches.map(match => {
                const isTeam1 = match.team1_id === team.id
                const teamMaps = isTeam1 ? match.team1_maps : match.team2_maps
                const oppMaps = isTeam1 ? match.team2_maps : match.team1_maps
                const oppName = getTeamName(isTeam1 ? match.team2_id : match.team1_id)
                const won = teamMaps > oppMaps
                
                return (
                  <div key={match.id} className={`flex items-center justify-between p-4 rounded-lg ${won ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <div>
                      <span className={`font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                        {won ? 'W' : 'L'}
                      </span>
                      <span className="text-gray-400 ml-2">vs {oppName}</span>
                    </div>
                    <div className="font-mono font-bold">
                      {teamMaps} - {oppMaps}
                    </div>
                    <div className="text-sm text-gray-500">Week {match.week}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Submit Result Form Component
function SubmitResultForm({ teams, onSubmitSuccess }) {
  const [division, setDivision] = useState(1)
  const [yourTeamId, setYourTeamId] = useState('')
  const [opponentId, setOpponentId] = useState('')
  const [yourMaps, setYourMaps] = useState(3)
  const [opponentMaps, setOpponentMaps] = useState(0)
  const [week, setWeek] = useState(1)
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const divTeams = teams.filter(t => t.division === division)
  const yourTeam = teams.find(t => t.id === yourTeamId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setResult(null)
    
    if (!yourTeamId || !opponentId) {
      setResult({ status: 'error', message: 'Please select both teams' })
      return
    }
    
    if (yourTeamId === opponentId) {
      setResult({ status: 'error', message: 'Please select two different teams' })
      return
    }

    if (yourMaps + opponentMaps > 5 || (yourMaps < 3 && opponentMaps < 3)) {
      setResult({ status: 'error', message: 'Invalid Bo5 score (winner needs 3 maps)' })
      return
    }

    setSubmitting(true)

    // Create match key from sorted team IDs + week
    const sortedIds = [yourTeamId, opponentId].sort()
    const matchKey = `${sortedIds[0]}_${sortedIds[1]}_w${week}`
    
    // Determine team1/team2 based on sorted order
    const isYourTeamFirst = yourTeamId === sortedIds[0]
    const team1Id = sortedIds[0]
    const team2Id = sortedIds[1]
    const team1Maps = isYourTeamFirst ? yourMaps : opponentMaps
    const team2Maps = isYourTeamFirst ? opponentMaps : yourMaps

    // Check for existing submission with same match key
    const { data: existing } = await supabase
      .from('match_submissions')
      .select('*')
      .eq('match_key', matchKey)
      .eq('status', 'pending')

    if (existing && existing.length > 0) {
      const other = existing[0]

      if (team1Maps === other.team1_maps && team2Maps === other.team2_maps) {
        // Results match - create confirmed match
        const { error: matchError } = await supabase.from('matches').insert({
          division,
          week,
          team1_id: team1Id,
          team2_id: team2Id,
          team1_maps: team1Maps,
          team2_maps: team2Maps,
        })

        if (matchError) {
          setResult({ status: 'error', message: 'Error creating match: ' + matchError.message })
        } else {
          // Update submission status
          await supabase
            .from('match_submissions')
            .update({ status: 'resolved' })
            .eq('match_key', matchKey)

          setResult({ status: 'confirmed', message: 'Results matched! Match confirmed.' })
          onSubmitSuccess()
        }
      } else {
        // Results don't match - flag as disputed
        await supabase.from('match_submissions').insert({
          match_key: matchKey,
          division,
          week,
          team1_id: team1Id,
          team2_id: team2Id,
          team1_maps: team1Maps,
          team2_maps: team2Maps,
          submitted_by: yourTeam?.name || 'Unknown',
          status: 'disputed',
        })

        await supabase
          .from('match_submissions')
          .update({ status: 'disputed' })
          .eq('id', other.id)

        setResult({ status: 'flagged', message: "Results don't match! Flagged for admin review." })
        onSubmitSuccess()
      }
    } else {
      // First submission
      const { error } = await supabase.from('match_submissions').insert({
        match_key: matchKey,
        division,
        week,
        team1_id: team1Id,
        team2_id: team2Id,
        team1_maps: team1Maps,
        team2_maps: team2Maps,
        submitted_by: yourTeam?.name || 'Unknown',
        status: 'pending',
      })

      if (error) {
        setResult({ status: 'error', message: 'Error submitting: ' + error.message })
      } else {
        setResult({ status: 'pending', message: 'Result submitted. Awaiting opponent confirmation.' })
        onSubmitSuccess()
      }
    }

    setSubmitting(false)
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-gradient-to-b from-white/5 to-transparent rounded-xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold">Submit Match Result</h2>
          <p className="text-gray-500 text-sm mt-1">
            Both teams submit independently. Results auto-confirm if they match.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Division */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Division</label>
            <select 
              value={division} 
              onChange={(e) => { setDivision(Number(e.target.value)); setYourTeamId(''); setOpponentId(''); }}
              className="w-full px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors text-white"
            >
              <option value={1}>Division One</option>
              <option value={2}>Division Two</option>
              <option value={3}>Division Three</option>
              <option value={4}>Division Four</option>
            </select>
          </div>

          {/* Week */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Week</label>
            <select 
              value={week} 
              onChange={(e) => setWeek(Number(e.target.value))}
              className="w-full px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors text-white"
            >
              {[1, 2, 3, 4, 5].map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>

          {/* Your Team */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Your Team</label>
            <select 
              value={yourTeamId} 
              onChange={(e) => setYourTeamId(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors text-white"
            >
              <option value="">Select your team</option>
              {divTeams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Opponent */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Opponent</label>
            <select 
              value={opponentId} 
              onChange={(e) => setOpponentId(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors text-white"
            >
              <option value="">Select opponent</option>
              {divTeams.filter(t => t.id !== yourTeamId).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Score */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Map Score (Bo5)</label>
            <div className="flex items-center gap-4 justify-center">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">{yourTeam?.name || 'Your team'}</div>
                <select 
                  value={yourMaps} 
                  onChange={(e) => setYourMaps(Number(e.target.value))}
                  className="w-20 px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-lg text-center text-xl font-bold focus:outline-none focus:border-cyan-500 text-white"
                >
                  {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <span className="text-2xl text-gray-600 mt-5">-</span>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">{teams.find(t => t.id === opponentId)?.name || 'Opponent'}</div>
                <select 
                  value={opponentMaps} 
                  onChange={(e) => setOpponentMaps(Number(e.target.value))}
                  className="w-20 px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-lg text-center text-xl font-bold focus:outline-none focus:border-cyan-500 text-white"
                >
                  {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Result'}
          </button>

          {result && (
            <div className={`p-4 rounded-lg text-center font-semibold
              ${result.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : ''}
              ${result.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : ''}
              ${result.status === 'flagged' ? 'bg-orange-500/20 text-orange-400' : ''}
              ${result.status === 'error' ? 'bg-red-500/20 text-red-400' : ''}
            `}>
              {result.message}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

// Admin Panel Component
function AdminPanel({ isAdmin, setIsAdmin, pendingSubmissions, teams, getTeamName, onDataChange }) {
  const [adminKey, setAdminKey] = useState('')
  const [disputedSubmissions, setDisputedSubmissions] = useState([])

  useEffect(() => {
    fetchDisputed()
  }, [])

  const fetchDisputed = async () => {
    const { data } = await supabase
      .from('match_submissions')
      .select('*')
      .eq('status', 'disputed')
      .order('created_at', { ascending: false })
    
    if (data) setDisputedSubmissions(data)
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (adminKey === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || adminKey === 'hdc2025') {
      setIsAdmin(true)
    }
  }

  const approveSubmission = async (submission) => {
    const sortedIds = [submission.team1_id, submission.team2_id].sort()
    const isTeam1First = submission.team1_id === sortedIds[0]
    
    const { error } = await supabase.from('matches').insert({
      division: submission.division,
      week: submission.week,
      team1_id: sortedIds[0],
      team2_id: sortedIds[1],
      team1_maps: isTeam1First ? submission.team1_maps : submission.team2_maps,
      team2_maps: isTeam1First ? submission.team2_maps : submission.team1_maps,
      admin_approved: true,
    })

    if (!error) {
      await supabase
        .from('match_submissions')
        .update({ status: 'resolved' })
        .eq('match_key', submission.match_key)
      
      onDataChange()
      fetchDisputed()
    }
  }

  const deleteSubmission = async (submission) => {
    await supabase
      .from('match_submissions')
      .delete()
      .eq('id', submission.id)
    
    onDataChange()
    fetchDisputed()
  }

  // Group disputed by match_key
  const groupedDisputed = disputedSubmissions.reduce((acc, sub) => {
    if (!acc[sub.match_key]) acc[sub.match_key] = []
    acc[sub.match_key].push(sub)
    return acc
  }, {})

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-gradient-to-b from-white/5 to-transparent rounded-xl border border-white/10 p-6">
          <h2 className="text-xl font-bold mb-4">Admin Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Admin password"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-bold"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <button 
          onClick={() => setIsAdmin(false)}
          className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20"
        >
          Logout
        </button>
      </div>

      {/* Disputed Results */}
      {Object.keys(groupedDisputed).length > 0 && (
        <div className="bg-gradient-to-b from-red-500/10 to-transparent rounded-xl border border-red-500/20 overflow-hidden">
          <div className="p-6 border-b border-red-500/20">
            <h3 className="text-lg font-bold text-red-400">⚠️ Disputed Results</h3>
            <p className="text-gray-500 text-sm">Teams submitted conflicting scores</p>
          </div>
          <div className="p-6 space-y-6">
            {Object.entries(groupedDisputed).map(([matchKey, submissions]) => (
              <div key={matchKey} className="bg-black/40 rounded-lg p-4 space-y-3">
                <div className="text-sm text-gray-400">
                  Week {submissions[0]?.week} • {getTeamName(submissions[0]?.team1_id)} vs {getTeamName(submissions[0]?.team2_id)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {submissions.map(sub => (
                    <div key={sub.id} className="bg-white/5 p-3 rounded">
                      <div className="text-xs text-gray-500 mb-1">Submitted by: {sub.submitted_by}</div>
                      <div className="font-bold">{getTeamName(sub.team1_id)} {sub.team1_maps} - {sub.team2_maps} {getTeamName(sub.team2_id)}</div>
                      <button 
                        onClick={() => approveSubmission(sub)}
                        className="mt-2 w-full py-1.5 bg-green-500/20 text-green-400 rounded text-sm font-semibold hover:bg-green-500/30"
                      >
                        Use This Result
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Submissions */}
      <div className="bg-gradient-to-b from-yellow-500/10 to-transparent rounded-xl border border-yellow-500/20 overflow-hidden">
        <div className="p-6 border-b border-yellow-500/20">
          <h3 className="text-lg font-bold text-yellow-400">⏳ Awaiting Confirmation ({pendingSubmissions.length})</h3>
          <p className="text-gray-500 text-sm">One team has submitted, waiting for opponent</p>
        </div>
        <div className="p-6">
          {pendingSubmissions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No pending results</p>
          ) : (
            <div className="space-y-3">
              {pendingSubmissions.map(sub => (
                <div key={sub.id} className="bg-black/40 rounded-lg p-4 flex flex-wrap gap-4 justify-between items-center">
                  <div>
                    <div className="font-semibold">{getTeamName(sub.team1_id)} vs {getTeamName(sub.team2_id)}</div>
                    <div className="text-sm text-gray-500">
                      Week {sub.week} • Submitted by {sub.submitted_by}: {sub.team1_maps}-{sub.team2_maps}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => approveSubmission(sub)}
                      className="px-4 py-2 bg-green-500/20 text-green-400 rounded font-semibold hover:bg-green-500/30"
                    >
                      Force Approve
                    </button>
                    <button 
                      onClick={() => deleteSubmission(sub)}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded font-semibold hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmed Matches - Admin can delete */}
      <AdminMatchList teams={teams} getTeamName={getTeamName} onDataChange={onDataChange} />

      {/* Quick Add */}
      <AdminQuickAdd teams={teams} onSuccess={onDataChange} />
    </div>
  )
}

// Admin Match List Component - for deleting confirmed matches
function AdminMatchList({ teams, getTeamName, onDataChange }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (data) setMatches(data)
    setLoading(false)
  }

  const deleteMatch = async (matchId) => {
    if (!confirm('Are you sure you want to delete this match?')) return
    
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId)
    
    if (!error) {
      fetchMatches()
      onDataChange()
    }
  }

  return (
    <div className="bg-gradient-to-b from-white/5 to-transparent rounded-xl border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <h3 className="text-lg font-bold">Confirmed Matches ({matches.length})</h3>
        <p className="text-gray-500 text-sm">Recent confirmed results - click delete to remove</p>
      </div>
      <div className="p-6">
        {loading ? (
          <p className="text-gray-500 text-center py-4">Loading...</p>
        ) : matches.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No confirmed matches yet</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {matches.map(match => (
              <div key={match.id} className="bg-black/40 rounded-lg p-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">W{match.week}</span>
                  <span className="font-semibold">{getTeamName(match.team1_id)}</span>
                  <span className="font-mono bg-white/10 px-2 py-1 rounded">
                    {match.team1_maps} - {match.team2_maps}
                  </span>
                  <span className="font-semibold">{getTeamName(match.team2_id)}</span>
                </div>
                <button 
                  onClick={() => deleteMatch(match.id)}
                  className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm font-semibold hover:bg-red-500/30"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Admin Quick Add Component
function AdminQuickAdd({ teams, onSuccess }) {
  const [division, setDivision] = useState(1)
  const [team1Id, setTeam1Id] = useState('')
  const [team2Id, setTeam2Id] = useState('')
  const [team1Maps, setTeam1Maps] = useState(3)
  const [team2Maps, setTeam2Maps] = useState(0)
  const [week, setWeek] = useState(1)

  const divTeams = teams.filter(t => t.division === division)

  const handleAdd = async () => {
    if (!team1Id || !team2Id || team1Id === team2Id) return

    const sortedIds = [team1Id, team2Id].sort()
    const isTeam1First = team1Id === sortedIds[0]
    
    const { error } = await supabase.from('matches').insert({
      division,
      week,
      team1_id: sortedIds[0],
      team2_id: sortedIds[1],
      team1_maps: isTeam1First ? team1Maps : team2Maps,
      team2_maps: isTeam1First ? team2Maps : team1Maps,
      admin_approved: true,
    })

    if (!error) {
      setTeam1Id('')
      setTeam2Id('')
      onSuccess()
    }
  }

  return (
    <div className="bg-gradient-to-b from-white/5 to-transparent rounded-xl border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <h3 className="text-lg font-bold">Quick Add Result</h3>
        <p className="text-gray-500 text-sm">Manually add a match result</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <select 
            value={division} 
            onChange={(e) => { setDivision(Number(e.target.value)); setTeam1Id(''); setTeam2Id(''); }}
            className="px-4 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-white"
          >
            <option value={1}>Division One</option>
            <option value={2}>Division Two</option>
            <option value={3}>Division Three</option>
            <option value={4}>Division Four</option>
          </select>
          <select 
            value={week} 
            onChange={(e) => setWeek(Number(e.target.value))}
            className="px-4 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-white"
          >
            {[1, 2, 3, 4, 5].map(w => <option key={w} value={w}>Week {w}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-5 gap-2 items-center">
          <select 
            value={team1Id} 
            onChange={(e) => setTeam1Id(e.target.value)}
            className="col-span-2 px-4 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-white"
          >
            <option value="">Team 1</option>
            {divTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div className="flex items-center justify-center gap-1">
            <select value={team1Maps} onChange={(e) => setTeam1Maps(Number(e.target.value))} className="w-12 py-1 bg-[#1a1a2e] border border-white/10 rounded text-center text-white">
              {[0,1,2,3].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>-</span>
            <select value={team2Maps} onChange={(e) => setTeam2Maps(Number(e.target.value))} className="w-12 py-1 bg-[#1a1a2e] border border-white/10 rounded text-center text-white">
              {[0,1,2,3].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <select 
            value={team2Id} 
            onChange={(e) => setTeam2Id(e.target.value)}
            className="col-span-2 px-4 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-white"
          >
            <option value="">Team 2</option>
            {divTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <button 
          onClick={handleAdd}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-bold"
        >
          Add Result
        </button>
      </div>
    </div>
  )
}

// Fixtures View Component
function FixturesView({ selectedDivision, setSelectedDivision, teams, getTeamName }) {
  const [fixtures, setFixtures] = useState([])
  const [matches, setMatches] = useState([])
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [expandedFixture, setExpandedFixture] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFixtures()
  }, [selectedDivision])

  const fetchFixtures = async () => {
    setLoading(true)
    const [fixturesRes, matchesRes] = await Promise.all([
      supabase
        .from('fixtures')
        .select('*')
        .eq('division', selectedDivision)
        .order('week')
        .order('created_at'),
      supabase
        .from('matches')
        .select('*')
        .eq('division', selectedDivision)
    ])
    
    if (fixturesRes.data) setFixtures(fixturesRes.data)
    if (matchesRes.data) setMatches(matchesRes.data)
    setLoading(false)
  }

  const getFixtureResult = (fixture) => {
    const match = matches.find(m => 
      ((m.team1_id === fixture.team1_id && m.team2_id === fixture.team2_id) ||
      (m.team1_id === fixture.team2_id && m.team2_id === fixture.team1_id)) &&
      m.week === fixture.week
    )
    return match
  }

  const weekFixtures = fixtures.filter(f => f.week === selectedWeek)

  return (
    <div className="space-y-8">
      {/* Division Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4].map(div => (
          <button
            key={div}
            onClick={() => setSelectedDivision(div)}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all
              ${selectedDivision === div 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
          >
            {divisionInfo[div].name}
          </button>
        ))}
      </div>

      {/* Week Tabs */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(week => (
          <button
            key={week}
            onClick={() => setSelectedWeek(week)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all
              ${selectedWeek === week 
                ? 'bg-white/20 text-white' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            Week {week}
          </button>
        ))}
      </div>

      {/* Fixtures List */}
      <div className="bg-gradient-to-b from-white/5 to-transparent rounded-xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold">{divisionInfo[selectedDivision].name} - Week {selectedWeek}</h2>
          <p className="text-gray-500 text-sm mt-1">
            {weekFixtures.length} fixtures scheduled
          </p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading fixtures...</p>
          ) : weekFixtures.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No fixtures scheduled for this week</p>
          ) : (
            <div className="space-y-3">
              {weekFixtures.map((fixture, idx) => {
                const result = getFixtureResult(fixture)
                const isExpanded = expandedFixture === fixture.id
                
                return (
                  <div key={fixture.id} className="bg-black/40 rounded-lg overflow-hidden">
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
                      onClick={() => setExpandedFixture(isExpanded ? null : fixture.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-1 flex items-center justify-center gap-4">
                          <span className={`font-semibold text-right flex-1 ${result && result.team1_maps > result.team2_maps ? 'text-green-400' : ''}`}>
                            {getTeamName(fixture.team1_id)}
                          </span>
                          {result ? (
                            <span className="font-mono bg-white/10 px-3 py-1 rounded">
                              <span className={result.team1_maps > result.team2_maps ? 'text-green-400' : ''}>{result.team1_maps}</span>
                              <span className="text-gray-500 mx-1">-</span>
                              <span className={result.team2_maps > result.team1_maps ? 'text-green-400' : ''}>{result.team2_maps}</span>
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm px-3">vs</span>
                          )}
                          <span className={`font-semibold text-left flex-1 ${result && result.team2_maps > result.team1_maps ? 'text-green-400' : ''}`}>
                            {getTeamName(fixture.team2_id)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        {result ? (
                          <span className="text-green-400 text-xs">✓ Completed</span>
                        ) : (
                          <span className="text-yellow-400 text-xs">Scheduled</span>
                        )}
                      </div>
                    </div>
                    
                    {isExpanded && result && (
                      <FixtureDetails matchId={result.id} teams={teams} getTeamName={getTeamName} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Fixture Details Component (expanded view with game-by-game stats)
function FixtureDetails({ matchId, teams, getTeamName }) {
  const [games, setGames] = useState([])
  const [playerStats, setPlayerStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDetails()
  }, [matchId])

  const fetchDetails = async () => {
    const [gamesRes, statsRes] = await Promise.all([
      supabase.from('games').select('*').eq('match_id', matchId).order('game_number'),
      supabase.from('player_stats').select('*').eq('match_id', matchId)
    ])
    
    if (gamesRes.data) setGames(gamesRes.data)
    if (statsRes.data) setPlayerStats(statsRes.data)
    setLoading(false)
  }

  if (loading) {
    return <div className="p-4 text-gray-500 text-center">Loading details...</div>
  }

  if (games.length === 0) {
    return (
      <div className="p-4 border-t border-white/10 text-gray-500 text-center text-sm">
        No detailed stats available yet. Upload Halo Data Hive export in Admin panel.
      </div>
    )
  }

  // Group stats by game
  const statsByGame = games.map(game => ({
    game,
    stats: playerStats.filter(ps => ps.game_id === game.id)
  }))

  // Aggregate series stats
  const seriesStats = {}
  playerStats.forEach(ps => {
    if (!seriesStats[ps.player_gamertag]) {
      seriesStats[ps.player_gamertag] = {
        gamertag: ps.player_gamertag,
        team_id: ps.team_id,
        kills: 0, deaths: 0, assists: 0, damage: 0
      }
    }
    seriesStats[ps.player_gamertag].kills += ps.kills || 0
    seriesStats[ps.player_gamertag].deaths += ps.deaths || 0
    seriesStats[ps.player_gamertag].assists += ps.assists || 0
    seriesStats[ps.player_gamertag].damage += ps.damage || 0
  })

  return (
    <div className="border-t border-white/10">
      {/* Series Summary */}
      <div className="p-4 bg-white/5">
        <h4 className="text-sm font-semibold text-gray-400 mb-3">Series Stats</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-2">Player</th>
                <th className="text-center py-2">K</th>
                <th className="text-center py-2">D</th>
                <th className="text-center py-2">A</th>
                <th className="text-center py-2">K/D</th>
                <th className="text-center py-2">Damage</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(seriesStats)
                .sort((a, b) => b.kills - a.kills)
                .map(player => (
                  <tr key={player.gamertag} className="border-t border-white/5">
                    <td className="py-2 font-medium">{player.gamertag}</td>
                    <td className="text-center text-green-400">{player.kills}</td>
                    <td className="text-center text-red-400">{player.deaths}</td>
                    <td className="text-center text-gray-400">{player.assists}</td>
                    <td className="text-center">{player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills}</td>
                    <td className="text-center text-gray-400">{player.damage.toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Games */}
      {statsByGame.map(({ game, stats }) => (
        <div key={game.id} className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">
              Game {game.game_number}: {game.game_variant} on {game.map}
            </h4>
            <span className="text-xs text-gray-500">{game.duration}</span>
          </div>
          {stats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left py-1">Player</th>
                    <th className="text-center py-1">K</th>
                    <th className="text-center py-1">D</th>
                    <th className="text-center py-1">A</th>
                    <th className="text-center py-1">Damage</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.sort((a, b) => b.kills - a.kills).map(ps => (
                    <tr key={ps.id} className="border-t border-white/5">
                      <td className="py-1">{ps.player_gamertag}</td>
                      <td className="text-center text-green-400">{ps.kills}</td>
                      <td className="text-center text-red-400">{ps.deaths}</td>
                      <td className="text-center text-gray-400">{ps.assists}</td>
                      <td className="text-center text-gray-400">{ps.damage?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-xs">No player stats for this game</p>
          )}
        </div>
      ))}
    </div>
  )
}

// Leaderboards View Component
function LeaderboardsView({ selectedDivision, setSelectedDivision }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [sortBy, setSortBy] = useState('overall_kd')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [selectedDivision])

  const fetchLeaderboard = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('division_leaderboards')
      .select('*')
      .eq('division', selectedDivision)
    
    if (data) setLeaderboard(data)
    setLoading(false)
  }

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (sortBy === 'overall_kd') return (b.overall_kd || 0) - (a.overall_kd || 0)
    if (sortBy === 'total_kills') return (b.total_kills || 0) - (a.total_kills || 0)
    if (sortBy === 'total_damage') return (b.total_damage || 0) - (a.total_damage || 0)
    if (sortBy === 'avg_kills_per_game') return (b.avg_kills_per_game || 0) - (a.avg_kills_per_game || 0)
    if (sortBy === 'overall_accuracy') return (b.overall_accuracy || 0) - (a.overall_accuracy || 0)
    return 0
  })

  return (
    <div className="space-y-8">
      {/* Division Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4].map(div => (
          <button
            key={div}
            onClick={() => setSelectedDivision(div)}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all
              ${selectedDivision === div 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
          >
            {divisionInfo[div].name}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-gradient-to-b from-white/5 to-transparent rounded-xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold">{divisionInfo[selectedDivision].name} Leaderboard</h2>
          <p className="text-gray-500 text-sm mt-1">
            Player stats aggregated across all matches
          </p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading leaderboard...</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No player stats recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-white/10">
                    <th className="text-left py-4 px-2">#</th>
                    <th className="text-left py-4 px-2">Player</th>
                    <th className="text-left py-4 px-2">Team</th>
                    <th className="text-center py-4 px-2">Games</th>
                    <th 
                      className={`text-center py-4 px-2 cursor-pointer hover:text-cyan-400 ${sortBy === 'total_kills' ? 'text-cyan-400' : ''}`}
                      onClick={() => setSortBy('total_kills')}
                    >
                      Kills {sortBy === 'total_kills' && '▼'}
                    </th>
                    <th className="text-center py-4 px-2">Deaths</th>
                    <th className="text-center py-4 px-2">Assists</th>
                    <th 
                      className={`text-center py-4 px-2 cursor-pointer hover:text-cyan-400 ${sortBy === 'overall_kd' ? 'text-cyan-400' : ''}`}
                      onClick={() => setSortBy('overall_kd')}
                    >
                      K/D {sortBy === 'overall_kd' && '▼'}
                    </th>
                    <th 
                      className={`text-center py-4 px-2 cursor-pointer hover:text-cyan-400 ${sortBy === 'total_damage' ? 'text-cyan-400' : ''}`}
                      onClick={() => setSortBy('total_damage')}
                    >
                      Damage {sortBy === 'total_damage' && '▼'}
                    </th>
                    <th 
                      className={`text-center py-4 px-2 cursor-pointer hover:text-cyan-400 ${sortBy === 'avg_kills_per_game' ? 'text-cyan-400' : ''}`}
                      onClick={() => setSortBy('avg_kills_per_game')}
                    >
                      Avg K {sortBy === 'avg_kills_per_game' && '▼'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLeaderboard.map((player, idx) => (
                    <tr key={player.player_gamertag} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-2">
                        <span className={`font-bold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-semibold">{player.player_gamertag}</td>
                      <td className="py-3 px-2 text-gray-400 text-sm">{player.team_name}</td>
                      <td className="py-3 px-2 text-center text-gray-400">{player.games_played}</td>
                      <td className="py-3 px-2 text-center text-green-400 font-semibold">{player.total_kills}</td>
                      <td className="py-3 px-2 text-center text-red-400">{player.total_deaths}</td>
                      <td className="py-3 px-2 text-center text-gray-400">{player.total_assists}</td>
                      <td className="py-3 px-2 text-center font-bold">{player.overall_kd?.toFixed(2)}</td>
                      <td className="py-3 px-2 text-center text-gray-400">{player.total_damage?.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-gray-400">{player.avg_kills_per_game?.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
