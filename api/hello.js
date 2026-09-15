export default async function handler(req, res) {
  const originalQuery = String(req.query.q || "").trim();

  if (!originalQuery) {
    return res.status(400).json({
      success: false,
      error: "please provide a search query"
    });
  }

  const q = originalQuery.toLowerCase().trim();
  const BBS_KEY = process.env.BBS_API_KEY;

  // =========================
  // ALIASES
  // =========================

  const aliases = {
    "cr7": "cristiano ronaldo",
    "ronaldo": "cristiano ronaldo",
    "messi": "lionel messi",
    "mbappe": "kylian mbappe",
    "kylian mbappe": "kylian mbappe",
    "haaland": "erling haaland",

    "psg": "paris saint-germain",
    "barca": "barcelona",
    "barça": "barcelona",

    "rm": "real madrid",
    "real madrid cf": "real madrid",

    "man u": "manchester united",
    "man utd": "manchester united",
    "manchester utd": "manchester united",

    "city": "manchester city",
    "man city": "manchester city",

    "epl": "premier league",
    "ucl": "champions league"
  };

  const normalizedQuery = aliases[q] || q;

  // =========================
  // LEAGUE MAP
  // =========================

  const leagueMap = {
    "premier league": "epl",
    "epl": "epl",

    "la liga": "laliga",
    "laliga": "laliga",

    "serie a": "seriea",
    "seriea": "seriea",

    "bundesliga": "bundesliga",

    "ligue 1": "ligue1",
    "ligue1": "ligue1",

    "mls": "mls",

    "champions league": "ucl",
    "ucl": "ucl"
  };

  // =========================
  // BIG BALLS REQUEST
  // =========================

  async function bbsRequest(path) {
    if (!BBS_KEY) {
      return {
        ok: false,
        status: 0,
        error: "BBS_API_KEY is missing"
      };
    }

    try {
      const response = await fetch(
        `https://api.bigballsdata.com${path}`,
        {
          headers: {
            Authorization: `Bearer ${BBS_KEY}`,
            "User-Agent": "Nexora/14.2"
          }
        }
      );

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      return {
        ok: response.ok,
        status: response.status,
        data,
        error: response.ok
          ? null
          : data?.error?.message || "Big Balls API request failed"
      };

    } catch (error) {
      return {
        ok: false,
        status: 0,
        data: null,
        error: error.message
      };
    }
  }

  // =========================
  // WIKIPEDIA FALLBACK
  // =========================

  async function wikipediaSearch(searchQuery) {
    try {
      const url =
        `https://en.wikipedia.org/w/api.php` +
        `?action=query` +
        `&list=search` +
        `&srsearch=${encodeURIComponent(searchQuery)}` +
        `&format=json` +
        `&origin=*` +
        `&srlimit=5`;

      const response = await fetch(url);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      return (data?.query?.search || []).map(item => ({
        title: item.title,
        snippet: item.snippet
          ? item.snippet.replace(/<[^>]+>/g, "")
          : "",
        source: "Wikipedia"
      }));

    } catch {
      return [];
    }
  }

  // =========================
  // INTENT DETECTION
  // =========================

  function detectIntent(query) {
    if (
      query.includes("standings") ||
      query.includes("table") ||
      query.includes("league table") ||
      query.includes("positions")
    ) {
      return "standings";
    }

    if (
      query.includes("stats") ||
      query.includes("statistics") ||
      query.includes("goals") ||
      query.includes("assists") ||
      query.includes("appearances")
    ) {
      return "player_stats";
    }

    if (
      query.includes("matches") ||
      query.includes("fixtures") ||
      query.includes("games") ||
      query.includes("schedule") ||
      query.includes("next match") ||
      query.includes("latest match") ||
      query.includes("results")
    ) {
      return "matches";
    }

    if (
      query.includes("news") ||
      query.includes("latest") ||
      query.includes("transfer") ||
      query.includes("injury")
    ) {
      return "news";
    }

    return "general";
  }

  const intent = detectIntent(q);

  // =========================
  // DETECT LEAGUE
  // =========================

  let detectedLeague = null;

  for (const leagueName of Object.keys(leagueMap)) {
    if (q.includes(leagueName)) {
      detectedLeague = leagueMap[leagueName];
      break;
    }
  }

  // =========================
  // PLAYER DETECTION
  // =========================

  const knownPlayers = [
    "cristiano ronaldo",
    "lionel messi",
    "kylian mbappe",
    "erling haaland",
    "vinicius junior",
    "vinicius jr",
    "lamine yamal",
    "mohamed salah",
    "jude bellingham",
    "kevin de bruyne",
    "robert lewandowski"
  ];

  let detectedPlayer = null;

  for (const player of knownPlayers) {
    if (normalizedQuery.includes(player)) {
      detectedPlayer = player;
      break;
    }
  }

  // =========================
  // TEAM DETECTION
  // =========================

  const knownTeams = [
    "arsenal",
    "chelsea",
    "liverpool",
    "manchester united",
    "manchester city",
    "tottenham",
    "newcastle united",
    "aston villa",
    "barcelona",
    "real madrid",
    "atletico madrid",
    "bayern munich",
    "borussia dortmund",
    "paris saint-germain",
    "inter milan",
    "ac milan",
    "juventus"
  ];

  let detectedTeam = null;

  for (const team of knownTeams) {
    if (normalizedQuery.includes(team)) {
      detectedTeam = team;
      break;
    }
  }

  // =========================
  // STANDINGS
  // =========================

  if (intent === "standings" && detectedLeague) {
    const result = await bbsRequest(
      `/v1/standings?sport=football&league=${encodeURIComponent(
        detectedLeague
      )}`
    );

    if (result.ok) {
      return res.status(200).json({
        success: true,
        apiVersion: "V14.2",

        query: originalQuery,

        answer: {
          type: "standings",
          title: `${originalQuery} — Live Standings`,
          source: "Big Balls Sports Data",
          data: result.data
        },

        liveSports: true,

        activeSources: [
          "Big Balls Sports Data"
        ]
      });
    }
  }

  // =========================
  // PLAYER STATS
  // =========================

  if (intent === "player_stats" && detectedPlayer) {

    // First find the player.
    const playerSearch = await bbsRequest(
      `/v1/players?sport=football&name=${encodeURIComponent(
        detectedPlayer
      )}`
    );

    const players =
      playerSearch?.data?.data ||
      playerSearch?.data?.players ||
      [];

    const player = Array.isArray(players)
      ? players[0]
      : null;

    if (player?.id) {

      const stats = await bbsRequest(
        `/v1/players/${encodeURIComponent(
          player.id
        )}/stats?sport=football`
      );

      if (stats.ok) {
        return res.status(200).json({
          success: true,
          apiVersion: "V14.2",

          query: originalQuery,

          answer: {
            type: "player_stats",
            title: `${detectedPlayer} — Live Sports Data`,
            player,
            stats: stats.data,
            source: "Big Balls Sports Data"
          },

          liveSports: true,

          activeSources: [
            "Big Balls Sports Data"
          ]
        });
      }
    }
  }

  // =========================
  // MATCHES
  // =========================

  if (intent === "matches") {

    let path = "/v1/matches?sport=football&limit=20";

    if (detectedLeague) {
      path =
        `/v1/matches?sport=football` +
        `&league=${encodeURIComponent(detectedLeague)}` +
        `&limit=20`;
    }

    const matchesResult = await bbsRequest(path);

    if (matchesResult.ok) {

      let matches =
        matchesResult?.data?.data ||
        matchesResult?.data?.matches ||
        [];

      if (!Array.isArray(matches)) {
        matches = [];
      }

      // Filter by team when the query contains a team.
      if (detectedTeam) {
        const teamLower = detectedTeam.toLowerCase();

        matches = matches.filter(match => {

          const home =
            match?.home?.name ||
            match?.home_team?.name ||
            "";

          const away =
            match?.away?.name ||
            match?.away_team?.name ||
            "";

          return (
            home.toLowerCase().includes(teamLower) ||
            away.toLowerCase().includes(teamLower)
          );
        });
      }

      return res.status(200).json({
        success: true,
        apiVersion: "V14.2",

        query: originalQuery,

        answer: {
          type: "matches",
          title: `${originalQuery} — Live Matches`,
          matches,
          source: "Big Balls Sports Data"
        },

        liveSports: true,

        activeSources: [
          "Big Balls Sports Data"
        ]
      });
    }
  }

  // =========================
  // NEWS / GENERAL FALLBACK
  // =========================

  const wikiResults = await wikipediaSearch(normalizedQuery);

  return res.status(200).json({
    success: true,

    apiVersion: "V14.2",

    query: originalQuery,

    understanding: {
      normalizedQuery,
      intent,
      detectedLeague,
      detectedPlayer,
      detectedTeam
    },

    answer: {
      type: "knowledge",
      title: wikiResults[0]?.title || originalQuery,
      text: wikiResults[0]?.snippet ||
        `Nexora couldn't find live sports data for "${originalQuery}".`
    },

    results: wikiResults,

    liveSports: false,

    activeSources: [
      ...(wikiResults.length ? ["Wikipedia"] : [])
    ]
  });
}
