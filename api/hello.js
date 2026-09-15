export default async function handler(req, res) {
  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({
      success: false,
      error: "please provide a search query"
    });
  }

  const BBS_KEY = process.env.BBS_API_KEY;

  async function bbsRequest(path) {
    if (!BBS_KEY) {
      return {
        ok: false,
        error: "BBS_API_KEY is missing"
      };
    }

    try {
      const response = await fetch(
        `https://api.bigballsdata.com${path}`,
        {
          headers: {
            Authorization: `Bearer ${BBS_KEY}`,
            "User-Agent": "Nexora/14.1"
          }
        }
      );

      const text = await response.text();

      let data = null;

      try {
        data = JSON.parse(text);
      } catch {
        data = {
          rawResponse: text.slice(0, 500)
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
        error: error.message
      };
    }
  }

  // Test the API key directly.
  const keyTest = await bbsRequest("/v1/user/me");

  // Test football data.
  const standingsTest = await bbsRequest(
    "/v1/standings?sport=football&league=epl"
  );

  return res.status(200).json({
    success: true,
    apiVersion: "V14.1",

    query: q,

    diagnostics: {
      environmentVariablePresent: Boolean(BBS_KEY),

      apiKeyTest: {
        success: keyTest.ok,
        status: keyTest.status || null,
        error: keyTest.error || null
      },

      standingsTest: {
        success: standingsTest.ok,
        status: standingsTest.status || null,
        error: standingsTest.error || null
      }
    },

    security: {
      apiKeyValue: "HIDDEN"
    }
  });
}
