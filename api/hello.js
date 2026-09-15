export default async function handler(req, res) {
  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({
      success: false,
      error: "please provide a search query"
    });
  }

  const query = q.toLowerCase().trim();
  const BBS_KEY = process.env.BBS_API_KEY;

  const BBS_API = "https://api.bigballsdata.com";
  const WIKI_API = "https://en.wikipedia.org/w/api.php";

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  async function safeJSON(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "User-Agent": "Nexora/14.0",
          ...(options.headers || {})
        }
      });

      const text = await response.text();

      if (!text) {
        return null;
      }

      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }

  function normalize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasAny(words) {
    return words.some(word => query.includes(word));
  }

  // --------------------------------------------------
  // ALIASES
  // --------------------------------------------------

  const aliases = {
    "cr7": "cristiano ronaldo",
    "ronaldo": "cristiano ronaldo",
    "messi": "lionel messi",
    "mbappe": "kylian mbappe",
    "mbappé": "kylian mbappe",
    "haaland": "erling haaland",

    "psg": "paris saint-germain",
    "ucl": "champions league",
    "epl": "premier league",
    "barca": "barcelona",
    "barça": "barcelona",
    "rm": "real madrid",
    "real": "real madrid",

    "man utd": "manchester united",
    "man u": "manchester united",
    "man united": "manchester united",
    "city": "manchester city"
  };

  const resolvedQuery = aliases[query] || q;

  const resolvedLower = normalize(resolvedQuery);

  // --------------------------------------------------
  // SPORTS DETECTION
  // --------------------------------------------------

  const footballPlayers = [
    "cristiano ronaldo",
    "lionel messi",
    "kylian mbappe",
    "erling haaland",
    "vinicius junior",
    "jude bellingham",
    "lamine yamal",
    "mohamed salah",
    "bukayo saka",
    "kevin de bruyne",
    "robert lewandowski",
    "neymar",
    "harry kane"
  ];

  const footballClubs = [
    "arsenal",
    "chelsea",
    "liverpool",
    "manchester united",
    "manchester city",
    "real madrid",
    "barcelona",
    "bayern munich",
    "paris saint-germain",
    "juventus",
    "ac milan",
    "inter milan",
    "tottenham",
    "atletico madrid"
  ];

  const footballCompetitions = [
    "premier league",
    "champions league",
    "la liga",
    "serie a",
    "bundesliga",
    "ligue 1",
    "europa league",
    "conference league",
    "world cup",
    "afcon"
  ];

  function detectSportsEntity() {
    if (footballPlayers.some(x => resolvedLower.includes(x))) {
      return "football_player";
    }

    if (footballClubs.some(x => resolvedLower.includes(x))) {
      return "football_club";
    }

    if (footballCompetitions.some(x => resolvedLower.includes(x))) {
      return "football_competition";
    }

    if (
      hasAny([
        "football",
        "soccer",
        "match",
        "matches",
        "fixture",
        "fixtures",
        "standings",
        "table",
        "score",
        "scores",
        "transfer",
        "transfers"
      ])
    ) {
      return "football";
    }

    return "general";
  }

  const sportsEntity = detectSportsEntity();

  // --------------------------------------------------
  // SPORTS INTENT
  // --------------------------------------------------

  function detectSportsIntent() {
    if (
      hasAny([
        "live",
        "live score",
        "live scores",
        "score",
        "scores",
        "result",
        "results",
        "match",
        "matches",
        "fixture",
        "fixtures"
      ])
    ) {
      return "sports_matches";
    }

    if (
      hasAny([
        "standings",
        "standing",
        "table",
        "league table",
        "position"
      ])
    ) {
      return "sports_standings";
    }

    if (
      hasAny([
        "stats",
        "statistics",
        "stat",
        "goals",
        "assists",
        "xg",
        "appearances",
        "minutes",
        "rating"
      ])
    ) {
      return "sports_stats";
    }

    if (
      hasAny([
        "news",
        "latest",
        "today",
        "transfer",
        "injury",
        "injured"
      ])
    ) {
      return "sports_news";
    }

    return "sports_general";
  }

  const sportsIntent = detectSportsIntent();

  // --------------------------------------------------
  // BIG BALLS REQUEST
  // --------------------------------------------------

  async function bbsRequest(path) {
    if (!BBS_KEY) {
      return {
        ok: false,
        error: "BBS_API_KEY is not configured"
      };
    }

    try {
      const response = await fetch(`${BBS_API}${path}`, {
        headers: {
          Authorization: `Bearer ${BBS_KEY}`,
          "User-Agent": "Nexora/14.0"
        }
      });

      const text = await response.text();

      let data = null;

      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          data
        };
      }

      return {
        ok: true,
        data
      };

    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }

  // --------------------------------------------------
  // WIKIPEDIA
  // --------------------------------------------------

  async function wikipediaSearch(searchTerm) {
    const url =
      `${WIKI_API}?action=query` +
      `&generator=search` +
      `&gsrsearch=${encodeURIComponent(searchTerm)}` +
      `&gsrlimit=5` +
      `&prop=extracts|pageimages` +
      `&exintro=1` +
      `&explaintext=1` +
      `&piprop=thumbnail` +
      `&pithumbsize=600` +
      `&format=json` +
      `&origin=*`;

    const data = await safeJSON(url);

    if (!data || !data.query || !data.query.pages) {
      return [];
    }

    return Object.values(data.query.pages).map(page => ({
      title: page.title,
      description: page.extract || "",
      image: page.thumbnail?.source || null,
      source: "Wikipedia",
      type: "knowledge"
    }));
  }

  // --------------------------------------------------
  // SPORTS DATA
  // --------------------------------------------------

  let sportsData = [];
  let sportsAnswer = null;
  let activeSportsSource = false;

  // --------------------------------------------------
  // LIVE / RECENT MATCHES
  // --------------------------------------------------

  if (
    sportsEntity !== "general" &&
    sportsIntent === "sports_matches"
  ) {
    const matches = await bbsRequest(
      "/v1/matches?sport=football&limit=10"
    );

    if (matches.ok && matches.data) {
      activeSportsSource = true;

      const rows = Array.isArray(matches.data.data)
        ? matches.data.data
        : [];

      sportsData = rows.map(match => ({
        id: match.id || null,
        title:
          `${match.home?.name || "Home"} vs ${match.away?.name || "Away"}`,
        home: match.home?.name || null,
        away: match.away?.name || null,
        score: match.score || match.scores || null,
        status: match.status || null,
        kickoff: match.kickoff_utc || null,
        league: match.league || null,
        source: "Big Balls Sports Data",
        type: "match"
      }));

      sportsAnswer = {
        title: "Football matches",
        text: sportsData.length
          ? `Nexora found ${sportsData.length} football matches from the live sports database.`
          : "No football matches were returned."
      };
    }
  }

  // --------------------------------------------------
  // STANDINGS
  // --------------------------------------------------

  if (sportsIntent === "sports_standings") {
    let league = "epl";

    if (resolvedLower.includes("la liga")) {
      league = "la_liga";
    } else if (resolvedLower.includes("serie a")) {
      league = "serie_a";
    } else if (resolvedLower.includes("bundesliga")) {
      league = "bundesliga";
    } else if (resolvedLower.includes("ligue 1")) {
      league = "ligue_1";
    } else if (resolvedLower.includes("champions league")) {
      league = "ucl";
    }

    const standings = await bbsRequest(
      `/v1/standings?sport=football&league=${encodeURIComponent(league)}`
    );

    if (standings.ok && standings.data) {
      activeSportsSource = true;

      const rows = Array.isArray(standings.data.data)
        ? standings.data.data
        : [];

      sportsData = rows.map((team, index) => ({
        position:
          team.position ||
          team.rank ||
          index + 1,

        team:
          team.team?.name ||
          team.name ||
          team.club ||
          "Unknown",

        played:
          team.played ??
          team.games_played ??
          null,

        wins:
          team.wins ??
          null,

        draws:
          team.draws ??
          null,

        losses:
          team.losses ??
          null,

        points:
          team.points ??
          null,

        goalDifference:
          team.goal_difference ??
          team.goalDifference ??
          null,

        source: "Big Balls Sports Data",
        type: "standing"
      }));

      sportsAnswer = {
        title: "League standings",
        text: sportsData.length
          ? `Nexora found the current ${league.toUpperCase()} standings.`
          : `No standings were returned for ${league.toUpperCase()}.`
      };
    }
  }

  // --------------------------------------------------
  // PLAYER STATS
  // --------------------------------------------------

  if (
    sportsEntity === "football_player" &&
    sportsIntent === "sports_stats"
  ) {
    const playerSearch = await bbsRequest(
      `/v1/players?name=${encodeURIComponent(resolvedQuery)}`
    );

    if (playerSearch.ok && playerSearch.data) {
      const players = Array.isArray(playerSearch.data.data)
        ? playerSearch.data.data
        : [];

      const player = players[0];

      if (player && player.id) {
        const stats = await bbsRequest(
          `/v1/players/${encodeURIComponent(player.id)}/stats?sport=football`
        );

        activeSportsSource = true;

        if (stats.ok && stats.data) {
          const statRows = Array.isArray(stats.data.data)
            ? stats.data.data
            : [];

          sportsData = statRows.map(stat => ({
            player:
              player.name ||
              resolvedQuery,

            season:
              stat.season ||
              null,

            club:
              stat.club?.name ||
              stat.team?.name ||
              stat.club ||
              null,

            goals:
              stat.goals ??
              stat.Goals ??
              null,

            assists:
              stat.assists ??
              stat.Assists ??
              null,

            appearances:
              stat.appearances ??
              stat.Appearances ??
              null,

            minutes:
              stat.minutes ??
              stat.Minutes ??
              null,

            xg:
              stat.xg ??
              stat.XG ??
              stat.npxg ??
              null,

            rating:
              stat.rating ??
              stat.match_rating ??
              null,

            source: "Big Balls Sports Data",
            type: "player_stats"
          }));

          sportsAnswer = {
            title: `${player.name || resolvedQuery} stats`,
            text: sportsData.length
              ? `Nexora found football statistics for ${player.name || resolvedQuery}.`
              : `The player was found, but no statistics were returned.`
          };
        }
      }
    }
  }

  // --------------------------------------------------
  // CLUB / PLAYER GENERAL SEARCH
  // --------------------------------------------------

  if (
    sportsEntity !== "general" &&
    !sportsData.length &&
    sportsIntent !== "sports_standings"
  ) {
    const searchTerm =
      resolvedQuery
        .replace(/\b(news|latest|stats|statistics|matches|match|scores|score)\b/gi, "")
        .trim();

    const wikiResults = await wikipediaSearch(searchTerm);

    sportsData = wikiResults.map(item => ({
      title: item.title,
      description: item.description,
      image: item.image,
      source: item.source,
      type: "knowledge"
    }));
  }

  // --------------------------------------------------
  // GENERAL WIKIPEDIA SEARCH
  // --------------------------------------------------

  let knowledgeResults = [];

  if (sportsEntity === "general") {
    knowledgeResults = await wikipediaSearch(q);
  }

  // --------------------------------------------------
  // COMBINE RESULTS
  // --------------------------------------------------

  const combinedResults = [
    ...sportsData,
    ...knowledgeResults
  ];

  // --------------------------------------------------
  // FINAL ANSWER
  // --------------------------------------------------

  if (!sportsAnswer && combinedResults.length) {
    const first = combinedResults[0];

    sportsAnswer = {
      title: first.title || q,
      text:
        first.description ||
        `Nexora found information about ${q}.`
    };
  }

  // --------------------------------------------------
  // RESPONSE
  // --------------------------------------------------

  return res.status(200).json({
    success: true,

    apiVersion: "V14",

    query: q,

    understanding: {
      resolvedQuery,
      category:
        sportsEntity === "general"
          ? "general"
          : "sports",

      entityType: sportsEntity,

      intent:
        sportsEntity === "general"
          ? "knowledge"
          : sportsIntent,

      confidence:
        sportsEntity === "general"
          ? "medium"
          : "high"
    },

    activeSources: [
      ...(activeSportsSource
        ? ["Big Balls Sports Data"]
        : []),

      ...(knowledgeResults.length ||
          sportsData.some(x => x.source === "Wikipedia")
        ? ["Wikipedia"]
        : [])
    ],

    answer: sportsAnswer,

    results: combinedResults,

    sourceStatus: {
      liveSports:
        activeSportsSource,

      wikipedia:
        knowledgeResults.length > 0 ||
        sportsData.some(x => x.source === "Wikipedia")
    }
  });
}
