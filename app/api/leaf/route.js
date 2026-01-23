import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { scrimUrl } = await request.json()
    
    // Extract scrim ID from URL
    // Supports: https://leafapp.co/scrims/8440 or https://leafapp.co/scrims/8440/matches
    const scrimMatch = scrimUrl.match(/leafapp\.co\/scrims\/(\d+)/)
    if (!scrimMatch) {
      return NextResponse.json({ error: 'Invalid scrim URL' }, { status: 400 })
    }
    
    const scrimId = scrimMatch[1]
    const matchesUrl = `https://leafapp.co/scrims/${scrimId}/matches`
    
    // Fetch the matches page
    const matchesResponse = await fetch(matchesUrl)
    if (!matchesResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch scrim page' }, { status: 500 })
    }
    
    const html = await matchesResponse.text()
    
    // Extract game IDs from the HTML
    // Pattern: <a href="https://leafapp.co/game/{uuid}">
    const gameIdRegex = /href="https:\/\/leafapp\.co\/game\/([a-f0-9-]{36})"/g
    const gameIds = []
    let match
    while ((match = gameIdRegex.exec(html)) !== null) {
      if (!gameIds.includes(match[1])) {
        gameIds.push(match[1])
      }
    }
    
    if (gameIds.length === 0) {
      return NextResponse.json({ error: 'No games found in scrim' }, { status: 400 })
    }
    
    // Fetch CSV for each game
    const allGames = []
    
    for (const gameId of gameIds) {
      const csvUrl = `https://leafapp.co/game/${gameId}/csv`
      const csvResponse = await fetch(csvUrl)
      
      if (!csvResponse.ok) {
        console.error(`Failed to fetch CSV for game ${gameId}`)
        continue
      }
      
      const csvText = await csvResponse.text()
      const gameData = parseLeafCsv(csvText, gameId)
      if (gameData) {
        allGames.push(gameData)
      }
    }
    
    if (allGames.length === 0) {
      return NextResponse.json({ error: 'Failed to parse any game data' }, { status: 500 })
    }
    
    // Merge split games (same map + variant where kills don't add up correctly)
    const mergedGames = mergeSplitGames(allGames)
    
    // Filter out void games (0-0 or very short games)
    const validGames = mergedGames.filter(g => {
      const totalKills = g.players.reduce((sum, p) => sum + p.kills, 0)
      return totalKills > 0 && g.winnerScore > 0
    })
    
    if (validGames.length === 0) {
      return NextResponse.json({ error: 'No valid games found after filtering' }, { status: 400 })
    }
    
    // Identify teams from first game
    const firstGame = validGames[0]
    const teamAGamertags = firstGame.winningGamertags
    const teamBGamertags = firstGame.losingGamertags
    
    // Process games to track which team won each
    const gamesWithTeams = validGames.map(game => {
      const teamAWon = game.winningGamertags.some(gt => 
        teamAGamertags.map(t => t.toLowerCase()).includes(gt.toLowerCase())
      )
      
      return {
        ...game,
        team0Score: teamAWon ? game.winnerScore : game.loserScore,
        team1Score: teamAWon ? game.loserScore : game.winnerScore,
        teamAWon,
        players: game.players.map(p => ({
          ...p,
          haloTeam: teamAGamertags.map(t => t.toLowerCase()).includes(p.gamertag.toLowerCase()) ? 'TeamA' : 'TeamB'
        }))
      }
    })
    
    // Count series wins
    const team0Wins = gamesWithTeams.filter(g => g.teamAWon).length
    const team1Wins = gamesWithTeams.filter(g => !g.teamAWon).length
    
    return NextResponse.json({
      scrimId,
      games: gamesWithTeams,
      team0Gamertags: teamAGamertags,
      team1Gamertags: teamBGamertags,
      team0Wins,
      team1Wins,
    })
    
  } catch (error) {
    console.error('Leaf API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function mergeSplitGames(games) {
  // Group games by map + variant
  const gamesByMapVariant = {}
  
  games.forEach(game => {
    const key = `${game.map.toLowerCase()}_${game.variant.toLowerCase()}`
    if (!gamesByMapVariant[key]) {
      gamesByMapVariant[key] = []
    }
    gamesByMapVariant[key].push(game)
  })
  
  const mergedGames = []
  
  for (const key of Object.keys(gamesByMapVariant)) {
    const gamesGroup = gamesByMapVariant[key]
    
    if (gamesGroup.length === 1) {
      // Only one game of this type, keep as is
      mergedGames.push(gamesGroup[0])
    } else if (gamesGroup.length >= 2) {
      // Multiple games of same map+variant - check if they need merging
      const variant = gamesGroup[0].variant.toLowerCase()
      const isSlayer = variant.includes('slayer')
      const isOddball = variant.includes('oddball')
      
      if (isSlayer) {
        // For Slayer, check if total kills across all fragments equals ~50
        const totalKillsAllGames = gamesGroup.reduce((sum, g) => {
          return sum + g.players.reduce((s, p) => s + p.kills, 0)
        }, 0)
        
        // Check if any single game has ~50 kills (complete game)
        const hasCompleteGame = gamesGroup.some(g => {
          const gameKills = g.players.reduce((s, p) => s + p.kills, 0)
          return gameKills >= 45 // Allow some tolerance
        })
        
        if (hasCompleteGame) {
          // Keep only complete games, discard fragments
          gamesGroup.forEach(g => {
            const gameKills = g.players.reduce((s, p) => s + p.kills, 0)
            if (gameKills >= 45) {
              mergedGames.push(g)
            }
          })
        } else if (totalKillsAllGames >= 45 && totalKillsAllGames <= 110) {
          // Looks like split games that need merging
          const merged = mergeGameStats(gamesGroup)
          mergedGames.push(merged)
        } else {
          // Unclear situation, keep all
          mergedGames.push(...gamesGroup)
        }
      } else if (isOddball) {
        // For Oddball, a complete game requires one team to reach 2 rounds
        // If no game has a team at 2, they're split games that need merging
        const completeGames = gamesGroup.filter(g => 
          g.winnerScore >= 2 || g.loserScore >= 2
        )
        const incompleteGames = gamesGroup.filter(g => 
          g.winnerScore < 2 && g.loserScore < 2 && (g.winnerScore > 0 || g.loserScore > 0)
        )
        
        // Keep complete games as-is
        mergedGames.push(...completeGames)
        
        // Merge incomplete games if we have exactly 2
        if (incompleteGames.length === 2) {
          const merged = mergeGameStats(incompleteGames)
          mergedGames.push(merged)
        } else if (incompleteGames.length > 2) {
          // More than 2 incomplete games - try to pair them
          // For now, merge all into one
          const merged = mergeGameStats(incompleteGames)
          mergedGames.push(merged)
        } else if (incompleteGames.length === 1) {
          // Single incomplete game - keep it (might be a real short game)
          mergedGames.push(incompleteGames[0])
        }
      } else {
        // For other objective modes (CTF, Strongholds, KotH), check for 0-0 games (restarts)
        const validObjectiveGames = gamesGroup.filter(g => 
          g.winnerScore > 0 || g.loserScore > 0
        )
        
        if (validObjectiveGames.length === 1) {
          mergedGames.push(validObjectiveGames[0])
        } else if (validObjectiveGames.length > 1) {
          // Multiple valid objective games - might need merging
          // Check if players have very low stats suggesting incomplete games
          const totalKills = validObjectiveGames.reduce((sum, g) => {
            return sum + g.players.reduce((s, p) => s + p.kills, 0)
          }, 0)
          
          const avgKillsPerGame = totalKills / validObjectiveGames.length
          
          // If avg kills per game is suspiciously low, merge them
          if (avgKillsPerGame < 30 && validObjectiveGames.length === 2) {
            const merged = mergeGameStats(validObjectiveGames)
            mergedGames.push(merged)
          } else {
            mergedGames.push(...validObjectiveGames)
          }
        }
      }
    }
  }
  
  return mergedGames
}

function mergeGameStats(games) {
  // Merge multiple game fragments into one
  const base = { ...games[0] }
  
  // Combine match IDs
  base.matchId = games.map(g => g.matchId).join('_merged_')
  
  // Determine overall winner by checking who won more fragments or has higher total score
  let teamAScore = 0
  let teamBScore = 0
  
  games.forEach(g => {
    teamAScore += g.winnerScore
    teamBScore += g.loserScore
  })
  
  // Build merged player stats
  const playerStatsMap = {}
  
  games.forEach(game => {
    game.players.forEach(player => {
      const key = player.gamertag.toLowerCase()
      if (!playerStatsMap[key]) {
        playerStatsMap[key] = {
          gamertag: player.gamertag,
          won: player.won,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          damageTaken: 0,
          shotsFired: 0,
          shotsLanded: 0,
        }
      }
      playerStatsMap[key].kills += player.kills
      playerStatsMap[key].deaths += player.deaths
      playerStatsMap[key].assists += player.assists
      playerStatsMap[key].damage += player.damage
      playerStatsMap[key].damageTaken += player.damageTaken
      playerStatsMap[key].shotsFired += player.shotsFired
      playerStatsMap[key].shotsLanded += player.shotsLanded
    })
  })
  
  base.players = Object.values(playerStatsMap)
  
  // Determine winner based on merged stats
  const winningPlayers = base.players.filter(p => 
    games[0].winningGamertags.map(g => g.toLowerCase()).includes(p.gamertag.toLowerCase())
  )
  const losingPlayers = base.players.filter(p => 
    games[0].losingGamertags.map(g => g.toLowerCase()).includes(p.gamertag.toLowerCase())
  )
  
  const winningKills = winningPlayers.reduce((s, p) => s + p.kills, 0)
  const losingKills = losingPlayers.reduce((s, p) => s + p.kills, 0)
  
  // For slayer, winner is whoever has more kills
  if (base.variant.toLowerCase().includes('slayer')) {
    if (winningKills >= losingKills) {
      base.winnerScore = winningKills
      base.loserScore = losingKills
    } else {
      // Swap winners/losers
      base.winnerScore = losingKills
      base.loserScore = winningKills
      base.winningGamertags = games[0].losingGamertags
      base.losingGamertags = games[0].winningGamertags
      base.players.forEach(p => {
        p.won = !p.won
      })
    }
  } else {
    base.winnerScore = teamAScore
    base.loserScore = teamBScore
  }
  
  // Sum durations
  const totalSeconds = games.reduce((sum, g) => {
    const parts = g.duration.split(':')
    return sum + (parseInt(parts[0]) * 60) + parseInt(parts[1])
  }, 0)
  base.duration = `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`
  
  return base
}

function parseLeafCsv(csvText, gameId) {
  try {
    const lines = csvText.split('\n').filter(l => l.trim())
    if (lines.length < 2) return null
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    const rows = lines.slice(1).map(line => {
      const values = []
      let current = ''
      let inQuotes = false
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())
      
      const obj = {}
      headers.forEach((h, i) => {
        obj[h] = values[i] || ''
      })
      return obj
    })
    
    if (rows.length === 0) return null
    
    const firstRow = rows[0]
    const map = firstRow.Map?.replace(' - Ranked', '') || 'Unknown'
    const category = firstRow.Category || 'Unknown'
    const lengthSeconds = parseInt(firstRow.LengthSeconds) || 0
    
    const winningPlayers = rows.filter(r => r.Outcome === 'Win')
    const losingPlayers = rows.filter(r => r.Outcome === 'Loss')
    
    const winnerScore = parseInt(winningPlayers[0]?.TeamScore) || 0
    const loserScore = parseInt(losingPlayers[0]?.TeamScore) || 0
    
    return {
      matchId: gameId,
      map,
      variant: category,
      duration: `${Math.floor(lengthSeconds / 60)}:${String(lengthSeconds % 60).padStart(2, '0')}`,
      winnerScore,
      loserScore,
      winningGamertags: winningPlayers.map(p => p.Player),
      losingGamertags: losingPlayers.map(p => p.Player),
      players: [
        ...winningPlayers.map(p => ({
          gamertag: p.Player,
          won: true,
          kills: parseInt(p.Kills) || 0,
          deaths: parseInt(p.Deaths) || 0,
          assists: parseInt(p.Assists) || 0,
          damage: parseInt(p.DamageDone) || 0,
          damageTaken: parseInt(p.DamageTaken) || 0,
          shotsFired: parseInt(p.ShotsFired) || 0,
          shotsLanded: parseInt(p.ShotsLanded) || 0,
        })),
        ...losingPlayers.map(p => ({
          gamertag: p.Player,
          won: false,
          kills: parseInt(p.Kills) || 0,
          deaths: parseInt(p.Deaths) || 0,
          assists: parseInt(p.Assists) || 0,
          damage: parseInt(p.DamageDone) || 0,
          damageTaken: parseInt(p.DamageTaken) || 0,
          shotsFired: parseInt(p.ShotsFired) || 0,
          shotsLanded: parseInt(p.ShotsLanded) || 0,
        }))
      ]
    }
  } catch (e) {
    console.error('CSV parse error:', e)
    return null
  }
}
