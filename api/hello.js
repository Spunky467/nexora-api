export default async function handler(req, res) {
  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({
      apiVersion: "V13",
      error: "Please provide a search query."
    });
  }

  const query = q.toLowerCase().replace(/\s+/g, " ").trim();

  // =========================
  // HELPERS
  // =========================

  function safeJSON(response) {
    return response.text().then(text => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    });
  }

  function clean(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // =========================
  // SPORTS KNOWLEDGE
  // =========================

  const footballClubs = [
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
    "psg",
    "paris saint-germain",
    "juventus",
    "inter milan",
    "ac milan",
    "napoli",
    "roma",
    "ajax",
    "benfica",
    "porto",
    "sporting cp"
  ];

  const footballCompetitions = [
    "premier league",
    "champions league",
    "uefa champions league",
    "europa league",
    "conference league",
    "la liga",
    "laliga",
    "serie a",
    "bundesliga",
    "ligue 1",
    "fa cup",
    "carabao cup",
    "copa del rey",
    "afcon",
    "africa cup of nations",
    "world cup",
    "fifa world cup",
    "euros",
    "uefa euro"
  ];

  const sports = [
    "football",
    "soccer",
    "basketball",
    "tennis",
    "boxing",
    "ufc",
    "mma",
    "cricket",
    "baseball",
    "formula 1",
    "f1",
    "golf",
    "athletics",
    "volleyball",
    "rugby",
    "wrestling",
    "cycling"
  ];

  const footballPlayers = [
    "cristiano ronaldo",
    "ronaldo",
    "lionel messi",
    "messi",
    "kylian mbappe",
    "mbappe",
    "erling haaland",
    "haaland",
    "neymar",
    "vinicius junior",
    "vinicius",
    "jude bellingham",
    "bellingham",
    "mohamed salah",
    "salah",
    "bukayo saka",
    "saka",
    "kevin de bruyne",
    "de bruyne",
    "robert lewandowski",
    "lewandowski"
  ];

  // =========================
  // SPORTS INTENT
  // =========================

  function detectSportsIntent(text) {
    if (
      text.includes("news") ||
      text.includes("latest") ||
      text.includes("transfer") ||
      text.includes("injury")
    ) {
      return "sports_news";
    }

    if (
      text.includes("goal") ||
      text.includes("goals") ||
      text.includes("assist") ||
      text.includes("assists") ||
      text.includes("stat") ||
      text.includes("stats") ||
      text.includes("record") ||
      text.includes("records")
    ) {
      return "sports_stats";
    }

    if (
      text.includes("match") ||
      text.includes("fixture") ||
      text.includes("fixtures") ||
      text.includes("game") ||
      text.includes("next")
    ) {
      return "sports_match";
    }

    if (
      text.includes("table") ||
      text.includes("standings") ||
      text.includes("ranking") ||
      text.includes("rankings")
    ) {
      return "sports_standings";
    }

    if (
      text.includes("squad") ||
      text.includes("players") ||
      text.includes("team")
    ) {
      return "sports_team";
    }

    return "sports_general";
  }

  function detectSportsEntity(text) {
    const player = footballPlayers.find(p =>
      text === p || text.includes(p)
    );

    if (player) {
      return {
        type: "football_player",
        name: player
      };
    }

    const club = footballClubs.find(c =>
      text === c || text.includes(c)
    );

    if (club) {
      return {
        type: "football_club",
        name: club
      };
    }

    const competition = footballCompetitions.find(c =>
      text === c || text.includes(c)
    );

    if (competition) {
      return {
        type: "football_competition",
        name: competition
      };
    }

    const sport = sports.find(s =>
      text === s || text.includes(s)
    );

    if (sport) {
      return {
        type: "sport",
        name: sport
      };
    }

    return null;
  }

  const sportsEntity = detectSportsEntity(query);
  const sportsIntent = detectSportsIntent(query);

  // =========================
  // ALIASES
  // =========================

  const aliases = {
    cr7: "cristiano ronaldo",
    ronaldo: "cristiano ronaldo",
    messi: "lionel messi",
    psg: "paris saint-germain",
    ucl: "champions league",
    epl: "premier league",
    rm: "real madrid",
    barca: "barcelona",
    manu: "manchester united",
    man u: "manchester united",
    city: "manchester city"
  };

  const resolvedQuery = aliases[query] || query;

  // =========================
  // EXTERNAL SOURCES
  // =========================

  const wikidataURL =
    "https://www.wikidata.org/w/api.php?action=wbsearchentities" +
    "&search=" +
    encodeURIComponent(resolvedQuery) +
    "&language=en&format=json&limit=8&origin=*";

  const wikipediaURL =
    "https://en.wikipedia.org/w/api.php?action=query" +
    "&generator=search&gsrsearch=" +
    encodeURIComponent(resolvedQuery) +
    "&gsrnamespace=0&gsrlimit=8" +
    "&prop=pageimages|extracts|info" +
    "&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=500" +
    "&inprop=url&format=json&origin=*";

  const openLibraryURL =
    "https://openlibrary.org/search.json?q=" +
    encodeURIComponent(resolvedQuery) +
    "&limit=8";

  const countriesURL =
    "https://restcountries.com/v3.1/name/" +
    encodeURIComponent(resolvedQuery);

  // =========================
  // FETCH EVERYTHING
  // =========================

  const responses = await Promise.allSettled([
    fetch(wikidataURL),
    fetch(wikipediaURL),
    fetch(openLibraryURL),
    fetch(countriesURL)
  ]);

  const data = await Promise.all(
    responses.map(result => {
      if (result.status !== "fulfilled") {
        return null;
      }

      return safeJSON(result.value);
    })
  );

  const [wikidata, wikipedia, books, countryData] = data;

  // =========================
  // RESULT ARRAYS
  // =========================

  const results = [];

  // =========================
  // WIKIDATA
  // =========================

  if (wikidata?.search) {
    wikidata.search.forEach(item => {
      results.push({
        title: clean(item.label),
        description: clean(item.description),
        url: item.concepturi || "",
        source: "Wikidata",
        type: "knowledge",
        match: clean(item.match?.text || "")
      });
    });
  }

  // =========================
  // WIKIPEDIA
  // =========================

  if (wikipedia?.query?.pages) {
    Object.values(wikipedia.query.pages).forEach(page => {
      results.push({
        title: clean(page.title),
        description: clean(page.extract),
        url:
          page.fullurl ||
          `https://en.wikipedia.org/wiki/${encodeURIComponent(
            page.title.replace(/ /g, "_")
          )}`,
        image:
          page.thumbnail?.source || null,
        source: "Wikipedia",
        type: "knowledge"
      });
    });
  }

  // =========================
  // OPEN LIBRARY
  // =========================

  if (books?.docs) {
    books.docs.slice(0, 8).forEach(book => {
      results.push({
        title: clean(book.title),
        description: clean(
          `${(book.author_name || []).slice(0, 2).join(", ")}${
            book.first_publish_year
              ? ` • ${book.first_publish_year}`
              : ""
          }`
        ),
        url: book.key
          ? `https://openlibrary.org${book.key}`
          : "",
        source: "Open Library",
        type: "book"
      });
    });
  }

  // =========================
  // COUNTRIES
  // =========================

  if (Array.isArray(countryData)) {
    countryData.slice(0, 5).forEach(country => {
      results.push({
        title: clean(country.name?.common),
        description: clean(
          `${country.region || ""} • ${
            country.capital?.[0] || "No capital listed"
          }`
        ),
        url:
          country.maps?.googleMaps ||
          `https://en.wikipedia.org/wiki/${encodeURIComponent(
            country.name?.common || ""
          )}`,
        image: country.flags?.png || null,
        source: "REST Countries",
        type: "country"
      });
    });
  }

  // =========================
  // ENTITY TYPE DETECTOR
  // =========================

  function detectEntityType(item) {
    const text = (
      `${item.title} ${item.description} ${item.match || ""}`
    ).toLowerCase();

    if (
      text.includes("football club") ||
      text.includes("association football club") ||
      footballClubs.some(c => text.includes(c))
    ) {
      return "football_club";
    }

    if (
      text.includes("footballer") ||
      text.includes("football player") ||
      text.includes("soccer player")
    ) {
      return "football_player";
    }

    if (
      text.includes("football competition") ||
      text.includes("football tournament") ||
      footballCompetitions.some(c => text.includes(c))
    ) {
      return "football_competition";
    }

    if (
      text.includes("basketball player") ||
      text.includes("tennis player") ||
      text.includes("boxer") ||
      text.includes("athlete")
    ) {
      return "sports_person";
    }

    if (text.includes("country") || item.type === "country") {
      return "country";
    }

    if (item.type === "book") {
      return "book";
    }

    if (
      text.includes("human") ||
      text.includes("person") ||
      text.includes("actor") ||
      text.includes("singer")
    ) {
      return "person";
    }

    return "general";
  }

  // =========================
  // ENTITY SCORING
  // =========================

  function entityScore(item) {
    const title = clean(item.title).toLowerCase();
    const description = clean(item.description).toLowerCase();

    let score = 0;

    if (title === resolvedQuery) score += 100;

    if (title.startsWith(resolvedQuery)) score += 60;

    if (title.includes(resolvedQuery)) score += 35;

    if (description.includes(resolvedQuery)) score += 15;

    if (
      sportsEntity &&
      detectEntityType(item) === sportsEntity.type
    ) {
      score += 35;
    }

    if (
      sportsEntity &&
      title.includes(sportsEntity.name)
    ) {
      score += 50;
    }

    if (
      sportsEntity &&
      description.includes(sportsEntity.name)
    ) {
      score += 20;
    }

    return score;
  }

  // =========================
  // RANK RESULTS
  // =========================

  results.forEach(item => {
    item.entityType = detectEntityType(item);
    item.score = entityScore(item);

    // Strong boost for sports searches
    if (sportsEntity) {
      if (
        item.entityType === sportsEntity.type
      ) {
        item.score += 50;
      }

      if (
        item.title.toLowerCase().includes(sportsEntity.name)
      ) {
        item.score += 30;
      }
    }
  });

  results.sort((a, b) => b.score - a.score);

  // Remove duplicate titles
  const uniqueResults = [];
  const seenTitles = new Set();

  for (const item of results) {
    const key = item.title.toLowerCase();

    if (!key || seenTitles.has(key)) continue;

    seenTitles.add(key);
    uniqueResults.push(item);
  }

  // =========================
  // TOP ENTITY
  // =========================

  const topEntity = uniqueResults.length
    ? uniqueResults[0]
    : null;

  const secondEntity =
    uniqueResults.length > 1
      ? uniqueResults[1]
      : null;

  let confidence = "low";

  if (topEntity) {
    if (topEntity.score >= 120) {
      confidence = "high";
    } else if (topEntity.score >= 70) {
      confidence = "medium";
    }
  }

  // =========================
  // SPORTS UNDERSTANDING
  // =========================

  let understanding = {
    query: q,
    normalizedQuery: resolvedQuery,
    entity: topEntity
      ? topEntity.title
      : sportsEntity?.name || null,
    entityType: sportsEntity
      ? sportsEntity.type
      : topEntity?.entityType || "unknown",
    confidence,
    intent: sportsEntity
      ? sportsIntent
      : "general_search"
  };

  // =========================
  // SPORTS ANSWER
  // =========================

  let sportsAnswer = null;

  if (sportsEntity) {
    if (sportsEntity.type === "football_player") {
      sportsAnswer = {
        title: sportsEntity.name,
        category: "Football Player",
        intent: sportsIntent,
        message:
          `Nexora identified ${sportsEntity.name} as a football player.`
      };
    }

    if (sportsEntity.type === "football_club") {
      sportsAnswer = {
        title: sportsEntity.name,
        category: "Football Club",
        intent: sportsIntent,
        message:
          `Nexora identified ${sportsEntity.name} as a football club.`
      };
    }

    if (sportsEntity.type === "football_competition") {
      sportsAnswer = {
        title: sportsEntity.name,
        category: "Football Competition",
        intent: sportsIntent,
        message:
          `Nexora identified ${sportsEntity.name} as a football competition.`
      };
    }

    if (sportsEntity.type === "sport") {
      sportsAnswer = {
        title: sportsEntity.name,
        category: "Sport",
        intent: sportsIntent,
        message:
          `Nexora identified ${sportsEntity.name} as a sport.`
      };
    }
  }

  // =========================
  // ACTIVE SOURCES
  // =========================

  const activeSources = [];

  if (wikidata?.search?.length) {
    activeSources.push("Wikidata");
  }

  if (wikipedia?.query?.pages) {
    activeSources.push("Wikipedia");
  }

  if (books?.docs?.length) {
    activeSources.push("Open Library");
  }

  if (Array.isArray(countryData)) {
    activeSources.push("REST Countries");
  }

  if (sportsEntity) {
    activeSources.push("Nexora Sports Engine");
  }

  // =========================
  // FINAL RESPONSE
  // =========================

  return res.status(200).json({
    apiVersion: "V13",

    query: q,

    understanding,

    sports: {
      detected: !!sportsEntity,
      entity: sportsEntity,
      intent: sportsEntity
        ? sportsIntent
        : null,
      answer: sportsAnswer
    },

    activeSources,

    sources: {
      wikidata: !!wikidata?.search,
      wikipedia: !!wikipedia?.query?.pages,
      openLibrary: !!books?.docs,
      countries: Array.isArray(countryData)
    },

    results: uniqueResults.slice(0, 20)
  });
}
