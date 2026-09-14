export default async function handler(req, res) {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({
      error: "Please provide a search query"
    });
  }

  try {
    const url =
      "https://www.wikidata.org/w/api.php" +
      "?action=wbsearchentities" +
      "&search=" + encodeURIComponent(query) +
      "&language=en" +
      "&format=json" +
      "&origin=*";

    const response = await fetch(url);
    const data = await response.json();

    const results = (data.search || []).slice(0, 5).map(item => ({
      id: item.id,
      title: item.label || "",
      description: item.description || "",
      url: "https://www.wikidata.org/wiki/" + item.id
    }));

    res.status(200).json({
      source: "Wikidata",
      query: query,
      results: results
    });

  } catch (error) {
    res.status(500).json({
      error: "Nexora API failed",
      message: error.message
    });
  }
}
