-- Halo Divisional Championship Schema

-- Teams table
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  division INTEGER NOT NULL CHECK (division BETWEEN 1 AND 4),
  players JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table (confirmed results)
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  division INTEGER NOT NULL CHECK (division BETWEEN 1 AND 4),
  week INTEGER NOT NULL CHECK (week BETWEEN 1 AND 5),
  team1_id UUID REFERENCES teams(id) NOT NULL,
  team2_id UUID REFERENCES teams(id) NOT NULL,
  team1_maps INTEGER NOT NULL CHECK (team1_maps BETWEEN 0 AND 3),
  team2_maps INTEGER NOT NULL CHECK (team2_maps BETWEEN 0 AND 3),
  confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_bo5 CHECK (
    (team1_maps = 3 OR team2_maps = 3) AND 
    (team1_maps + team2_maps <= 5)
  )
);

-- Match submissions (pending results from teams)
CREATE TABLE match_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_key TEXT NOT NULL, -- Composite of sorted team IDs + week
  division INTEGER NOT NULL,
  week INTEGER NOT NULL,
  team1_id UUID REFERENCES teams(id) NOT NULL,
  team2_id UUID REFERENCES teams(id) NOT NULL,
  team1_maps INTEGER NOT NULL CHECK (team1_maps BETWEEN 0 AND 3),
  team2_maps INTEGER NOT NULL CHECK (team2_maps BETWEEN 0 AND 3),
  submitted_by TEXT NOT NULL, -- Team name who submitted
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'disputed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_teams_division ON teams(division);
CREATE INDEX idx_matches_division ON matches(division);
CREATE INDEX idx_matches_teams ON matches(team1_id, team2_id);
CREATE INDEX idx_submissions_match_key ON match_submissions(match_key);
CREATE INDEX idx_submissions_status ON match_submissions(status);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_submissions ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can read teams and matches
CREATE POLICY "Teams are viewable by everyone" ON teams FOR SELECT USING (true);
CREATE POLICY "Matches are viewable by everyone" ON matches FOR SELECT USING (true);
CREATE POLICY "Submissions are viewable by everyone" ON match_submissions FOR SELECT USING (true);

-- Policies: Anyone can insert submissions (we'll add auth later if needed)
CREATE POLICY "Anyone can submit results" ON match_submissions FOR INSERT WITH CHECK (true);

-- Policies: Only allow inserts/updates via service role for matches (admin)
CREATE POLICY "Matches insert via service role" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Matches update via service role" ON matches FOR UPDATE USING (true);

-- View for standings calculation
CREATE OR REPLACE VIEW standings AS
SELECT 
  t.id,
  t.name,
  t.division,
  t.players,
  COALESCE(wins.count, 0) AS wins,
  COALESCE(losses.count, 0) AS losses,
  COALESCE(maps_won.total, 0) AS maps_won,
  COALESCE(maps_lost.total, 0) AS maps_lost,
  COALESCE(maps_won.total, 0) - COALESCE(maps_lost.total, 0) AS map_diff
FROM teams t
LEFT JOIN (
  SELECT team_id, COUNT(*) as count FROM (
    SELECT team1_id as team_id FROM matches WHERE team1_maps > team2_maps
    UNION ALL
    SELECT team2_id as team_id FROM matches WHERE team2_maps > team1_maps
  ) w GROUP BY team_id
) wins ON t.id = wins.team_id
LEFT JOIN (
  SELECT team_id, COUNT(*) as count FROM (
    SELECT team1_id as team_id FROM matches WHERE team1_maps < team2_maps
    UNION ALL
    SELECT team2_id as team_id FROM matches WHERE team2_maps < team1_maps
  ) l GROUP BY team_id
) losses ON t.id = losses.team_id
LEFT JOIN (
  SELECT team_id, SUM(maps) as total FROM (
    SELECT team1_id as team_id, team1_maps as maps FROM matches
    UNION ALL
    SELECT team2_id as team_id, team2_maps as maps FROM matches
  ) mw GROUP BY team_id
) maps_won ON t.id = maps_won.team_id
LEFT JOIN (
  SELECT team_id, SUM(maps) as total FROM (
    SELECT team1_id as team_id, team2_maps as maps FROM matches
    UNION ALL
    SELECT team2_id as team_id, team1_maps as maps FROM matches
  ) ml GROUP BY team_id
) maps_lost ON t.id = maps_lost.team_id
ORDER BY t.division, wins.count DESC NULLS LAST, (COALESCE(maps_won.total, 0) - COALESCE(maps_lost.total, 0)) DESC;

-- Insert all teams
INSERT INTO teams (name, division, players) VALUES
-- Division 1 (6 teams)
('Chaoz CB', 1, '["Chaoz CB", "Tuckze", "Woffs", "TK2 FPS"]'),
('Suspcnse', 1, '["Suspcnse", "Scarcety", "Fjnners", "Zondit"]'),
('Sigmayame', 1, '["Sigmayame", "Mifoushi", "Bastoss", "King Nokache"]'),
('Outqasted', 1, '["Outqasted", "Icyvermin36", "Perkushon", "Ash n reece"]'),
('Provocative', 1, '["Provocative", "Hexed", "Harsh", "Frcnzied"]'),
('Manxcy', 1, '["Manxcy", "Zovay", "Ninj", "Flubso"]'),
-- Division 2 (8 teams)
('Zanty', 2, '["Zanty", "Qstralix", "Valanted", "Frenzzy FPS"]'),
('Pulse TL', 2, '["Pulse TL", "Lightaxl", "diizul", "Rudi"]'),
('Othyyehx', 2, '["Othyyehx", "Wxrlord SG", "La Catarina", "Luke is Toogood"]'),
('Greeny', 2, '["Greeny", "Gxbss", "Jamma", "TPN"]'),
('Nebvlx', 2, '["Nebvlx", "Buddaah", "Savieer", "NATHMOORE"]'),
('iiBez', 2, '["iiBez", "Chip", "Godly", "ItzbryaNoob"]'),
('Foivikas', 2, '["Foivikas", "Cap0 crimini", "Ttvwhaabaam", "MageLord"]'),
('Bom the Benz', 2, '["Bom the Benz", "Ice Scrim", "Bom Kaii", "Arkur Nexus"]'),
-- Division 3 (8 teams)
('BML 1999', 3, '["BML 1999", "L3gend6", "Ayrtcn", "Izzypop"]'),
('Explosiv3 v2', 3, '["Explosiv3 v2", "Vmkim", "Zero ZPM", "Vortvx"]'),
('British legends', 3, '["British legends", "SquallialVI", "Psycotic118z", "Full English"]'),
('DarkAngelion', 3, '["DarkAngelion", "Warco", "Ankaa", "UltraOgre"]'),
('Antayame', 3, '["Antayame", "bukie", "Av4rk", "Sniper Paul"]'),
('GrumpyMalone', 3, '["GrumpyMalone", "AcKanik", "Mad L3prechaun", "Jamesy 419"]'),
('Imprlsonment', 3, '["Imprlsonment", "NeptuneFPS", "RapidRidz", "Outz Cov"]'),
('pureSilentz', 3, '["pureSilentz", "PAVAVOOM", "RockEagleFPS", "ManLikeMike"]'),
-- Division 4 (4 teams)
('Bom loric', 4, '["Bom loric", "Bom phuriax", "Bom stup", "Nutsinette"]'),
('MelminTG', 4, '["MelminTG", "Ads7 EG", "Shaper1393", "unity havok"]'),
('pfuggs7735', 4, '["pfuggs7735", "Snip3downFaze", "Dzasterpeace", "Addjam9870"]'),
('platypuz', 4, '["platypuz", "Exo epic", "Scott x2", "PB7"]');
