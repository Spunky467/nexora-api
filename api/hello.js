export default async function handler(req, res) {

  const query = String(req.query.q || "").trim();

  if (!query) {
    return res.status(400).json({
      error: "Please provide a search query"
    });
  }

  try {

    /*
      NEXORA MULTI-SOURCE ENGINE

      Sources:
      1. Wikidata
      2. Wikipedia
      3. Open Library
      4. REST Countries

      More sources will be added later:
      Sports
      Anime/Manga
      News
      Images
      Web Search
    */

    const cleanQuery = query.toLowerCase();

    /*
      -------------------------
      WIKIDATA
      -------------------------
    */

    const wikidataURL =
      "https://www.wikidata.org/w/api.php" +
      "?action=wbsearchentities" +
      "&search=" + encodeURIComponent(query) +
      "&language=en" +
      "&format=json" +
      "&origin=*";

    /*
      -------------------------
      WIKIPEDIA
      -------------------------
    */

    const wikipediaURL =
      "https://en.wikipedia.org/w/api.php" +
      "?action=query" +
      "&list=search" +
      "&srsearch=" + encodeURIComponent(query) +
      "&format=json" +
      "&origin=*";

    /*
      -------------------------
      OPEN LIBRARY
      -------------------------
    */

    const booksURL =
      "https://openlibrary.org/search.json" +
      "?q=" + encodeURIComponent(query) +
      "&limit=5";

    /*
      -------------------------
      REST COUNTRIES
      -------------------------
    */

    const countryURL =
      "https://restcountries.com/v3.1/name/" +
      encodeURIComponent(query) +
      "?fullText=true";

    /*
      Run sources at the same time.
      This makes Nexora faster.
    */

    const responses = await Promise.allSettled([

      fetch(wikidataURL),

      fetch(wikipediaURL),

      fetch(booksURL),

      fetch(countryURL)

    ]);

    /*
      -------------------------
      WIKIDATA RESULTS
      -------------------------
    */

    let wikidataResults = [];

    if (responses[0].status === "fulfilled") {

      const data = await responses[0].value.json();

      wikidataResults =
        (data.search || [])
          .slice(0, 5)
          .map(item => ({

            source: "Wikidata",

            id: item.id,

            title: item.label || "",

            description:
              item.description || "",

            url:
              "https://www.wikidata.org/wiki/" +
              item.id

          }));

    }

    /*
      -------------------------
      WIKIPEDIA RESULTS
      -------------------------
    */

    let wikipediaResults = [];

    if (responses[1].status === "fulfilled") {

      const data = await responses[1].value.json();

      wikipediaResults =
        (data.query?.search || [])
          .slice(0, 5)
          .map(item => ({

            source: "Wikipedia",

            title: item.title,

            description:
              item.snippet
                ? item.snippet
                    .replace(/<[^>]*>/g, "")
                : "",

            url:
              "https://en.wikipedia.org/wiki/" +
              encodeURIComponent(
                item.title.replace(/ /g, "_")
              )

          }));

    }

    /*
      -------------------------
      OPEN LIBRARY RESULTS
      -------------------------
    */

    let bookResults = [];

    if (responses[2].status === "fulfilled") {

      const data = await responses[2].value.json();

      bookResults =
        (data.docs || [])
          .slice(0, 5)
          .map(book => ({

            source: "Open Library",

            title:
              book.title || "",

            description:
              book.author_name
                ? "By " +
                  book.author_name.slice(0, 2).join(", ")
                : "Book",

            url:
              book.key
                ? "https://openlibrary.org" +
                  book.key
                : "https://openlibrary.org"

          }));

    }

    /*
      -------------------------
      COUNTRY RESULTS
      -------------------------
    */

    let countryResults = [];

    if (responses[3].status === "fulfilled") {

      const response = responses[3].value;

      if (response.ok) {

        const data = await response.json();

        countryResults =
          (data || [])
            .slice(0, 5)
            .map(country => ({

              source: "REST Countries",

              title:
                country.name?.common || "",

              description:
                [
                  country.capital?.[0],
                  country.region,
                  country.population
                    ? "Population " +
                      country.population.toLocaleString()
                    : ""
                ]
                .filter(Boolean)
                .join(" • "),

              url:
                "https://restcountries.com"

            }));

      }

    }

    /*
      -------------------------
      ENTITY FOCUS
      -------------------------
    */

    const allResults = [

      ...wikidataResults,

      ...wikipediaResults,

      ...bookResults,

      ...countryResults

    ];

    /*
      Give exact title matches
      higher priority.
    */

    allResults.sort((a, b) => {

      const aTitle =
        a.title.toLowerCase();

      const bTitle =
        b.title.toLowerCase();

      const aExact =
        aTitle === cleanQuery
          ? 100
          : 0;

      const bExact =
        bTitle === cleanQuery
          ? 100
          : 0;

      const aStarts =
        aTitle.startsWith(cleanQuery)
          ? 30
          : 0;

      const bStarts =
        bTitle.startsWith(cleanQuery)
          ? 30
          : 0;

      return (
        (bExact + bStarts) -
        (aExact + aStarts)
      );

    });

    /*
      -------------------------
      INTENT DETECTION
      -------------------------
    */

    let intent = "general";

    if (
      /football|soccer|nba|basketball|tennis|fifa|uefa|premier league|champions league/i
        .test(query)
    ) {

      intent = "sports";

    }

    else if (
      /anime|manga|manhwa|donghua/i
        .test(query)
    ) {

      intent = "anime";

    }

    else if (
      /game|gaming|playstation|xbox|nintendo|minecraft|codm/i
        .test(query)
    ) {

      intent = "games";

    }

    else if (
      /news|latest|today|breaking/i
        .test(query)
    ) {

      intent = "news";

    }

    else if (
      /book|novel|author/i
        .test(query)
    ) {

      intent = "books";

    }

    /*
      -------------------------
      RESPONSE
      -------------------------
    */

    return res.status(200).json({

      success: true,

      source: "Nexora Multi-Source API",

      query: query,

      intent: intent,

      entityFocus: true,

      sources: {

        wikidata:
          wikidataResults,

        wikipedia:
          wikipediaResults,

        books:
          bookResults,

        countries:
          countryResults

      },

      results:
        allResults.slice(0, 15)

    });

  }

  catch (error) {

    return res.status(500).json({

      success: false,

      error: "Nexora API failed",

      message: error.message

    });

  }

}
