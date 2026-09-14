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
      =========================
      SOURCE URLS
      =========================
    */

    const wikidataURL =
      "https://www.wikidata.org/w/api.php" +
      "?action=wbsearchentities" +
      "&search=" + encodeURIComponent(query) +
      "&language=en" +
      "&format=json" +
      "&origin=*";

    const wikipediaURL =
      "https://en.wikipedia.org/w/api.php" +
      "?action=query" +
      "&list=search" +
      "&srsearch=" + encodeURIComponent(query) +
      "&format=json" +
      "&origin=*";

    const booksURL =
      "https://openlibrary.org/search.json" +
      "?q=" + encodeURIComponent(query) +
      "&limit=5";

    /*
      REST COUNTRIES
    */

    const countriesURL =
      "https://restcountries.com/v3.1/name/" +
      encodeURIComponent(query) +
      "?fullText=true";


    /*
      =========================
      FETCH ALL SOURCES
      =========================
    */

    const responses = await Promise.allSettled([

      fetch(wikidataURL),

      fetch(wikipediaURL),

      fetch(booksURL),

      fetch(countriesURL)

    ]);


    /*
      =========================
      SAFE JSON READER
      =========================
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
      =========================
      WIKIDATA RESULTS
      =========================
    */

    const wikidataResults =
      (wikidataData?.search || [])
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


    /*
      =========================
      WIKIPEDIA RESULTS
      =========================
    */

    const wikipediaResults =
      (wikipediaData?.query?.search || [])
        .slice(0, 5)
        .map(item => ({

          source: "Wikipedia",

          title: item.title || "",

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
      =========================
      OPEN LIBRARY
      =========================
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
      =========================
      REST COUNTRIES
      =========================
    */

    const countryResults =
      Array.isArray(countriesData)
        ? countriesData.slice(0, 5).map(country => ({

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
      =========================
      COMBINE RESULTS
      =========================
    */

    const allResults = [

      ...countryResults,

      ...wikidataResults,

      ...wikipediaResults,

      ...bookResults

    ];


    /*
      =========================
      SMART ENTITY RANKING
      =========================
    */

    const searchText =
      query.toLowerCase();


    function scoreResult(result) {

      const title =
        result.title.toLowerCase();

      let score = 0;


      if (title === searchText) {

        score += 100;

      } else if (
        title.startsWith(searchText)
      ) {

        score += 70;

      } else if (
        title.includes(searchText)
      ) {

        score += 40;

      }


      /*
        Give country results extra
        priority when the country
        name exactly matches.
      */

      if (
        result.source === "REST Countries" &&
        title === searchText
      ) {

        score += 50;

      }


      return score;

    }


    allResults.sort(
      (a, b) =>
        scoreResult(b) -
        scoreResult(a)
    );


    /*
      =========================
      SMART INTENT
      =========================
    */

    let intent = "general";


    if (
      /football|soccer|nba|basketball|tennis|fifa|uefa|premier league|champions league/i
        .test(query)
    ) {

      intent = "sports";

    } else if (
      /anime|manga|manhwa|donghua|one piece|naruto|demon slayer/i
        .test(query)
    ) {

      intent = "anime";

    } else if (
      /game|gaming|playstation|xbox|nintendo|minecraft|codm|fortnite/i
        .test(query)
    ) {

      intent = "games";

    } else if (
      /news|latest|today|breaking/i
        .test(query)
    ) {

      intent = "news";

    } else if (
      /book|novel|author|harry potter/i
        .test(query)
    ) {

      intent = "books";

    } else if (
      countryResults.length > 0
    ) {

      intent = "country";

    }


    /*
      =========================
      ACTIVE SOURCES
      =========================
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
      =========================
      FINAL RESPONSE
      =========================
    */

    return res.status(200).json({

      success: true,

      source:
        "Nexora Multi-Source API",

      query:

        query,

      intent:

        intent,

      entityFocus:

        true,

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
        allResults.slice(0, 15)

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
