import { MetadataRoute } from "next";
import {
  fetchTherapistNames,
  generateProfileSlug,
} from "./utils/supabaseHelpers";
import { COUNTRIES, REGIONS } from "./utils/locationData";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL; // localhost or https://www.matchya.app

if (!BASE_URL) {
  throw new Error("NEXT_PUBLIC_BASE_URL must be set.");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const startTime = Date.now();
  try {
    const allNames: string[] = [];
    let pageToken: string | undefined;
    const PAGE_SIZE = 60; // Smaller batch size for testing
    let pageCount = 0;

    console.log("[SITEMAP_NEXT] Starting sitemap generation with Supabase...");

    // Fetch all pages
    do {
      pageCount++;
      const fetchStartTime = Date.now();

      console.log(`[SITEMAP_NEXT] Fetching page ${pageCount}:
      - Page token: ${pageToken || "None (first page)"}
      - Names collected so far: ${allNames.length}`);

      const result = await fetchTherapistNames(PAGE_SIZE, pageToken);
      const therapistNames = result.therapistNames;
      pageToken = result.nextPageToken;

      const fetchTime = Date.now() - fetchStartTime;

      console.log(`[SITEMAP_NEXT] Page ${pageCount} results:
      - Names received: ${therapistNames.length}
      - Fetch time (frontend): ${(fetchTime / 1000).toFixed(2)}s
      - Sample names: ${JSON.stringify(therapistNames.slice(0, 3))}...`);

      allNames.push(...therapistNames);
    } while (pageToken);

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`[SITEMAP_NEXT] Fetch phase complete:
      - Total pages: ${pageCount}
      - Total names: ${allNames.length}
      - Total time: ${totalTime.toFixed(2)}s
      - Avg time per page: ${(totalTime / pageCount).toFixed(2)}s`);

    const lastModifiedDate = new Date();

    // Static routes - these rarely change
    const routes = [
      {
        url: BASE_URL,
        lastModified: lastModifiedDate,
        changeFrequency: "daily" as const,
        priority: 1,
      },
      {
        url: `${BASE_URL}/about`,
        lastModified: lastModifiedDate,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      },
      {
        url: `${BASE_URL}/contact`,
        lastModified: lastModifiedDate,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      },
      // Add therapist directory routes
      {
        url: `${BASE_URL}/therapists/browse`,
        lastModified: lastModifiedDate,
        changeFrequency: "daily" as const,
        priority: 0.9,
      },
    ] as MetadataRoute.Sitemap;

    // Add country-level routes
    Object.keys(COUNTRIES).forEach((countryCode) => {
      routes.push({
        url: `${BASE_URL}/therapists/browse/${countryCode}`,
        lastModified: lastModifiedDate,
        changeFrequency: "daily" as const,
        priority: 0.9,
      });

      // Add region-level routes for each country
      if (REGIONS[countryCode]) {
        Object.keys(REGIONS[countryCode]).forEach((regionCode) => {
          routes.push({
            url: `${BASE_URL}/therapists/browse/${countryCode}/${regionCode}`,
            lastModified: lastModifiedDate,
            changeFrequency: "daily" as const,
            priority: 0.9,
          });
        });
      }
    });

    // Process all therapist routes in chunks
    const CHUNK_SIZE = 60; // Smaller chunks for testing
    const processStartTime = Date.now();
    let processedCount = 0;

    for (let i = 0; i < allNames.length; i += CHUNK_SIZE) {
      const chunkStartTime = Date.now();
      const chunk = allNames.slice(i, i + CHUNK_SIZE);

      const therapistRoutes = chunk.map((name) => {
        const url = `${BASE_URL}/therapists/${generateProfileSlug(name)}`;
        return {
          url,
          lastModified: lastModifiedDate,
          changeFrequency: "weekly" as const,
          priority: 0.9,
        };
      });

      processedCount += chunk.length;
      const chunkTime = Date.now() - chunkStartTime;

      console.log(
        `[SITEMAP_NEXT] Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}:
      - Processed: ${processedCount}/${allNames.length}
      - Chunk time: ${(chunkTime / 1000).toFixed(3)}s
      - Sample URLs: ${
          JSON.stringify(
            therapistRoutes.slice(0, 2),
            null,
            2,
          )
        }...`,
      );

      routes.push(...therapistRoutes);
    }

    const totalProcessTime = (Date.now() - processStartTime) / 1000;
    console.log(`[SITEMAP_NEXT] Generation complete:
- Total routes: ${routes.length}
- Processing time: ${totalProcessTime.toFixed(2)}s
- Total time: ${((Date.now() - startTime) / 1000).toFixed(2)}s
- Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    return routes;
  } catch (error) {
    console.error("[SITEMAP_NEXT] Fatal error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      stage: "sitemap generation",
      timeElapsed: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
      memoryUsage: `${
        Math.round(
          process.memoryUsage().heapUsed / 1024 / 1024,
        )
      }MB`,
    });
    return []; // Return empty sitemap on error
  }
}
