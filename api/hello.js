export default async function handler(req, res) {
  const q = (req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({
      success: false,
      error: "Please provide a search query"
    });
  }

  const query = q.toLowerCase();

  // -----------------------------
  // SPORTS UNDERSTANDING
  // -----------------------------

  const footballPlayers = [
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

  const footballClubs = [
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

  let sportsType = "general";

  if (footballPlayers.some(player => query.includes(player))) {
    sportsType = "football_player";
  } else if (footballClubs.some(club => query.includes(club))) {
    sportsType = "football_club";
  } else if (competitions.some(comp => query.includes(comp))) {
    sportsType = "football_competition";
  } else if (
    query.includes("football") ||
    query.includes("soccer") ||
    query.includes("basketball") ||
    query.includes("tennis") ||
    query.includes("formula 1") ||
    query.includes("f1")
  ) {
    sportsType = "sport";
  }

  // -----------------------------
  // SPORTS INTENT
  // -----------------------------

  let sportsIntent = "sports_general";

  if (
    query.includes("news") ||
    query.includes("latest") ||
    query.includes("transfer") ||
    query.includes("injury")
  ) {
    sportsIntent = "sports_news";
  } else if (
    query.includes("stats") ||
    query.includes("statistics") ||
    query.includes("goals") ||
    query.includes("assists")
  ) {
    sportsIntent = "sports_stats";
  } else if (
    query.includes("table") ||
    query.includes("standings") ||
    query.includes("position")
  ) {
    sportsIntent = "sports_standings";
  } else if (
    query.includes("vs") ||
    query.includes("against") ||
    query.includes("match")
  ) {
    sportsIntent = "sports_match";
  }

  // -----------------------------
  // SOURCE HELPERS
  // -----------------------------

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

  // -----------------------------
  // EXTERNAL SOURCES
  // -----------------------------

  const wikidataURL =
    "https://www.wikidata.org/w/api.php?action=wbsearchentities&search=" +
    encodeURIComponent(q) +
    "&language=en&format=json&origin=*";

  const wikipediaURL =
    "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
    encodeURIComponent(q) +
    "&format=json&origin=*";

  const [wikidata, wikipedia] = await Promise.all([
    getSource(wikidataURL),
    getSource(wikipediaURL)
  ]);

  // -----------------------------
  // WIKIDATA RESULTS
  // -----------------------------

  const wikidataResults =
    wikidata?.search?.slice(0, 5).map(item => ({
      title: item.label || "",
      description: item.description || "",
      source: "Wikidata",
      url: item.concepturi || "",
      type: sportsType
    })) || [];

  // -----------------------------
  // WIKIPEDIA RESULTS
  // -----------------------------

  const wikipediaResults =
    wikipedia?.query?.search?.slice(0, 5).map(item => ({
      title: item.title || "",
      description: item.snippet
        ? item.snippet.replace(/<[^>]*>/g, "")
        : "",
      source: "Wikipedia",
      url:
        "https://en.wikipedia.org/wiki/" +
        encodeURIComponent(item.title.replace(/ /g, "_")),
      type: sportsType
    })) || [];

  // -----------------------------
  // LOCAL SPORTS ANSWER
  // -----------------------------

  let sportsAnswer = null;

  if (sportsType === "football_player") {
    sportsAnswer = {
      title: "Football Player",
      text: q + " appears to be a football player search.",
      intent: sportsIntent
    };
  }

  if (sportsType === "football_club") {
    sportsAnswer = {
      title: "Football Club",
      text: q + " appears to be a football club search.",
      intent: sportsIntent
    };
  }

  if (sportsType === "football_competition") {
    sportsAnswer = {
      title: "Football Competition",
      text: q + " appears to be a football competition search.",
      intent: sportsIntent
    };
  }

  if (sportsType === "sport") {
    sportsAnswer = {
      title: "Sports Search",
      text: q + " appears to be a sports-related search.",
      intent: sportsIntent
    };
  }

  // -----------------------------
  // COMBINE RESULTS
  // -----------------------------

  const results = [
    ...wikidataResults,
    ...wikipediaResults
  ];

  return res.status(200).json({
    success: true,

    apiVersion: "V13.1",

    query: q,

    understanding: {
      category: "sports",
      entityType: sportsType,
      intent: sportsIntent,
      confidence:
        sportsType !== "general" ? "high" : "medium"
    },

    sportsAnswer,

    activeSources: [
      "Nexora Sports Engine",
      "Wikidata",
      "Wikipedia"
    ],

    results
  });
}
