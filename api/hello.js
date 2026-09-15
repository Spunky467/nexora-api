export default async function handler(req, res) {
  const q = (req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({
      success: false,
      error: "Please provide a search query"
    });
  }

  const query = q.toLowerCase();

  // =========================
  // SPORTS DATABASE
  // =========================

  const players = [
    "cristiano ronaldo",
    "lionel messi",
    "kylian mbappe",
    "erling haaland",
    "vinicius junior",
    "jude bellingham",
    "mohamed salah",
    "neymar",
    "kevin de bruyne",
    "robert lewandowski"
  ];

  const clubs = [
    "arsenal",
    "chelsea",
    "liverpool",
    "manchester united",
    "manchester city",
    "real madrid",
    "barcelona",
    "bayern munich",
    "psg",
    "paris saint-germain",
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
    "fa cup",
    "world cup",
    "afcon",
    "europa league"
  ];

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
    "ucl": "champions league",
    "epl": "premier league",
    "barca": "barcelona",
    "rm": "real madrid",
    "man u": "manchester united",
    "man utd": "manchester united",
    "city": "manchester city"
  };

  const resolvedQuery = aliases[query] || query;

  // =========================
  // ENTITY TYPE
  // =========================

  let entityType = "general";

  if (players.includes(resolvedQuery)) {
    entityType = "football_player";
  } else if (clubs.includes(resolvedQuery)) {
    entityType = "football_club";
  } else if (competitions.includes(resolvedQuery)) {
    entityType = "football_competition";
  } else if (
    resolvedQuery.includes("football") ||
    resolvedQuery.includes("soccer") ||
    resolvedQuery.includes("basketball") ||
    resolvedQuery.includes("tennis") ||
    resolvedQuery.includes("formula 1") ||
    resolvedQuery.includes("f1")
  ) {
    entityType = "sport";
  }

  // =========================
  // INTENT
  // =========================

  let intent = "sports_general";

  if (
    query.includes("news") ||
    query.includes("latest") ||
    query.includes("transfer") ||
    query.includes("injury")
  ) {
    intent = "sports_news";
  } else if (
    query.includes("stats") ||
    query.includes("statistics") ||
    query.includes("goals") ||
    query.includes("assists") ||
    query.includes("records")
  ) {
    intent = "sports_stats";
  } else if (
    query.includes("table") ||
    query.includes("standings") ||
    query.includes("position")
  ) {
    intent = "sports_standings";
  } else if (
    query.includes("vs") ||
    query.includes("against") ||
    query.includes("match") ||
    query.includes("fixture")
  ) {
    intent = "sports_match";
  }

  // =========================
  // SOURCE HELPER
  // =========================

  async function safeJSON(response) {
    try {
      const text = await response.text();
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async function getSource(url) {
    try {
      const response = await fetch(url);
      return await safeJSON(response);
    } catch {
      return null;
    }
  }

  // =========================
  // EXTERNAL SOURCES
  // =========================

  const wikidataURL =
    "https://www.wikidata.org/w/api.php?action=wbsearchentities&search=" +
    encodeURIComponent(resolvedQuery) +
    "&language=en&format=json&origin=*";

  const wikipediaURL =
    "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
    encodeURIComponent(resolvedQuery) +
    "&format=json&origin=*";

  const [wikidata, wikipedia] = await Promise.all([
    getSource(wikidataURL),
    getSource(wikipediaURL)
  ]);

  // =========================
  // WIKIDATA
  // =========================

  const wikidataResults =
    wikidata?.search?.slice(0, 6).map(item => ({
      title: item.label || "",
      description: item.description || "",
      source: "Wikidata",
      url: item.concepturi || "",
      type: entityType
    })) || [];

  // =========================
  // WIKIPEDIA
  // =========================

  const wikipediaResults =
    wikipedia?.query?.search?.slice(0, 6).map(item => ({
      title: item.title || "",
      description: item.snippet
        ? item.snippet.replace(/<[^>]*>/g, "")
        : "",
      source: "Wikipedia",
      url:
        "https://en.wikipedia.org/wiki/" +
        encodeURIComponent(item.title.replace(/ /g, "_")),
      type: entityType
    })) || [];

  // =========================
  // SPORTS ANSWER
  // =========================

  let answerTitle = "Sports Search";
  let answerText = "";

  if (entityType === "football_player") {
    answerTitle = "Football Player";

    if (intent === "sports_stats") {
      answerText =
        resolvedQuery +
        " is being searched for player statistics, goals, assists and records.";
    } else if (intent === "sports_news") {
      answerText =
        resolvedQuery +
        " is being searched for the latest football news and updates.";
    } else {
      answerText =
        resolvedQuery +
        " is recognized by Nexora as a football player.";
    }
  }

  if (entityType === "football_club") {
    answerTitle = "Football Club";

    if (intent === "sports_news") {
      answerText =
        resolvedQuery +
        " is being searched for the latest club news and updates.";
    } else if (intent === "sports_match") {
      answerText =
        resolvedQuery +
        " is being searched for matches and fixtures.";
    } else if (intent === "sports_standings") {
      answerText =
        resolvedQuery +
        " is being searched for league position and standings.";
    } else {
      answerText =
        resolvedQuery +
        " is recognized by Nexora as a football club.";
    }
  }

  if (entityType === "football_competition") {
    answerTitle = "Football Competition";

    if (intent === "sports_standings") {
      answerText =
        resolvedQuery +
        " is being searched for tables and standings.";
    } else if (intent === "sports_match") {
      answerText =
        resolvedQuery +
        " is being searched for matches and fixtures.";
    } else {
      answerText =
        resolvedQuery +
        " is recognized by Nexora as a football competition.";
    }
  }

  if (entityType === "sport") {
    answerTitle = "Sport";
    answerText =
      resolvedQuery +
      " is recognized by Nexora as a sports-related search.";
  }

  if (entityType === "general") {
    answerTitle = "Sports Search";
    answerText =
      "Nexora found sports-related information for " +
      resolvedQuery +
      ".";
  }

  // =========================
  // COMBINE RESULTS
  // =========================

  const results = [
    ...wikidataResults,
    ...wikipediaResults
  ];

  // =========================
  // FINAL RESPONSE
  // =========================

  return res.status(200).json({
    success: true,

    apiVersion: "V13.2",

    query: q,

    resolvedQuery,

    understanding: {
      category: "sports",
      entityType,
      intent,
      confidence:
        entityType !== "general"
          ? "high"
          : "medium"
    },

    answer: {
      title: answerTitle,
      text: answerText
    },

    activeSources: [
      "Nexora Sports Engine",
      "Wikidata",
      "Wikipedia"
    ],

    results
  });
}
// Nexora live Sports connection
