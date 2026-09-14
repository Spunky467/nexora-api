export default async function handler(req, res) {

  const query = String(req.query.q || "").trim();

  if (!query) {
    return res.status(400).json({
      success: false,
      error: "Please provide a search query"
    });
  }

  try {

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

    const results = await Promise.allSettled([

      fetch(wikidataURL),

      fetch(wikipediaURL),

      fetch(booksURL)

    ]);

    /*
      Safely read JSON.
      If a source returns HTML or another
      unexpected response, Nexora skips it.
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
      await safeJSON(results[0]);

    const wikipediaData =
      await safeJSON(results[1]);

    const booksData =
      await safeJSON(results[2]);

    /*
      WIKIDATA
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
      WIKIPEDIA
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
      OPEN LIBRARY
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
      COMBINE RESULTS
    */

    const allResults = [

      ...wikidataResults,

      ...wikipediaResults,

      ...bookResults

    ];

    /*
      ENTITY-FIRST RANKING
    */

    const searchText =
      query.toLowerCase();

    allResults.sort((a, b) => {

      const aTitle =
        a.title.toLowerCase();

      const bTitle =
        b.title.toLowerCase();

      function score(title) {

        if (title === searchText) {
          return 100;
        }

        if (title.startsWith(searchText)) {
          return 70;
        }

        if (title.includes(searchText)) {
          return 40;
        }

        return 0;

      }

      return score(bTitle) - score(aTitle);

    });

    /*
      INTENT
    */

    let intent = "general";

    if (
      /football|soccer|nba|basketball|tennis|fifa|uefa|premier league|champions league/i
        .test(query)
    ) {

      intent = "sports";

    } else if (
      /anime|manga|manhwa|donghua/i
        .test(query)
    ) {

      intent = "anime";

    } else if (
      /game|gaming|playstation|xbox|nintendo|minecraft|codm/i
        .test(query)
    ) {

      intent = "games";

    } else if (
      /news|latest|today|breaking/i
        .test(query)
    ) {

      intent = "news";

    } else if (
      /book|novel|author/i
        .test(query)
    ) {

      intent = "books";

    }

    /*
      SOURCES THAT ACTUALLY RESPONDED
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

    /*
      FINAL RESPONSE
    */

    return res.status(200).json({

      success: true,

      source: "Nexora Multi-Source API",

      query: query,

      intent: intent,

      entityFocus: true,

      activeSources: activeSources,

      sources: {

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

      error: "Nexora API failed",

      message: error.message

    });

  }

}
