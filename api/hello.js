export default async function handler(req, res) {

  // =========================================================
  // CORS
  // =========================================================

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }


  // =========================================================
  // QUERY
  // =========================================================

  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({
      success: false,
      error: "please provide a search query"
    });
  }

  const originalQuery = q;

  const query =
    q
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


  let normalizedQuery =
    aliases[query] || query;


  if (!aliases[query]) {

    normalizedQuery =
      normalizedQuery

        .replace(/\bcr7\b/gi, "cristiano ronaldo")

        .replace(
          /\bcristiano\s+ronaldo\b/gi,
          "cristiano ronaldo"
        )

        .replace(
          /\bronaldinho\b/gi,
          "ronaldinho"
        )

        .replace(
          /(?<!cristiano\s)\bronaldo\b/gi,
          "cristiano ronaldo"
        )

        .replace(
          /\bmessi\b/gi,
          "lionel messi"
        )

        .replace(
          /\bmbappé\b/gi,
          "kylian mbappe"
        )

        .replace(
          /\bmbappe\b/gi,
          "kylian mbappe"
        )

        .replace(
          /\bhaaland\b/gi,
          "erling haaland"
        )

        .replace(/\s+/g, " ")
        .trim();
  }


  // =========================================================
  // FETCH HELPER
  // =========================================================

  async function fetchJSON(url, options = {}) {

    try {

      const response =
        await fetch(url, options);

      const text =
        await response.text();

      let data = null;

      try {

        data =
          JSON.parse(text);

      } catch {

        return {
          ok: false,
          status: response.status,
          data: null,
          error: "Invalid JSON response"
        };

      }


      return {

        ok: response.ok,

        status:
          response.status,

        data

      };

    } catch (error) {

      return {

        ok: false,

        status: null,

        data: null,

        error:
          error.message

      };

    }

  }


  // =========================================================
  // BIG BALLS SPORTS DATA
  // =========================================================

  const BBS_KEY =
    process.env.BBS_API_KEY;


  async function bbsRequest(path) {

    if (!BBS_KEY) {

      return {

        ok: false,

        data: null,

        error:
          "BBS_API_KEY missing"

      };

    }


    return fetchJSON(

      `https://api.bigballsdata.com${path}`,

      {

        headers: {

          Authorization:
            `Bearer ${BBS_KEY}`,

          "User-Agent":
            "Nexora/15.7"

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

    if (
      /^(how to|how do i|how can i|how can you|steps to|ways to|guide to)\b/i
        .test(text)
    ) {

      return "how_to";

    }


    if (

      /\b(
        standings|
        table|
        league table|
        positions|
        position
      )\b/ix.test(text)

      &&

      competitions.some(
        x => text.includes(x)
      )

    ) {

      return "sports_standings";

    }


    if (

      /\b(
        matches|
        fixtures|
        games|
        schedule|
        next match|
        next game|
        upcoming
      )\b/ix.test(text)

      &&

      (

        footballClubs.some(
          x => text.includes(x)
        )

        ||

        competitions.some(
          x => text.includes(x)
        )

      )

    ) {

      return "sports_matches";

    }


    if (

      /\b(
        stats|
        statistics|
        goals|
        assists|
        appearances|
        records
      )\b/ix.test(text)

      &&

      people.some(
        x => text.includes(x)
      )

    ) {

      return "player_stats";

    }


    if (

      /\b(
        news|
        latest|
        today|
        transfer|
        injury|
        injured|
        breaking
      )\b/ix.test(text)

      &&

      (

        people.some(
          x => text.includes(x)
        )

        ||

        footballClubs.some(
          x => text.includes(x)
        )

        ||

        competitions.some(
          x => text.includes(x)
        )

      )

    ) {

      return "sports_news";

    }


    if (

      products.some(
        x => text.includes(x)
      )

      ||

      /\b(
        samsung|
        iphone|
        galaxy|
        playstation|
        xbox|
        laptop|
        phone|
        tablet|
        tv
      )\b/ix.test(text)

    ) {

      return "product";

    }


    if (

      anime.some(
        x => text.includes(x)
      )

      ||

      /\b(
        anime|
        manga|
        manhwa|
        donghua
      )\b/ix.test(text)

    ) {

      return "anime_manga";

    }


    if (
      people.some(
        x =>
          text === x ||
          text.includes(x)
      )
    ) {

      return "person";

    }


    if (
      footballClubs.some(
        x =>
          text === x ||
          text.includes(x)
      )
    ) {

      return "football_club";

    }


    if (
      competitions.some(
        x =>
          text === x ||
          text.includes(x)
      )
    ) {

      return "sports_competition";

    }


    return "general";

  }


  const intent =
    detectIntent(normalizedQuery);


  // =========================================================
  // HOW-TO ENGINE
  // =========================================================

  function buildHowTo(task) {

    const cleanTask =

      task

        .replace(
          /^how to\s+/i,
          ""
        )

        .replace(
          /^how do i\s+/i,
          ""
        )

        .replace(
          /^how can i\s+/i,
          ""
        )

        .replace(
          /^how can you\s+/i,
          ""
        )

        .replace(
          /^steps to\s+/i,
          ""
        )

        .replace(
          /^ways to\s+/i,
          ""
        )

        .replace(
          /^guide to\s+/i,
          ""
        )

        .trim();


    const lower =
      cleanTask.toLowerCase();


    if (

      lower.includes("barb my hair")

      ||

      lower.includes("cut my hair")

      ||

      lower.includes("barb hair")

    ) {

      return {

        title:
          "How to barb your hair",

        task:
          cleanTask,

        type:
          "step_by_step",

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


    if (

      lower.includes("cook rice")

      ||

      lower.includes("make rice")

    ) {

      return {

        title:
          "How to cook rice",

        task:
          cleanTask,

        type:
          "step_by_step",

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


    if (

      lower.includes("tie a tie")

      ||

      lower.includes("tie my tie")

    ) {

      return {

        title:
          "How to tie a tie",

        task:
          cleanTask,

        type:
          "step_by_step",

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


    if (

      lower.includes("screenshot")

      ||

      lower.includes("take a screenshot")

    ) {

      return {

        title:
          "How to take a screenshot",

        task:
          cleanTask,

        type:
          "step_by_step",

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


    return {

      title:
        `How to ${cleanTask}`,

      task:
        cleanTask,

      type:
        "step_by_step",

      steps: [

        `Start by preparing what you need for ${cleanTask}.`,

        `Follow the basic steps for ${cleanTask} carefully.`,

        "Check the result and make any necessary adjustments.",

        "If something does not work, try the previous step again and check the setup."

      ]

    };

  }


  const howTo =
    intent === "how_to"
      ? buildHowTo(normalizedQuery)
      : null;


  // =========================================================
  // PRODUCT ENGINE
  // =========================================================

  let product = null;


  if (intent === "product") {

    let productName =
      normalizedQuery;


    if (
      query === "s24"

      ||

      query === "samsung s24"
    ) {

      productName =
        "Samsung Galaxy S24";

    }


    product = {

      name:
        productName,

      type:
        "technology_product"

    };

  }


  // =========================================================
  // NUMBER HELPER
  // =========================================================

  function firstNumber(...values) {

    for (
      const value of values
    ) {

      if (

        value !== undefined

        &&

        value !== null

        &&

        value !== ""

        &&

        Number.isFinite(
          Number(value)
        )

      ) {

        return Number(value);

      }

    }


    return null;

  }


  // =========================================================
  // TEAM NAME
  // =========================================================

  function teamNameFromRow(row) {

    return String(

      row?.team_name

      ||

      row?.team?.name

      ||

      row?.team?.short_name

      ||

      row?.name

      ||

      row?.participant?.name

      ||

      row?.club?.name

      ||

      "Unknown"

    );

  }


  // =========================================================
  // EXTRACT STANDINGS ROWS
  // =========================================================

  function extractStandingsRows(payload) {

    if (!payload)
      return [];


    const candidates = [

      payload?.data?.standings,

      payload?.standings,

      payload?.data?.rows,

      payload?.data?.data,

      payload?.data,

      payload?.rows

    ];


    for (
      const candidate of candidates
    ) {

      if (!candidate)
        continue;


      if (
        Array.isArray(candidate)
      ) {

        const nested =

          candidate

            .filter(
              x =>
                x &&
                Array.isArray(x.rows)
            )

            .flatMap(
              x => x.rows
            );


        if (
          nested.length
        ) {

          return nested;

        }


        if (

          candidate.length

          &&

          candidate.some(
            x =>

              x &&

              typeof x === "object"

              &&

              (

                x.team

                ||

                x.team_name

                ||

                x.name

                ||

                x.position

                ||

                x.rank

              )

          )

        ) {

          return candidate;

        }

      }


      if (

        typeof candidate === "object"

        &&

        Array.isArray(
          candidate.rows
        )

      ) {

        return candidate.rows;

      }

    }


    let found = null;


    function search(
      node,
      depth = 0
    ) {

      if (
        !node ||
        depth > 12 ||
        found
      ) {

        return;

      }


      if (
        Array.isArray(node)
      ) {

        for (
          const item of node
        ) {

          search(
            item,
            depth + 1
          );

          if (found)
            return;

        }

        return;

      }


      if (
        typeof node === "object"
      ) {

        if (

          Array.isArray(
            node.rows
          )

          &&

          node.rows.length

        ) {

          found =
            node.rows;

          return;

        }


        for (
          const key of Object.keys(node)
        ) {

          if (
            key === "meta" ||
            key === "error"
          ) {

            continue;

          }


          search(
            node[key],
            depth + 1
          );


          if (found)
            return;

        }

      }

    }


    search(payload);


    return found || [];

  }


  // =========================================================
  // NORMALIZE STANDINGS
  // =========================================================

  function normalizeStandingsRows(rows) {

    return rows.map(
      (row, index) => ({

        position:

          firstNumber(
            row?.position,
            row?.rank,
            row?.place
          )

          ??

          index + 1,


        team_id:

          row?.team_id

          ||

          row?.team?.id

          ||

          row?.id

          ||

          null,


        team_name:
          teamNameFromRow(row),


        played:

          firstNumber(

            row?.played,

            row?.games_played,

            row?.gamesPlayed,

            row?.gp,

            row?.matches_played,

            row?.matchesPlayed

          ),


        won:

          firstNumber(

            row?.won,

            row?.wins,

            row?.win,

            row?.w

          ),


        drawn:

          firstNumber(

            row?.drawn,

            row?.draws,

            row?.draw,

            row?.d

          ),


        lost:

          firstNumber(

            row?.lost,

            row?.losses,

            row?.loss,

            row?.l

          ),


        goals_for:

          firstNumber(

            row?.goals_for,

            row?.goalsFor,

            row?.gf,

            row?.goals_scored

          ),


        goals_against:

          firstNumber(

            row?.goals_against,

            row?.goalsAgainst,

            row?.ga,

            row?.goals_conceded

          ),


        goal_difference:

          firstNumber(

            row?.goal_difference,

            row?.goalDifference,

            row?.gd

          ),


        points:

          firstNumber(

            row?.points,

            row?.pts

          )

      })
    );

  }


  // =========================================================
  // CHECK IF STANDINGS HAVE REAL NUMBERS
  // =========================================================

  function standingsHaveRealNumbers(rows) {

    if (
      !Array.isArray(rows) ||
      rows.length === 0
    ) {

      return false;

    }


    return rows.some(
      row =>

        [

          row.played,
          row.won,
          row.drawn,
          row.lost,
          row.points

        ]

        .some(
          value =>
            value !== null &&
            value > 0
        )

    );

  }


  // =========================================================
  // DEDUPLICATE STANDINGS
  // =========================================================

  function deduplicateStandings(rows) {

    const map =
      new Map();


    for (
      const row of rows
    ) {

      const key =

        String(

          row.team_id

          ||

          row.team_name

          ||

          "unknown"

        )

          .toLowerCase()

          .trim();


      if (
        !map.has(key)
      ) {

        map.set(
          key,
          row
        );

      }

    }


    return Array.from(
      map.values()
    );

  }


  // =========================================================
  // MATCH HELPERS
  // =========================================================

  function extractMatchRows(payload) {

    if (!payload)
      return [];


    if (
      Array.isArray(payload)
    ) {

      return payload;

    }


    if (
      Array.isArray(
        payload.data
      )
    ) {

      return payload.data;

    }


    if (
      Array.isArray(
        payload.matches
      )
    ) {

      return payload.matches;

    }


    if (
      Array.isArray(
        payload.data?.matches
      )
    ) {

      return payload.data.matches;

    }


    return [];

  }


  function getMatchTeam(
    match,
    side
  ) {

    const value =
      match?.[side];


    if (
      typeof value === "object"
    ) {

      return {

        id:

          value?.id

          ||

          value?.team_id

          ||

          null,


        name:

          value?.name

          ||

          value?.short_name

          ||

          value?.team_name

          ||

          ""

      };

    }


    return {

      id:
        null,

      name:
        String(value || "")

    };

  }


  function getScore(
    match,
    side
  ) {

    const score =
      match?.score;


    if (
      score &&
      typeof score === "object"
    ) {

      const direct =

        score?.[side]

        ??

        score?.[`${side}_score`]

        ??

        score?.[`${side}Score`];


      if (
        typeof direct === "object"
      ) {

        return firstNumber(

          direct?.final,

          direct?.full_time,

          direct?.fullTime,

          direct?.value,

          direct?.goals

        );

      }


      const n =
        firstNumber(direct);


      if (
        n !== null
      ) {

        return n;

      }


      const nested =

        score?.full_time

        ||

        score?.fullTime

        ||

        score?.final;


      if (

        nested &&

        typeof nested === "object"

      ) {

        return firstNumber(

          nested?.[side],

          nested?.[`${side}_score`],

          nested?.[`${side}Score`]

        );

      }

    }


    return firstNumber(

      match?.[`${side}_score`],

      match?.[`${side}Score`],

      match?.[`score_${side}`]

    );

  }


  // =========================================================
  // BUILD STANDINGS FROM FINISHED MATCHES
  // =========================================================

  function buildStandingsFromMatches(
    matches
  ) {

    const table =
      new Map();


    function ensure(team) {

      const key =

        team.id

        ||

        team.name
          .toLowerCase();


      if (
        !table.has(key)
      ) {

        table.set(
          key,
          {

            position:
              0,

            team_id:
              team.id,

            team_name:
              team.name,

            played:
              0,

            won:
              0,

            drawn:
              0,

            lost:
              0,

            goals_for:
              0,

            goals_against:
              0,

            goal_difference:
              0,

            points:
              0

          }
        );

      }


      return table.get(key);

    }


    for (
      const match of matches
    ) {

      const status =
        String(
          match?.status || ""
        )
          .toLowerCase();


      if (

        status === "scheduled"

        ||

        status === "upcoming"

        ||

        status === "not_started"

        ||

        status === "cancelled"

      ) {

        continue;

      }


      const home =
        getMatchTeam(
          match,
          "home"
        );


      const away =
        getMatchTeam(
          match,
          "away"
        );


      const hg =
        getScore(
          match,
          "home"
        );


      const ag =
        getScore(
          match,
          "away"
        );


      if (

        !home.name

        ||

        !away.name

        ||

        hg === null

        ||

        ag === null

      ) {

        continue;

      }


      const h =
        ensure(home);


      const a =
        ensure(away);


      h.played++;
      a.played++;


      h.goals_for += hg;
      h.goals_against += ag;


      a.goals_for += ag;
      a.goals_against += hg;


      if (
        hg > ag
      ) {

        h.won++;

        h.points += 3;

        a.lost++;

      }

      else if (
        hg < ag
      ) {

        a.won++;

        a.points += 3;

        h.lost++;

      }

      else {

        h.drawn++;

        a.drawn++;

        h.points++;

        a.points++;

      }

    }


    const rows =
      Array.from(
        table.values()
      );


    for (
      const row of rows
    ) {

      row.goal_difference =
        row.goals_for -
        row.goals_against;

    }


    rows.sort(
      (a, b) =>

        b.points -
        a.points

        ||

        b.goal_difference -
        a.goal_difference

        ||

        b.goals_for -
        a.goals_for

        ||

        a.team_name.localeCompare(
          b.team_name
        )

    );


    rows.forEach(
      (row, index) => {

        row.position =
          index + 1;

      }
    );


    return rows;

  }


  // =========================================================
  // GET FINISHED MATCHES FALLBACK
  // =========================================================

  async function getFinishedLeagueMatches(
    league
  ) {

    const result =
      await bbsRequest(

        `/v1/stored/matches` +

        `?sport=football` +

        `&league=${league}` +

        `&status=finished` +

        `&limit=200` +

        `&page=1`

      );


    if (
      result.ok
    ) {

      return {

        ok:
          true,

        source:
          "Big Balls stored matches",

        data:
          extractMatchRows(
            result.data
          )

      };

    }


    const fallback =
      await bbsRequest(

        `/v1/matches` +

        `?sport=football` +

        `&league=${league}` +

        `&season=2026` +

        `&limit=200` +

        `&page=1`

      );


    if (
      fallback.ok
    ) {

      return {

        ok:
          true,

        source:
          "Big Balls matches",

        data:
          extractMatchRows(
            fallback.data
          )

      };

    }


    return {

      ok:
        false,

      source:
        null,

      data:
        []

    };

  }


  // =========================================================
  // SPORTS ENGINE
  // =========================================================

  let sports =
    null;


  if (

    intent === "sports_standings"

    ||

    intent === "sports_matches"

    ||

    intent === "player_stats"

    ||

    intent === "sports_news"

  ) {

    sports = {

      live:
        false,

      intent,

      source:
        "Big Balls Sports Data"

    };


    function getLeague(text) {

      if (

        text.includes(
          "premier league"
        )

        ||

        text.includes("epl")

      ) {

        return "epl";

      }


      if (

        text.includes(
          "champions league"
        )

        ||

        text.includes("ucl")

      ) {

        return "cl";

      }


      if (
        text.includes("la liga")
      ) {

        return "laliga";

      }


      if (
        text.includes("serie a")
      ) {

        return "serie_a";

      }


      if (
        text.includes("bundesliga")
      ) {

        return "bundesliga";

      }


      if (
        text.includes("ligue 1")
      ) {

        return "ligue1";

      }


      if (
        text.includes("mls")
      ) {

        return "mls";

      }


      return null;

    }


    const league =
      getLeague(
        normalizedQuery
      );


    // =======================================================
    // STANDINGS
    // =======================================================

    if (

      intent === "sports_standings"

      &&

      league

    ) {

      /*
        PRIMARY SOURCE:

        Big Balls stored standings.

        season=2026 means
        the 2026-27 campaign.
      */

      const storedResult =
        await bbsRequest(

          `/v1/stored/standings` +

          `?sport=football` +

          `&league=${league}` +

          `&season=2026`

        );


      let result =
        storedResult;


      let rows =
        [];


      let standingsSource =
        null;


      if (
        result.ok
      ) {

        rows =

          normalizeStandingsRows(

            extractStandingsRows(
              result.data
            )

          );


        rows =
          deduplicateStandings(
            rows
          );


        if (
          standingsHaveRealNumbers(
            rows
          )
        ) {

          standingsSource =
            "Big Balls stored standings";

        }

      }


      /*
        FALLBACK TO LIVE STANDINGS
      */

      if (
        !standingsHaveRealNumbers(
          rows
        )
      ) {

        const liveResult =
          await bbsRequest(

            `/v1/standings` +

            `?sport=football` +

            `&league=${league}` +

            `&season=2026`

          );


        if (
          liveResult.ok
        ) {

          const liveRows =

            deduplicateStandings(

              normalizeStandingsRows(

                extractStandingsRows(
                  liveResult.data
                )

              )

            );


          if (
            standingsHaveRealNumbers(
              liveRows
            )
          ) {

            rows =
              liveRows;

            result =
              liveResult;

            standingsSource =
              "Big Balls live standings";

          }

        }

      }


      /*
        FINAL FALLBACK:

        Calculate the table from
        finished matches.
      */

      if (
        !standingsHaveRealNumbers(
          rows
        )
      ) {

        const matchesResult =
          await getFinishedLeagueMatches(
            league
          );


        const matches =
          matchesResult.data;


        const calculated =
          buildStandingsFromMatches(
            matches
          );


        if (
          calculated.length > 0
        ) {

          rows =
            calculated;

          standingsSource =
            `${matchesResult.source} - Nexora calculated`;

          sports.matchesUsed =
            matches.length;

          sports.matchesSource =
            matchesResult.source;

        }

      }


      sports.live =
        true;


      sports.type =
        "standings";


      sports.league =
        league;


      sports.data =
        rows;


      sports.standingsSource =
        standingsSource;


      sports.rawData =
        result?.data || null;


      sports.season =
        "2026-27";

    }


    // =======================================================
    // MATCHES
    // =======================================================

    if (

      intent === "sports_matches"

      &&

      league

    ) {

      const result =
        await bbsRequest(

          `/v1/matches` +

          `?sport=football` +

          `&league=${league}` +

          `&season=2026` +

          `&limit=20`

        );


      if (
        result.ok
      ) {

        sports.live =
          true;

        sports.type =
          "matches";

        sports.league =
          league;

        sports.data =
          result.data;

      }

      else {

        sports.error =

          result.error

          ||

          `Sports API returned ${result.status}`;

      }


      if (

        sports.live

        &&

        footballClubs.some(
          club =>
            normalizedQuery.includes(
              club
            )
        )

      ) {

        const wantedTeam =

          footballClubs.find(
            club =>
              normalizedQuery.includes(
                club
              )
          );


        sports.team =
          wantedTeam;


        const rows =

          sports.data?.data

          ||

          sports.data?.matches

          ||

          [];


        if (
          Array.isArray(rows)
        ) {

          sports.data = {

            ...sports.data,

            data:

              rows.filter(
                match => {

                  const homeName =

                    String(

                      match?.home?.name

                      ||

                      match?.home

                      ||

                      ""

                    )
                      .toLowerCase();


                  const awayName =

                    String(

                      match?.away?.name

                      ||

                      match?.away

                      ||

                      ""

                    )
                      .toLowerCase();


                  return (

                    homeName.includes(
                      wantedTeam
                    )

                    ||

                    wantedTeam.includes(
                      homeName
                    )

                    ||

                    awayName.includes(
                      wantedTeam
                    )

                    ||

                    wantedTeam.includes(
                      awayName
                    )

                  );

                }
              )

          };

        }

      }

    }


    // =======================================================
    // PLAYER STATS
    // =======================================================

    if (
      intent === "player_stats"
    ) {

      let playerName =

        normalizedQuery

          .replace(
            /\s+stats$/i,
            ""
          )

          .replace(
            /\s+statistics$/i,
            ""
          )

          .trim();


      const isCristianoRonaldo =

        /\b(
          cristiano\s+ronaldo|
          ronaldo|
          cr7
        )\b/ix.test(
          playerName
        );


      if (
        isCristianoRonaldo
      ) {

        playerName =
          "cristiano ronaldo";

      }


      const playerSearch =
        await bbsRequest(

          `/v1/players` +

          `?sport=football` +

          `&search=${encodeURIComponent(
            playerName
          )}`

        );


      if (
        playerSearch.ok
      ) {

        const players =

          playerSearch.data?.data

          ||

          playerSearch.data?.players

          ||

          [];


        if (

          Array.isArray(players)

          &&

          players.length > 0

        ) {

          function getPlayerName(
            player
          ) {

            return String(

              player?.name

              ||

              player?.full_name

              ||

              player?.fullName

              ||

              ""

            )

              .toLowerCase()

              .replace(
                /\s+/g,
                " "
              )

              .trim();

          }


          let player =
            null;


          if (
            isCristianoRonaldo
          ) {

            player =
              players.find(
                p =>
                  getPlayerName(p) ===
                  "cristiano ronaldo"
              );


            if (!player) {

              player =
                players.find(
                  p => {

                    const name =
                      getPlayerName(p);


                    return (

                      name.includes(
                        "cristiano"
                      )

                      &&

                      name.includes(
                        "ronaldo"
                      )

                    );

                  }
                );

            }


            if (!player) {

              player =
                players.find(
                  p =>
                    getPlayerName(p)
                      .startsWith(
                        "cristiano ronaldo"
                      )
                );

            }

          }

          else {

            player =
              players.find(
                p =>
                  getPlayerName(p) ===
                  playerName
              );


            if (!player) {

              player =
                players.find(
                  p =>
                    getPlayerName(p)
                      .startsWith(
                        playerName
                      )
                );

            }


            if (!player) {

              player =
                players.find(
                  p =>
                    getPlayerName(p)
                      .includes(
                        playerName
                      )
                );

            }


            if (!player) {

              player =
                players[0];

            }

          }


          if (
            player
          ) {

            const playerId =

              player?.id

              ||

              player?.player_id;


            if (
              playerId
            ) {

              const stats =
                await bbsRequest(

                  `/v1/players/${playerId}/stats` +

                  `?sport=football`

                );


              if (
                stats.ok
              ) {

                sports.live =
                  true;

                sports.type =
                  "player_stats";

                sports.player =
                  player;

                sports.data =
                  stats.data;

              }

            }

          }

          else {

            sports.error =

              `Nexora could not confirm the exact player: ${playerName}`;

          }

        }

      }

    }


    // =======================================================
    // SPORTS NEWS
    // =======================================================

    if (
      intent === "sports_news"
    ) {

      sports.type =
        "news";


      sports.message =
        "Nexora recognized this as a sports news search.";

    }

  }


  // =========================================================
  // ENTITY
  // =========================================================

  let entity = {

    type:
      intent,

    name:
      normalizedQuery

  };


  if (

    query === "ronaldo"

    ||

    query === "cr7"

    ||

    query.includes(
      "cristiano ronaldo"
    )

  ) {

    entity = {

      type:
        "person",

      name:
        "Cristiano Ronaldo",

      canonicalName:
        "Cristiano Ronaldo",

      wikimediaTitle:
        "Cristiano Ronaldo"

    };

  }


  if (

    query === "messi"

    ||

    query.includes(
      "lionel messi"
    )

  ) {

    entity = {

      type:
        "person",

      name:
        "Lionel Messi",

      canonicalName:
        "Lionel Messi",

      wikimediaTitle:
        "Lionel Messi"

    };

  }


  // =========================================================
  // WIKIPEDIA
  // =========================================================

  let wikipedia =
    null;


  const shouldUseWikipedia =

    intent === "general"

    ||

    intent === "person"

    ||

    intent === "football_club"

    ||

    intent === "sports_competition"

    ||

    intent === "anime_manga";


  if (
    shouldUseWikipedia
  ) {

    const wikiSearchTerm =

      entity.wikimediaTitle

      ||

      normalizedQuery;


    const wiki =
      await wikipediaSearch(
        wikiSearchTerm
      );


    if (
      wiki.ok
    ) {

      wikipedia =

        wiki.data?.query?.search
          ?.slice(0, 8)

        ||

        [];

    }

  }


  // =========================================================
  // ACTIVE SOURCES
  // =========================================================

  const activeSources =
    [];


  if (
    sports?.live
  ) {

    activeSources.push(
      "Big Balls Sports Data"
    );

  }


  if (
    wikipedia
  ) {

    activeSources.push(
      "Wikipedia"
    );

  }


  if (
    intent === "how_to"
  ) {

    activeSources.push(
      "Nexora How-To Engine"
    );

  }


  if (
    intent === "product"
  ) {

    activeSources.push(
      "Nexora Product Understanding"
    );

  }


  // =========================================================
  // ANSWER
  // =========================================================

  let answer =
    null;


  if (
    intent === "how_to"
  ) {

    answer = {

      title:
        howTo.title,

      type:
        "how_to",

      steps:
        howTo.steps

    };

  }


  if (

    sports?.live

    &&

    sports.type === "standings"

  ) {

    answer = {

      title:
        `${sports.league} standings`,

      type:
        "sports_standings",

      data:

        Array.isArray(
          sports.data
        )

          ?

        sports.data

          :

        []

    };

  }


  if (

    sports?.live

    &&

    sports.type === "matches"

  ) {

    answer = {

      title:
        `${sports.league} fixtures`,

      type:
        "sports_matches",

      data:

        sports.data?.data

        ||

        sports.data?.matches

        ||

        []

    };

  }


  if (

    sports?.live

    &&

    sports.type === "player_stats"

  ) {

    answer = {

      title:
        `${sports.player?.name || "Player"} statistics`,

      type:
        "player_stats",

      data:

        sports.data?.data

        ||

        sports.data?.stats

        ||

        sports.data

    };

  }


  // =========================================================
  // FINAL RESPONSE
  // =========================================================

  return res.status(200).json({

    success:
      true,

    apiVersion:
      "V15.7",

    query:
      originalQuery,

    normalizedQuery,

    understanding: {

      intent,

      confidence:

        intent === "general"

          ?

        "medium"

          :

        "high"

    },

    entity,

    howTo,

    product,

    sports,

    answer,

    wikipedia,

    activeSources,

    message:
      "Nexora V15.7 Intelligence Engine"

  });

}
