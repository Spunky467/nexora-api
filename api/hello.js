export default async function handler(req, res) {
    try {
        const query = String(req.query.q || "").trim();

        if (!query) {
            return res.status(200).json({
                apiVersion: "V15.2",
                message: "Nexora API is running."
            });
        }

        const q = query.toLowerCase().replace(/\s+/g, " ");

        /* =========================
           ALIASES
        ========================= */

        const aliases = {
            "ronaldo": "cristiano ronaldo",
            "cr7": "cristiano ronaldo",
            "messi": "lionel messi",
            "mbappe": "kylian mbappe",
            "haaland": "erling haaland",

            "epl": "premier league",
            "ucl": "champions league",

            "barca": "barcelona",
            "rm": "real madrid",

            "man u": "manchester united",
            "man utd": "manchester united",

            "s24": "samsung galaxy s24",
            "samsung s24": "samsung galaxy s24"
        };

        const normalizedQuery =
            aliases[q] || q;


        /* =========================
           INTENT
        ========================= */

        let intent = "general";

        if (
            q.startsWith("how to ") ||
            q.includes("how do i ") ||
            q.includes("how can i ")
        ) {
            intent = "how_to";
        }

        else if (
            q.includes("standings") ||
            q.includes("league table") ||
            q.includes("table")
        ) {
            intent = "sports_standings";
        }

        else if (
            q.includes("stats") ||
            q.includes("statistics")
        ) {
            intent = "player_stats";
        }

        else if (
            q.includes("matches") ||
            q.includes("fixtures") ||
            q.includes("schedule")
        ) {
            intent = "sports_matches";
        }

        else if (
            q.includes("news") ||
            q.includes("latest")
        ) {
            intent = "sports_news";
        }

        else if (
            normalizedQuery.includes("samsung galaxy s24") ||
            q.includes("iphone") ||
            q.includes("playstation") ||
            q.includes("xbox") ||
            q.includes("laptop") ||
            q.includes("phone") ||
            q.includes("smart tv")
        ) {
            intent = "product";
        }


        /* =========================
           HOW TO
        ========================= */

        if (intent === "how_to") {

            const task =
                query
                    .replace(/^how\s+to\s+/i, "")
                    .trim();

            let steps = [];

            const taskLower = task.toLowerCase();

            if (
                taskLower.includes("barb") ||
                taskLower.includes("haircut")
            ) {

                steps = [
                    "Wash and dry your hair first.",
                    "Choose the haircut style and decide how short you want the sides.",
                    "Start with the sides using the appropriate clipper guard.",
                    "Gradually reduce the guard size and blend the different lengths.",
                    "Clean the hairline around the forehead, ears and neck.",
                    "Check both sides in a mirror and correct uneven areas.",
                    "Brush away loose hair and finish with your preferred hair product."
                ];

            }

            else if (
                taskLower.includes("cook rice") ||
                taskLower.includes("make rice")
            ) {

                steps = [
                    "Measure and rinse the rice.",
                    "Put the rice and the appropriate amount of water into a pot.",
                    "Add salt or seasoning if desired.",
                    "Bring the water to a boil.",
                    "Reduce the heat and cover the pot.",
                    "Allow the rice to cook until the water is absorbed.",
                    "Fluff the rice and serve."
                ];

            }

            else if (
                taskLower.includes("tie a tie") ||
                taskLower.includes("tie tie")
            ) {

                steps = [
                    "Place the tie around your neck with the wide end hanging lower.",
                    "Cross the wide end over the narrow end.",
                    "Wrap the wide end around the narrow end.",
                    "Bring the wide end through the neck loop.",
                    "Pull it down through the front loop.",
                    "Tighten the knot and adjust it against your collar."
                ];

            }

            else if (
                taskLower.includes("screenshot")
            ) {

                steps = [
                    "Open the screen you want to capture.",
                    "Use your device's screenshot button combination.",
                    "Wait for the screenshot preview or notification.",
                    "Open your Photos or Gallery app.",
                    "Crop or edit the screenshot if necessary."
                ];

            }

            else {

                steps = [
                    `Understand what you want to accomplish: ${task}.`,
                    "Gather the tools or information you need.",
                    "Follow the process one step at a time.",
                    "Check your result before continuing.",
                    "Make any necessary adjustments and finish."
                ];

            }

            return res.status(200).json({
                apiVersion: "V15.2",

                understanding: {
                    originalQuery: query,
                    normalizedQuery,
                    intent,
                    confidence: "high"
                },

                howTo: {
                    title: `How to ${task}`,
                    task,
                    type: "step_by_step",
                    steps
                },

                activeSources: [
                    "Nexora Intelligence Engine"
                ]
            });

        }


        /* =========================
           SPORTS
        ========================= */

        const sportsQueries = [
            "premier league",
            "champions league",
            "arsenal",
            "chelsea",
            "liverpool",
            "manchester united",
            "manchester city",
            "real madrid",
            "barcelona",
            "cristiano ronaldo",
            "lionel messi",
            "kylian mbappe",
            "erling haaland"
        ];

        const isSports =
            sportsQueries.some(
                item =>
                    normalizedQuery.includes(item)
            );


        if (
            isSports &&
            (
                intent === "sports_standings" ||
                intent === "sports_matches" ||
                intent === "player_stats" ||
                intent === "sports_news"
            )
        ) {

            const apiKey =
                process.env.BBS_API_KEY;

            if (!apiKey) {

                return res.status(500).json({
                    apiVersion: "V15.2",
                    error: "BBS_API_KEY is missing"
                });

            }


            /* =========================
               LEAGUE MAP
            ========================= */

            let league = null;

            if (
                normalizedQuery.includes(
                    "premier league"
                )
            ) {
                league = "epl";
            }

            else if (
                normalizedQuery.includes(
                    "champions league"
                )
            ) {
                league = "ucl";
            }


            /* =========================
               STANDINGS
            ========================= */

            if (
                intent ===
                "sports_standings"
            ) {

                if (!league) {

                    return res.status(200).json({
                        apiVersion: "V15.2",

                        understanding: {
                            originalQuery: query,
                            normalizedQuery,
                            intent,
                            confidence: "medium"
                        },

                        sports: {
                            type: "standings",
                            data: []
                        },

                        answer: {
                            title: "League Standings",
                            text:
                                "Nexora needs a specific competition for the table."
                        }
                    });

                }

                const url =
                    "https://api.bigballsdata.com/v1/standings" +
                    "?sport=football" +
                    "&league=" +
                    encodeURIComponent(league);

                const response =
                    await fetch(url, {
                        headers: {
                            "Authorization":
                                `Bearer ${apiKey}`,
                            "Accept":
                                "application/json"
                        }
                    });

                const raw =
                    await response.json();

                if (!response.ok) {

                    return res.status(response.status).json({
                        apiVersion: "V15.2",
                        error: "Sports API standings request failed",
                        details: raw
                    });

                }

                return res.status(200).json({

                    apiVersion: "V15.2",

                    understanding: {
                        originalQuery: query,
                        normalizedQuery,
                        intent,
                        confidence: "high"
                    },

                    sports: {
                        type: "standings",
                        league,
                        data:
                            Array.isArray(raw.data)
                            ?
                            raw.data
                            :
                            []
                    },

                    answer: {
                        title:
                            league === "epl"
                            ?
                            "Premier League Standings"
                            :
                            "Champions League Standings",

                        text:
                            "Current league standings."
                    },

                    activeSources: [
                        "Nexora Sports Engine",
                        "Big Balls Sports Data"
                    ]

                });

            }


            /* =========================
               MATCHES
            ========================= */

            if (
                intent ===
                "sports_matches"
            ) {

                let url =
                    "https://api.bigballsdata.com/v1/matches" +
                    "?sport=football" +
                    "&limit=20";

                if (league) {

                    url +=
                        "&league=" +
                        encodeURIComponent(
                            league
                        );

                }

                const response =
                    await fetch(url, {
                        headers: {
                            "Authorization":
                                `Bearer ${apiKey}`,
                            "Accept":
                                "application/json"
                        }
                    });

                const raw =
                    await response.json();

                return res.status(200).json({

                    apiVersion: "V15.2",

                    understanding: {
                        originalQuery: query,
                        normalizedQuery,
                        intent,
                        confidence: "high"
                    },

                    sports: {
                        type: "matches",
                        league,
                        data:
                            Array.isArray(raw.data)
                            ?
                            raw.data
                            :
                            []
                    },

                    answer: {
                        title: "Football Matches",
                        text: "Nexora found football fixtures."
                    },

                    activeSources: [
                        "Nexora Sports Engine",
                        "Big Balls Sports Data"
                    ]

                });

            }

        }


        /* =========================
           PRODUCT
        ========================= */

        if (intent === "product") {

            let productName =
                normalizedQuery;

            if (
                normalizedQuery ===
                "samsung galaxy s24"
            ) {

                productName =
                    "Samsung Galaxy S24";

            }

            return res.status(200).json({

                apiVersion: "V15.2",

                understanding: {
                    originalQuery: query,
                    normalizedQuery,
                    intent,
                    confidence: "high"
                },

                product: {
                    name: productName,
                    type: "technology_product"
                },

                activeSources: [
                    "Nexora Intelligence Engine"
                ]

            });

        }


        /* =========================
           WIKIPEDIA FALLBACK
        ========================= */

        let wikiResults = [];

        try {

            const wikiURL =
                "https://en.wikipedia.org/w/api.php" +
                "?action=query" +
                "&generator=search" +
                "&gsrsearch=" +
                encodeURIComponent(
                    normalizedQuery
                ) +
                "&gsrnamespace=0" +
                "&gsrlimit=5" +
                "&prop=extracts|pageimages|info" +
                "&exintro=1" +
                "&explaintext=1" +
                "&inprop=url" +
                "&piprop=thumbnail" +
                "&pithumbsize=500" +
                "&format=json" +
                "&origin=*";

            const response =
                await fetch(wikiURL);

            const data =
                await response.json();

            const pages =
                data.query?.pages || {};

            wikiResults =
                Object.values(pages)
                    .map(page => ({
                        title: page.title,
                        description:
                            page.extract ||
                            "No description available.",
                        image:
                            page.thumbnail?.source ||
                            "",
                        url:
                            page.fullurl ||
                            "",
                        source: "Wikipedia"
                    }));

        } catch (error) {

            wikiResults = [];

        }


        return res.status(200).json({

            apiVersion: "V15.2",

            understanding: {
                originalQuery: query,
                normalizedQuery,
                intent,
                confidence: "medium"
            },

            wikipedia: wikiResults,

            activeSources: [
                "Nexora Intelligence Engine",
                "Wikipedia"
            ]

        });


    } catch (error) {

        console.error(error);

        return res.status(500).json({

            apiVersion: "V15.2",

            error:
                error.message ||
                "Nexora API error"

        });

    }
}
