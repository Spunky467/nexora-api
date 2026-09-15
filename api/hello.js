export default async function handler(req, res) {

  const query = String(req.query.q || "").trim();

  if (!query) {
    return res.status(400).json({
      success: false,
      error: "Please provide a search query"
    });
  }

  try {

    /*
      =====================================
      NEXORA V11 — UNIVERSAL UNDERSTANDING
      =====================================
    */

    const cleanQuery = query
      .replace(/\s+/g, " ")
      .trim();

    const searchText = cleanQuery.toLowerCase();


    /*
      =====================================
      SOURCE URLS
      =====================================
    */

    const wikidataURL =
      "https://www.wikidata.org/w/api.php" +
      "?action=wbsearchentities" +
      "&search=" + encodeURIComponent(cleanQuery) +
      "&language=en" +
      "&format=json" +
      "&origin=*";

    const wikipediaURL =
      "https://en.wikipedia.org/w/api.php" +
      "?action=query" +
      "&list=search" +
      "&srsearch=" + encodeURIComponent(cleanQuery) +
      "&format=json" +
      "&origin=*";

    const booksURL =
      "https://openlibrary.org/search.json" +
      "?q=" + encodeURIComponent(cleanQuery) +
      "&limit=5";

    const countriesURL =
      "https://restcountries.com/v3.1/name/" +
      encodeURIComponent(cleanQuery) +
      "?fullText=true";


    /*
      =====================================
      FETCH SOURCES
      =====================================
    */

    const responses = await Promise.allSettled([

      fetch(wikidataURL),

      fetch(wikipediaURL),

      fetch(booksURL),

      fetch(countriesURL)

    ]);


    /*
      =====================================
      SAFE JSON
      =====================================
    */

    async function safeJSON(result) {

      if (result.status !== "fulfilled") {
        return null;
      }

      const response = result.value;

      if (!response.ok) {
        return null;
      }

      const contentType =
        response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        return null;
      }

      try {

        return await response.json();

      } catch {

        return null;

      }
    }


    const wikidataData =
      await safeJSON(responses[0]);

    const wikipediaData =
      await safeJSON(responses[1]);

    const booksData =
      await safeJSON(responses[2]);

    const countriesData =
      await safeJSON(responses[3]);


    /*
      =====================================
      WIKIDATA
      =====================================
    */

    const wikidataResults =
      (wikidataData?.search || [])
        .slice(0, 5)
        .map(item => ({

          source: "Wikidata",

          id: item.id,

          title:
            item.label || "",

          description:
            item.description || "",

          url:
            "https://www.wikidata.org/wiki/" +
            item.id

        }));


    /*
      =====================================
      WIKIPEDIA
      =====================================
    */

    const wikipediaResults =
      (wikipediaData?.query?.search || [])
        .slice(0, 5)
        .map(item => ({

          source: "Wikipedia",

          title:
            item.title || "",

          description:
            item.snippet
              ? item.snippet.replace(
                  /<[^>]*>/g,
                  ""
                )
              : "",

          url:
            "https://en.wikipedia.org/wiki/" +
            encodeURIComponent(
              item.title.replace(/ /g, "_")
            )

        }));


    /*
      =====================================
      OPEN LIBRARY
      =====================================
    */

    const bookResults =
      (booksData?.docs || [])
        .slice(0, 5)
        .map(book => ({

          source: "Open Library",

          title:
            book.title || "",

          description:
            book.author_name
              ? "By " +
                book.author_name
                  .slice(0, 2)
                  .join(", ")
              : "Book",

          url:
            book.key
              ? "https://openlibrary.org" +
                book.key
              : "https://openlibrary.org"

        }));


    /*
      =====================================
      COUNTRIES
      =====================================
    */

    const countryResults =
      Array.isArray(countriesData)
        ? countriesData
            .slice(0, 5)
            .map(country => ({

              source: "REST Countries",

              title:
                country.name?.common || "",

              description:
                [
                  country.capital?.[0]
                    ? "Capital: " +
                      country.capital[0]
                    : "",

                  country.region
                    ? "Region: " +
                      country.region
                    : "",

                  country.population
                    ? "Population: " +
                      country.population.toLocaleString()
                    : ""

                ]
                .filter(Boolean)
                .join(" • "),

              flag:
                country.flags?.png ||
                country.flags?.svg ||
                "",

              countryCode:
                country.cca3 || "",

              url:
                "https://restcountries.com/"

            }))
        : [];


    /*
      =====================================
      UNIVERSAL QUERY UNDERSTANDING
      =====================================
    */

    let entityType = "unknown";

    let intent = "general";

    let confidence = "low";


    /*
      PERSON
    */

    if (
      /\b(who is|who was|player|actor|actress|singer|artist|ceo|president)\b/i
        .test(searchText)
    ) {

      entityType = "person";

      intent = "person";

      confidence = "medium";

    }


    /*
      SPORTS
    */

    else if (
      /\b(football|soccer|nba|basketball|tennis|fifa|uefa|premier league|champions league|world cup|player|club|team|coach|manager)\b/i
        .test(searchText)
    ) {

      entityType = "sports";

      intent = "sports";

      confidence = "medium";

    }


    /*
      ANIME / MANGA
    */

    else if (
      /\b(anime|manga|manhwa|manhua|donghua|episode|chapter|arc)\b/i
        .test(searchText)
    ) {

      entityType = "anime_manga";

      intent = "anime";

      confidence = "medium";

    }


    /*
      GAMES
    */

    else if (
      /\b(game|gaming|playstation|xbox|nintendo|minecraft|codm|fortnite|fifa|efootball|pubg)\b/i
        .test(searchText)
    ) {

      entityType = "game";

      intent = "games";

      confidence = "medium";

    }


    /*
      EDUCATION
    */

    else if (
      /\b(course|subject|school|university|college|degree|mathematics|math|physics|chemistry|biology|computer science|engineering|history|geography|economics)\b/i
        .test(searchText)
    ) {

      entityType = "education";

      intent = "education";

      confidence = "medium";

    }


    /*
      BOOKS
    */

    else if (
      /\b(book|novel|author|writer|literature|poem|poetry)\b/i
        .test(searchText)
    ) {

      entityType = "book";

      intent = "books";

      confidence = "medium";

    }


    /*
      NEWS
    */

    else if (
      /\b(news|latest|today|breaking|update|updates|2026)\b/i
        .test(searchText)
    ) {

      entityType = "news";

      intent = "news";

      confidence = "medium";

    }


    /*
      COUNTRY
    */

    else if (
      countryResults.length > 0
    ) {

      entityType = "country";

      intent = "country";

      confidence = "high";

    }


    /*
      =====================================
      SMART RESULT RANKING
      =====================================
    */

    function scoreResult(result) {

      const title =
        String(result.title || "")
          .toLowerCase();

      const description =
        String(result.description || "")
          .toLowerCase();

      let score = 0;


      /*
        EXACT TITLE
      */

      if (title === searchText) {

        score += 100;

      }


      /*
        TITLE STARTS WITH QUERY
      */

      else if (
        title.startsWith(searchText)
      ) {

        score += 70;

      }


      /*
        QUERY APPEARS IN TITLE
      */

      else if (
        title.includes(searchText)
      ) {

        score += 40;

      }


      /*
        DESCRIPTION MATCH
      */

      if (
        description.includes(searchText)
      ) {

        score += 15;

      }


      /*
        EXACT COUNTRY
      */

      if (
        result.source === "REST Countries" &&
        title === searchText
      ) {

        score += 50;

      }


      /*
        SOURCE PRIORITY
      */

      if (
        entityType === "country" &&
        result.source === "REST Countries"
      ) {

        score += 30;

      }


      if (
        entityType === "book" &&
        result.source === "Open Library"
      ) {

        score += 20;

      }


      if (
        entityType !== "book" &&
        result.source === "Open Library"
      ) {

        score -= 10;

      }


      return score;

    }


    /*
      =====================================
      COMBINE EVERYTHING
      =====================================
    */

    const allResults = [

      ...countryResults,

      ...wikidataResults,

      ...wikipediaResults,

      ...bookResults

    ];


    /*
      REMOVE DUPLICATES
    */

    const uniqueResults = [];

    const seenTitles = new Set();


    for (const result of allResults) {

      const key =
        String(result.title || "")
          .toLowerCase()
          .trim();

      if (!key) {
        continue;
      }

      if (seenTitles.has(key)) {
        continue;
      }

      seenTitles.add(key);

      uniqueResults.push(result);

    }


    /*
      RANK
    */

    uniqueResults.sort(
      (a, b) =>
        scoreResult(b) -
        scoreResult(a)
    );


    /*
      =====================================
      POSSIBLE ENTITY
      =====================================
    */

    const topResult =
      uniqueResults[0] || null;


    const entityMatch =
      topResult
        ? {
            title:
              topResult.title,

            source:
              topResult.source,

            id:
              topResult.id || null,

            description:
              topResult.description || "",

            url:
              topResult.url || null
          }
        : null;


    /*
      =====================================
      ACTIVE SOURCES
      =====================================
    */

    const activeSources = [];


    if (wikidataData) {

      activeSources.push("Wikidata");

    }


    if (wikipediaData) {

      activeSources.push("Wikipedia");

    }


    if (booksData) {

      activeSources.push("Open Library");

    }


    if (countriesData) {

      activeSources.push("REST Countries");

    }


    /*
      =====================================
      SEARCH UNDERSTANDING
      =====================================
    */

    const understanding = {

      originalQuery:
        query,

      normalizedQuery:
        cleanQuery,

      entityType:
        entityType,

      intent:
        intent,

      confidence:
        confidence,

      entityFocus:
        true,

      topEntity:
        entityMatch

    };


    /*
      =====================================
      FINAL RESPONSE
      =====================================
    */

    return res.status(200).json({

      success: true,

      apiVersion:
        "V11",

      source:
        "Nexora Universal Search API",

      query:
        query,

      understanding:
        understanding,

      activeSources:
        activeSources,

      sources: {

        countries:
          countryResults,

        wikidata:
          wikidataResults,

        wikipedia:
          wikipediaResults,

        books:
          bookResults

      },

      results:
        uniqueResults.slice(0, 15)

    });


  } catch (error) {

    return res.status(500).json({

      success: false,

      error:
        "Nexora API failed",

      message:
        error.message

    });

  }

}
