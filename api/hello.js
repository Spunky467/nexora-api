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
      NEXORA V12
      ENTITY RESOLUTION ENGINE
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
      WIKIDATA ENTITY RESULTS
      =====================================
    */

    const wikidataResults =
      (wikidataData?.search || [])
        .slice(0, 8)
        .map(item => ({

          source: "Wikidata",

          id:
            item.id || "",

          title:
            item.label || "",

          description:
            item.description || "",

          match:
            item.match?.text || "",

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
        .slice(0, 8)
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
      ENTITY TYPE DETECTION
      =====================================
    */

    function detectEntityType(item) {

      const text = (

        String(item.title || "") +
        " " +
        String(item.description || "")

      ).toLowerCase();


      if (
        item.source === "REST Countries"
      ) {

        return "country";

      }


      if (
        /\b(footballer|football player|soccer player|basketball player|tennis player|actor|actress|singer|musician|politician|president|athlete|writer|author|director)\b/
          .test(text)
      ) {

        return "person";

      }


      if (
        /\b(football club|soccer club|basketball team|sports team|football team|national team)\b/
          .test(text)
      ) {

        return "sports_team";

      }


      if (
        /\b(video game|computer game|mobile game|game)\b/
          .test(text)
      ) {

        return "game";

      }


      if (
        /\b(anime|manga|manhwa|manhua|comic)\b/
          .test(text)
      ) {

        return "anime_manga";

      }


      if (
        /\b(book|novel|literature|poem|poetry)\b/
          .test(text)
      ) {

        return "book";

      }


      if (
        /\b(university|college|school|course|degree|education)\b/
          .test(text)
      ) {

        return "education";

      }


      if (
        /\b(company|organization|corporation|brand)\b/
          .test(text)
      ) {

        return "organization";

      }


      return "general";

    }


    /*
      =====================================
      ENTITY SCORING
      =====================================
    */

    function entityScore(item) {

      const title =
        String(item.title || "")
          .toLowerCase()
          .trim();

      const description =
        String(item.description || "")
          .toLowerCase();

      let score = 0;


      /*
        EXACT TITLE
      */

      if (
        title === searchText
      ) {

        score += 100;

      }


      /*
        TITLE START
      */

      else if (
        title.startsWith(searchText)
      ) {

        score += 70;

      }


      /*
        TITLE CONTAINS QUERY
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

        score += 10;

      }


      /*
        WIKIDATA IS STRONG FOR ENTITIES
      */

      if (
        item.source === "Wikidata"
      ) {

        score += 15;

      }


      /*
        COUNTRY EXACT MATCH
      */

      if (
        item.source === "REST Countries" &&
        title === searchText
      ) {

        score += 60;

      }


      return score;

    }


    /*
      =====================================
      ALL POSSIBLE ENTITIES
      =====================================
    */

    const entityCandidates = [

      ...countryResults,

      ...wikidataResults

    ];


    /*
      =====================================
      SCORE ENTITIES
      =====================================
    */

    const scoredEntities =
      entityCandidates
        .map(item => ({

          ...item,

          entityType:
            detectEntityType(item),

          score:
            entityScore(item)

        }))
        .sort(
          (a, b) =>
            b.score - a.score
        );


    /*
      =====================================
      REMOVE DUPLICATE ENTITY NAMES
      =====================================
    */

    const uniqueEntities = [];

    const seenEntities = new Set();


    for (
      const entity of scoredEntities
    ) {

      const key =
        entity.title
          .toLowerCase()
          .trim();

      if (!key) {
        continue;
      }

      if (
        seenEntities.has(key)
      ) {
        continue;
      }

      seenEntities.add(key);

      uniqueEntities.push(entity);

    }


    /*
      =====================================
      BEST ENTITY
      =====================================
    */

    const topEntity =
      uniqueEntities[0] || null;


    /*
      =====================================
      AMBIGUITY DETECTION
      =====================================
    */

    let ambiguous = false;

    const possibleEntities = [];


    if (uniqueEntities.length > 1) {

      const first =
        uniqueEntities[0].score;

      const second =
        uniqueEntities[1].score;


      /*
        If the top two candidates
        are reasonably close,
        Nexora should not blindly
        assume one meaning.
      */

      if (
        second >= first * 0.70
      ) {

        ambiguous = true;

        uniqueEntities
          .slice(0, 5)
          .forEach(entity => {

            possibleEntities.push({

              title:
                entity.title,

              type:
                entity.entityType,

              description:
                entity.description,

              source:
                entity.source,

              score:
                entity.score,

              id:
                entity.id || null,

              url:
                entity.url || null

            });

          });

      }

    }


    /*
      =====================================
      ENTITY CONFIDENCE
      =====================================
    */

    let confidence = "low";


    if (
      topEntity &&
      topEntity.score >= 100
    ) {

      confidence = "high";

    }

    else if (
      topEntity &&
      topEntity.score >= 70
    ) {

      confidence = "medium";

    }


    if (ambiguous) {

      confidence = "ambiguous";

    }


    /*
      =====================================
      GENERAL QUERY UNDERSTANDING
      =====================================
    */

    let intent = "general";


    if (
      topEntity
    ) {

      switch (
        topEntity.entityType
      ) {

        case "person":

          intent = "person";

          break;


        case "sports_team":

          intent = "sports";

          break;


        case "country":

          intent = "country";

          break;


        case "game":

          intent = "games";

          break;


        case "anime_manga":

          intent = "anime";

          break;


        case "book":

          intent = "books";

          break;


        case "education":

          intent = "education";

          break;


        case "organization":

          intent = "organization";

          break;

      }

    }


    /*
      EXTRA QUERY SIGNALS
    */

    if (
      /\b(latest|today|breaking|news|update)\b/i
        .test(searchText)
    ) {

      intent = "news";

    }


    if (
      /\b(stats|statistics|matches|fixture|fixtures|score|scores|transfer|transfers|league|champions league|premier league)\b/i
        .test(searchText)
    ) {

      intent = "sports";

    }


    /*
      =====================================
      ALL SEARCH RESULTS
      =====================================
    */

    const allResults = [

      ...countryResults,

      ...wikidataResults,

      ...wikipediaResults,

      ...bookResults

    ];


    /*
      =====================================
      SMART RESULT RANKING
      =====================================
    */

    function resultScore(result) {

      const title =
        String(result.title || "")
          .toLowerCase();

      const description =
        String(result.description || "")
          .toLowerCase();

      let score = 0;


      if (
        title === searchText
      ) {

        score += 100;

      }

      else if (
        title.startsWith(searchText)
      ) {

        score += 70;

      }

      else if (
        title.includes(searchText)
      ) {

        score += 40;

      }


      if (
        description.includes(searchText)
      ) {

        score += 10;

      }


      if (
        topEntity &&
        title ===
          topEntity.title.toLowerCase()
      ) {

        score += 50;

      }


      return score;

    }


    const uniqueResults = [];

    const seenResults = new Set();


    for (
      const result of allResults
    ) {

      const key =
        String(result.title || "")
          .toLowerCase()
          .trim();

      if (!key) {
        continue;
      }

      if (
        seenResults.has(key)
      ) {
        continue;
      }

      seenResults.add(key);

      uniqueResults.push(result);

    }


    uniqueResults.sort(
      (a, b) =>
        resultScore(b) -
        resultScore(a)
    );


    /*
      =====================================
      ACTIVE SOURCES
      =====================================
    */

    const activeSources = [];


    if (wikidataData) {

      activeSources.push(
        "Wikidata"
      );

    }


    if (wikipediaData) {

      activeSources.push(
        "Wikipedia"
      );

    }


    if (booksData) {

      activeSources.push(
        "Open Library"
      );

    }


    if (countriesData) {

      activeSources.push(
        "REST Countries"
      );

    }


    /*
      =====================================
      FINAL ENTITY
      =====================================
    */

    const resolvedEntity =
      topEntity
        ? {

            title:
              topEntity.title,

            type:
              topEntity.entityType,

            description:
              topEntity.description,

            source:
              topEntity.source,

            id:
              topEntity.id || null,

            url:
              topEntity.url || null

          }
        : null;


    /*
      =====================================
      FINAL RESPONSE
      =====================================
    */

    return res.status(200).json({

      success: true,

      apiVersion:
        "V12",

      source:
        "Nexora Entity Resolution API",

      query:
        query,

      understanding: {

        originalQuery:
          query,

        normalizedQuery:
          cleanQuery,

        entity:
          resolvedEntity,

        entityType:
          topEntity
            ? topEntity.entityType
            : "unknown",

        intent:
          intent,

        confidence:
          confidence,

        entityFocus:
          true,

        ambiguous:
          ambiguous,

        possibleEntities:
          possibleEntities

      },

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

      apiVersion:
        "V12",

      error:
        "Nexora API failed",

      message:
        error.message

    });

  }

}
