export default async function handler(req, res) {
  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({
      success: false,
      error: "please provide a search query"
    });
  }

  const originalQuery = q;
  const query = q.toLowerCase().replace(/\s+/g, " ").trim();

  // =========================
  // ALIASES
  // =========================

  const aliases = {
    "cr7": "cristiano ronaldo",
    "ronaldo": "cristiano ronaldo",
    "messi": "lionel messi",
    "mbappe": "kylian mbappe",
    "haaland": "erling haaland",

    "psg": "paris saint-germain",
    "barca": "barcelona",
    "barça": "barcelona",
    "rm": "real madrid",
    "man u": "manchester united",
    "man utd": "manchester united",
    "manchester utd": "manchester united",
    "city": "manchester city",
    "man city": "manchester city",

    "epl": "premier league",
    "ucl": "champions league",

    "s24": "samsung galaxy s24",
    "samsung s24": "samsung galaxy s24"
  };

  const normalizedQuery = aliases[query] || query;

  // =========================
  // SOURCE HELPER
  // =========================

  async function fetchJSON(url, options = {}) {
    try {
      const response = await fetch(url, options);
      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        return {
          ok: false,
          status: response.status,
          data: null
        };
      }

      return {
        ok: response.ok,
        status: response.status,
        data
      };

    } catch (error) {
      return {
        ok: false,
        status: null,
        data: null,
        error: error.message
      };
    }
  }

  // =========================
  // SPORTS API
  // =========================

  const BBS_KEY = process.env.BBS_API_KEY;

  async function bbsRequest(path) {
    if (!BBS_KEY) {
      return {
        ok: false,
        data: null
      };
    }

    return fetchJSON(
      `https://api.bigballsdata.com${path}`,
      {
        headers: {
          Authorization: `Bearer ${BBS_KEY}`,
          "User-Agent": "Nexora/15.0"
        }
      }
    );
  }

  // =========================
  // WIKIPEDIA
  // =========================

  async function wikipediaSearch(searchTerm) {
    const url =
      `https://en.wikipedia.org/w/api.php` +
      `?action=query` +
      `&list=search` +
      `&srsearch=${encodeURIComponent(searchTerm)}` +
      `&format=json` +
      `&origin=*`;

    return fetchJSON(url);
  }

  // =========================
  // ENTITY DATABASE
  // =========================

  const people = [
    "cristiano ronaldo",
    "lionel messi",
    "kylian mbappe",
    "erling haaland",
    "lebron james",
    "michael jordan",
    "elon musk",
    "warren buffett"
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
    "psg",
    "juventus",
    "inter milan",
    "ac milan"
  ];

  const competitions = [
    "premier league",
    "champions league",
    "la liga",
    "serie a",
    "bundesliga",
    "ligue 1",
    "mls"
  ];

  const products = [
    "samsung galaxy s24",
    "samsung galaxy s24 ultra",
    "samsung galaxy s24 plus",
    "iphone 15",
    "iphone 15 pro",
    "iphone 15 pro max",
    "iphone 16",
    "iphone 16 pro",
    "iphone 16 pro max",
    "playstation 5",
    "xbox series x",
    "xbox series s"
  ];

  const anime = [
    "demon slayer",
    "one piece",
    "naruto",
    "dragon ball",
    "bleach",
    "jujutsu kaisen",
    "solo leveling",
    "martial universe",
    "the great ruler"
  ];

  // =========================
  // INTENT DETECTION
  // =========================

  function detectIntent(text) {

    // HOW-TO
    if (
      /^(how to|how do i|how can i|how can you|steps to|ways to)/i.test(text) ||
      /\b(how do|how can)\b/i.test(text)
    ) {
      return "how_to";
    }

    // SPORTS STANDINGS
    if (
      /\b(table|standings|league table|position|positions)\b/i.test(text) &&
      (
        text.includes("premier league") ||
        text.includes("epl") ||
        text.includes("champions league") ||
        text.includes("la liga") ||
        text.includes("serie a") ||
        text.includes("bundesliga") ||
        text.includes("ligue 1")
      )
    ) {
      return "sports_standings";
    }

    // PLAYER STATS
    if (
      /\b(stats|statistics|goals|assists|appearances|records)\b/i.test(text) &&
      people.some(person => text.includes(person))
    ) {
      return "player_stats";
    }

    // SPORTS MATCHES
    if (
      /\b(matches|fixtures|games|next game|next match|schedule)\b/i.test(text) &&
      (
        footballClubs.some(club => text.includes(club)) ||
        competitions.some(competition => text.includes(competition))
      )
    ) {
      return "sports_matches";
    }

    // SPORTS NEWS
    if (
      /\b(news|latest|today|transfer|injury|injured|breaking)\b/i.test(text) &&
      (
        people.some(person => text.includes(person)) ||
        footballClubs.some(club => text.includes(club)) ||
        competitions.some(competition => text.includes(competition))
      )
    ) {
      return "sports_news";
    }

    // PRODUCT
    if (
      products.some(product => text.includes(product)) ||
      /\b(samsung|iphone|galaxy|playstation|xbox|laptop|phone|tablet|tv)\b/i.test(text)
    ) {
      return "product";
    }

    // ANIME / MANGA
    if (
      anime.some(title => text.includes(title)) ||
      /\b(anime|manga|manhwa|donghua)\b/i.test(text)
    ) {
      return "anime_manga";
    }

    // PERSON
    if (people.some(person => text === person || text.includes(person))) {
      return "person";
    }

    // FOOTBALL CLUB
    if (footballClubs.some(club => text === club || text.includes(club))) {
      return "football_club";
    }

    // COMPETITION
    if (competitions.some(competition => text === competition || text.includes(competition))) {
      return "sports_competition";
    }

    return "general";
  }

  const intent = detectIntent(normalizedQuery);

  // =========================
  // HOW-TO UNDERSTANDING
  // =========================

  let howTo = null;

  if (intent === "how_to") {

    let task = normalizedQuery
      .replace(/^how to\s+/i, "")
      .replace(/^how do i\s+/i, "")
      .replace(/^how can i\s+/i, "")
      .replace(/^how can you\s+/i, "")
      .replace(/^steps to\s+/i, "")
      .replace(/^ways to\s+/i, "")
      .trim();

    howTo = {
      title: `How to ${task}`,
      task: task,
      type: "step_by_step"
    };
  }

  // =========================
  // PRODUCT UNDERSTANDING
  // =========================

  let product = null;

  if (intent === "product") {

    let productName = normalizedQuery;

    if (query === "s24" || query === "samsung s24") {
      productName = "Samsung Galaxy S24";
    }

    product = {
      name: productName,
      type: "technology_product"
    };
  }

  // =========================
  // SPORTS
  // =========================

  let sports = null;

  if (
    intent === "sports_standings" ||
    intent === "sports_matches" ||
    intent === "player_stats" ||
    intent === "sports_news"
  ) {

    sports = {
      live: false,
      intent: intent,
      source: "Big Balls Sports Data"
    };

    // STANDINGS
    if (intent === "sports_standings") {

      let league = null;

      if (
        normalizedQuery.includes("premier league") ||
        normalizedQuery.includes("epl")
      ) {
        league = "epl";
      }

      if (normalizedQuery.includes("champions league")) {
        league = "ucl";
      }

      if (normalizedQuery.includes("la liga")) {
        league = "laliga";
      }

      if (normalizedQuery.includes("serie a")) {
        league = "seriea";
      }

      if (normalizedQuery.includes("bundesliga")) {
        league = "bundesliga";
      }

      if (normalizedQuery.includes("ligue 1")) {
        league = "ligue1";
      }

      if (league) {
        const result = await bbsRequest(
          `/v1/standings?sport=football&league=${league}`
        );

        if (result.ok) {
          sports.live = true;
          sports.data = result.data;
          sports.league = league;
        }
      }
    }

    // MATCHES
    if (intent === "sports_matches") {

      const result = await bbsRequest(
        `/v1/matches?sport=football&limit=20`
      );

      if (result.ok) {
        sports.live = true;
        sports.data = result.data;
      }
    }

    // PLAYER STATS
    if (intent === "player_stats") {

      const playerSearch = await bbsRequest(
        `/v1/players?sport=football&search=${encodeURIComponent(normalizedQuery.replace(/\s+stats$/i, ""))}`
      );

      if (playerSearch.ok) {

        sports.playerSearch = playerSearch.data;

        let players =
          playerSearch.data?.data ||
          playerSearch.data?.players ||
          [];

        if (Array.isArray(players) && players.length > 0) {

          const player = players[0];

          const playerId =
            player.id ||
            player.player_id;

          if (playerId) {

            const stats = await bbsRequest(
              `/v1/players/${playerId}/stats?sport=football`
            );

            if (stats.ok) {
              sports.live = true;
              sports.player = player;
              sports.data = stats.data;
            }
          }
        }
      }
    }
  }

  // =========================
  // WIKIPEDIA FALLBACK
  // =========================

  let wikipedia = null;

  if (!sports?.live) {

    const wiki = await wikipediaSearch(normalizedQuery);

    if (wiki.ok) {

      wikipedia =
        wiki.data?.query?.search?.slice(0, 8) || [];
    }
  }

  // =========================
  // RESPONSE
  // =========================

  const activeSources = [];

  if (sports?.live) {
    activeSources.push("Big Balls Sports Data");
  }

  if (wikipedia) {
    activeSources.push("Wikipedia");
  }

  if (intent === "how_to") {
    activeSources.push("Nexora How-To Engine");
  }

  if (intent === "product") {
    activeSources.push("Nexora Product Understanding");
  }

  return res.status(200).json({

    success: true,

    apiVersion: "V15.0",

    query: originalQuery,

    normalizedQuery,

    understanding: {
      intent,
      confidence:
        intent === "general"
          ? "medium"
          : "high"
    },

    entity: {
      type: intent,
      name: normalizedQuery
    },

    howTo,

    product,

    sports,

    wikipedia,

    activeSources,

    message: "Nexora V15 Intelligence Engine"
  });
}
