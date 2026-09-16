export default async function handler(req, res) {

  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({
      success: false,
      error: "please provide a search query"
    });
  }

  const originalQuery = q;

  const query = q
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();


  // =========================================================
  // ALIASES
  // =========================================================

  const aliases = {

    "cr7": "cristiano ronaldo",
    "ronaldo": "cristiano ronaldo",

    "messi": "lionel messi",

    "mbappe": "kylian mbappe",
    "mbappé": "kylian mbappe",

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


  const normalizedQuery =
    aliases[query] || query;


  // =========================================================
  // FETCH HELPER
  // =========================================================

  async function fetchJSON(url, options = {}) {

    try {

      const response = await fetch(url, options);

      const text = await response.text();

      let data = null;

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


  // =========================================================
  // BIG BALLS SPORTS API
  // =========================================================

  const BBS_KEY = process.env.BBS_API_KEY;


  async function bbsRequest(path) {

    if (!BBS_KEY) {

      return {
        ok: false,
        data: null,
        error: "BBS_API_KEY missing"
      };

    }


    return fetchJSON(
      `https://api.bigballsdata.com${path}`,
      {
        headers: {
          Authorization: `Bearer ${BBS_KEY}`,
          "User-Agent": "Nexora/15.2"
        }
      }
    );

  }


  // =========================================================
  // WIKIPEDIA
  // =========================================================

  async function wikipediaSearch(searchTerm) {

    const url =
      `https://en.wikipedia.org/w/api.php` +
      `?action=query` +
      `&list=search` +
      `&srsearch=${encodeURIComponent(searchTerm)}` +
      `&srlimit=8` +
      `&format=json` +
      `&origin=*`;

    return fetchJSON(url);

  }


  // =========================================================
  // ENTITY DATABASE
  // =========================================================

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


  // =========================================================
  // INTENT DETECTION
  // =========================================================

  function detectIntent(text) {

    // -------------------------------------------------------
    // HOW TO
    // -------------------------------------------------------

    if (
      /^(how to|how do i|how can i|how can you|steps to|ways to|guide to)\b/i
        .test(text)
    ) {

      return "how_to";

    }


    // -------------------------------------------------------
    // SPORTS STANDINGS
    // -------------------------------------------------------

    if (
      /\b(standings|table|league table|positions|position)\b/i
        .test(text)
      &&
      competitions.some(competition =>
        text.includes(competition)
      )
    ) {

      return "sports_standings";

    }


    // -------------------------------------------------------
    // SPORTS MATCHES
    // -------------------------------------------------------

    if (
      /\b(matches|fixtures|games|schedule|next match|next game|upcoming)\b/i
        .test(text)
      &&
      (
        footballClubs.some(club =>
          text.includes(club)
        )
        ||
        competitions.some(competition =>
          text.includes(competition)
        )
      )
    ) {

      return "sports_matches";

    }


    // -------------------------------------------------------
    // PLAYER STATS
    // -------------------------------------------------------

    if (
      /\b(stats|statistics|goals|assists|appearances|records)\b/i
        .test(text)
      &&
      people.some(person =>
        text.includes(person)
      )
    ) {

      return "player_stats";

    }


    // -------------------------------------------------------
    // SPORTS NEWS
    // -------------------------------------------------------

    if (
      /\b(news|latest|today|transfer|injury|injured|breaking)\b/i
        .test(text)
      &&
      (
        people.some(person =>
          text.includes(person)
        )
        ||
        footballClubs.some(club =>
          text.includes(club)
        )
        ||
        competitions.some(competition =>
          text.includes(competition)
        )
      )
    ) {

      return "sports_news";

    }


    // -------------------------------------------------------
    // PRODUCT
    // -------------------------------------------------------

    if (
      products.some(product =>
        text.includes(product)
      )
      ||
      /\b(samsung|iphone|galaxy|playstation|xbox|laptop|phone|tablet|tv)\b/i
        .test(text)
    ) {

      return "product";

    }


    // -------------------------------------------------------
    // ANIME / MANGA
    // -------------------------------------------------------

    if (
      anime.some(title =>
        text.includes(title)
      )
      ||
      /\b(anime|manga|manhwa|donghua)\b/i
        .test(text)
    ) {

      return "anime_manga";

    }


    // -------------------------------------------------------
    // PERSON
    // -------------------------------------------------------

    if (
      people.some(person =>
        text === person ||
        text.includes(person)
      )
    ) {

      return "person";

    }


    // -------------------------------------------------------
    // CLUB
    // -------------------------------------------------------

    if (
      footballClubs.some(club =>
        text === club ||
        text.includes(club)
      )
    ) {

      return "football_club";

    }


    // -------------------------------------------------------
    // COMPETITION
    // -------------------------------------------------------

    if (
      competitions.some(competition =>
        text === competition ||
        text.includes(competition)
      )
    ) {

      return "sports_competition";

    }


    return "general";

  }


  const intent = detectIntent(normalizedQuery);


  // =========================================================
  // HOW-TO ENGINE
  // =========================================================

  function buildHowTo(task) {

    const cleanTask = task
      .replace(/^how to\s+/i, "")
      .replace(/^how do i\s+/i, "")
      .replace(/^how can i\s+/i, "")
      .replace(/^how can you\s+/i, "")
      .replace(/^steps to\s+/i, "")
      .replace(/^ways to\s+/i, "")
      .replace(/^guide to\s+/i, "")
      .trim();


    const lowerTask = cleanTask.toLowerCase();


    // -------------------------------------------------------
    // BARB HAIR
    // -------------------------------------------------------

    if (
      lowerTask.includes("barb my hair") ||
      lowerTask.includes("cut my hair") ||
      lowerTask.includes("barb hair")
    ) {

      return {

        title: "How to barb your hair",

        task: cleanTask,

        type: "step_by_step",

        steps: [

          "Wash and dry your hair before starting.",

          "Choose the haircut style and guard length you want.",

          "Use the clipper to trim the sides and back gradually.",

          "Start with a longer guard and reduce the length carefully.",

          "Create the hairline and edges with a trimmer.",

          "Blend the different lengths so there are no harsh lines.",

          "Check both sides for symmetry.",

          "Brush away loose hair and clean the neckline."

        ]

      };

    }


    // -------------------------------------------------------
    // COOK RICE
    // -------------------------------------------------------

    if (
      lowerTask.includes("cook rice") ||
      lowerTask.includes("make rice")
    ) {

      return {

        title: "How to cook rice",

        task: cleanTask,

        type: "step_by_step",

        steps: [

          "Measure the rice you want to cook.",

          "Rinse the rice with clean water.",

          "Add the rice to a pot with the appropriate amount of water.",

          "Add salt and other ingredients you want.",

          "Bring the water to a boil.",

          "Reduce the heat and cover the pot.",

          "Cook until the rice becomes soft and the water is absorbed.",

          "Fluff the rice with a fork and serve."

        ]

      };

    }


    // -------------------------------------------------------
    // TIE
    // -------------------------------------------------------

    if (
      lowerTask.includes("tie a tie") ||
      lowerTask.includes("tie my tie")
    ) {

      return {

        title: "How to tie a tie",

        task: cleanTask,

        type: "step_by_step",

        steps: [

          "Place the tie around your neck with the wide end longer than the narrow end.",

          "Cross the wide end over the narrow end.",

          "Bring the wide end behind the narrow end.",

          "Bring it across the front again.",

          "Pull the wide end upward through the neck loop.",

          "Bring it down through the front knot.",

          "Tighten the knot and adjust it against your collar."

        ]

      };

    }


    // -------------------------------------------------------
    // SCREENSHOT
    // -------------------------------------------------------

    if (
      lowerTask.includes("screenshot") ||
      lowerTask.includes("take a screenshot")
    ) {

      return {

        title: "How to take a screenshot",

        task: cleanTask,

        type: "step_by_step",

        steps: [

          "On Windows, press Windows + Shift + S.",

          "Select the part of the screen you want to capture.",

          "The screenshot is copied to your clipboard.",

          "Open an app such as Paint or Messages.",

          "Press Ctrl + V to paste the screenshot.",

          "Save or send the image."

        ]

      };

    }


    // -------------------------------------------------------
    // GENERIC HOW-TO
    // -------------------------------------------------------

    return {

      title: `How to ${cleanTask}`,

      task: cleanTask,

      type: "step_by_step",

      steps: [

        `Start by preparing what you need for ${cleanTask}.`,

        `Follow the basic steps for ${cleanTask} carefully.`,

        "Check the result and make any necessary adjustments.",

        "If something does not work, try the previous step again and check the setup."

      ]

    };

  }


  let howTo = null;


  if (intent === "how_to") {

    howTo = buildHowTo(normalizedQuery);

  }


  // =========================================================
  // PRODUCT ENGINE
  // =========================================================

  let product = null;


  if (intent === "product") {

    let productName = normalizedQuery;


    if (
      query === "s24" ||
      query === "samsung s24"
    ) {

      productName = "Samsung Galaxy S24";

    }


    product = {

      name: productName,

      type: "technology_product"

    };

  }


  // =========================================================
  // SPORTS ENGINE
  // =========================================================

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


    // =======================================================
    // LEAGUE DETECTOR
    // =======================================================

    function getLeague(text) {

      if (
        text.includes("premier league") ||
        text.includes("epl")
      ) {

        return "epl";

      }


      if (
        text.includes("champions league") ||
        text.includes("ucl")
      ) {

        return "cl";

      }


      if (text.includes("la liga")) {

        return "laliga";

      }


      if (text.includes("serie a")) {

        return "serie_a";

      }


      if (text.includes("bundesliga")) {

        return "bundesliga";

      }


      if (text.includes("ligue 1")) {

        return "ligue1";

      }


      if (text.includes("mls")) {

        return "mls";

      }


      return null;

    }


    const league = getLeague(normalizedQuery);


    // =======================================================
    // STANDINGS
    // =======================================================

    if (intent === "sports_standings") {

      if (league) {

        const result = await bbsRequest(
          `/v1/standings?sport=football&league=${league}`
        );


        if (result.ok) {

          sports.live = true;

          sports.type = "standings";

          sports.league = league;

          sports.data = result.data;

        }

      }

    }


    // =======================================================
    // MATCHES / FIXTURES
    // =======================================================

    if (intent === "sports_matches") {

      if (league) {

        const result = await bbsRequest(
          `/v1/matches?sport=football&league=${league}&limit=20`
        );


        if (result.ok) {

          sports.live = true;

          sports.type = "matches";

          sports.league = league;

          sports.data = result.data;

        }

      }


      // -----------------------------------------------------
      // TEAM MATCHES
      // -----------------------------------------------------

      if (
        sports.live &&
        footballClubs.some(club =>
          normalizedQuery.includes(club)
        )
      ) {

        const wantedTeam =
          footballClubs.find(club =>
            normalizedQuery.includes(club)
          );


        sports.team = wantedTeam;


        const rows =
          sports.data?.data ||
          sports.data?.matches ||
          [];


        if (Array.isArray(rows)) {

          sports.data = {

            ...sports.data,

            data: rows.filter(match => {

              const homeName =
                String(
                  match?.home?.name ||
                  match?.home ||
                  ""
                ).toLowerCase();


              const awayName =
                String(
                  match?.away?.name ||
                  match?.away ||
                  ""
                ).toLowerCase();


              return (
                homeName.includes(wantedTeam) ||
                wantedTeam.includes(homeName) ||
                awayName.includes(wantedTeam) ||
                wantedTeam.includes(awayName)
              );

            })

          };

        }

      }

    }


    // =======================================================
    // PLAYER STATS
    // =======================================================

    if (intent === "player_stats") {

      const playerName =
        normalizedQuery
          .replace(/\s+stats$/i, "")
          .replace(/\s+statistics$/i, "")
          .trim();


      const playerSearch = await bbsRequest(
        `/v1/players?sport=football&search=${encodeURIComponent(playerName)}`
      );


      if (playerSearch.ok) {

        const players =
          playerSearch.data?.data ||
          playerSearch.data?.players ||
          [];


        if (
          Array.isArray(players) &&
          players.length > 0
        ) {

          // Exact-name match first
          const exactPlayer =
            players.find(player => {

              const name =
                String(
                  player?.name ||
                  player?.full_name ||
                  ""
                ).toLowerCase();

              return name === playerName;

            });


          const player =
            exactPlayer || players[0];


          const playerId =
            player?.id ||
            player?.player_id;


          if (playerId) {

            const stats = await bbsRequest(
              `/v1/players/${playerId}/stats?sport=football`
            );


            if (stats.ok) {

              sports.live = true;

              sports.type = "player_stats";

              sports.player = player;

              sports.data = stats.data;

            }

          }

        }

      }

    }


    // =======================================================
    // SPORTS NEWS
    // =======================================================

    if (intent === "sports_news") {

      sports.type = "news";

      sports.message =
        "Nexora recognized this as a sports news search.";

    }

  }


  // =========================================================
  // ENTITY-FIRST PEOPLE
  // =========================================================

  let entity = {

    type: intent,

    name: normalizedQuery

  };


  if (query === "ronaldo" || query === "cr7") {

    entity = {

      type: "person",

      name: "Cristiano Ronaldo",

      canonicalName: "Cristiano Ronaldo",

      wikimediaTitle: "Cristiano Ronaldo"

    };

  }


  if (query === "messi") {

    entity = {

      type: "person",

      name: "Lionel Messi",

      canonicalName: "Lionel Messi",

      wikimediaTitle: "Lionel Messi"

    };

  }


  // =========================================================
  // WIKIPEDIA
  // =========================================================

  let wikipedia = null;


  /*
    IMPORTANT:

    Recognized sports/how-to/product requests should NOT
    randomly fall through to Wikipedia when the main engine
    already understands the query.
  */

  const shouldUseWikipedia =
    intent === "general" ||
    intent === "person" ||
    intent === "football_club" ||
    intent === "sports_competition" ||
    intent === "anime_manga";


  if (shouldUseWikipedia) {

    const wikiSearchTerm =
      entity.wikimediaTitle ||
      normalizedQuery;


    const wiki =
      await wikipediaSearch(wikiSearchTerm);


    if (wiki.ok) {

      wikipedia =
        wiki.data?.query?.search?.slice(0, 8) || [];

    }

  }


  // =========================================================
  // ACTIVE SOURCES
  // =========================================================

  const activeSources = [];


  if (sports?.live) {

    activeSources.push(
      "Big Balls Sports Data"
    );

  }


  if (wikipedia) {

    activeSources.push(
      "Wikipedia"
    );

  }


  if (intent === "how_to") {

    activeSources.push(
      "Nexora How-To Engine"
    );

  }


  if (intent === "product") {

    activeSources.push(
      "Nexora Product Understanding"
    );

  }


  // =========================================================
  // ANSWER
  // =========================================================

  let answer = null;


  if (intent === "how_to") {

    answer = {

      title: howTo.title,

      type: "how_to",

      steps: howTo.steps

    };

  }


  if (
    sports?.live &&
    sports.type === "standings"
  ) {

    answer = {

      title: `${sports.league} standings`,

      type: "sports_standings",

      data:
        sports.data?.data ||
        sports.data?.standings ||
        []

    };

  }


  if (
    sports?.live &&
    sports.type === "matches"
  ) {

    answer = {

      title: `${sports.league} fixtures`,

      type: "sports_matches",

      data:
        sports.data?.data ||
        sports.data?.matches ||
        []

    };

  }


  if (
    sports?.live &&
    sports.type === "player_stats"
  ) {

    answer = {

      title:
        `${sports.player?.name || "Player"} statistics`,

      type: "player_stats",

      data:
        sports.data?.data ||
        sports.data?.stats ||
        sports.data

    };

  }


  // =========================================================
  // FINAL RESPONSE
  // =========================================================

  return res.status(200).json({

    success: true,

    apiVersion: "V15.2",

    query: originalQuery,

    normalizedQuery,


    understanding: {

      intent,

      confidence:
        intent === "general"
          ? "medium"
          : "high"

    },


    entity,


    howTo,


    product,


    sports,


    answer,


    wikipedia,


    activeSources,


    message:
      "Nexora V15.2 Intelligence Engine"

  });

}
