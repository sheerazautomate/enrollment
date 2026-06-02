// Smart-matching data fetcher for Supabase + local JSON setup
async function convertGoogleSheetData() {
  const supabaseBaseUrl = "https://gdxdwpcllcerevqporlh.supabase.co/rest/v1/base";
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkeGR3cGNsbGNlcmV2cXBvcmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzI0MjEsImV4cCI6MjA5NTk0ODQyMX0.Lpw95wrkrYk-1vjzNEBLur8yrGnV-9hwYK0I5q50Ens";
  const jsonUrl = "data/live_enrollment.json";
  
  try {
    // 1. Fetch the daily compressed enrollment file from your repository
    console.log("Loading live enrollment map...");
    const jsonResponse = await fetch(jsonUrl);
    const enrollmentMap = await jsonResponse.json();
    
    // 2. Fetch all school entries from Supabase using our pagination loop
    let allDbRows = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;
    
    console.log("Fetching base school configurations from Supabase...");
    while (hasMore) {
      const paginatedUrl = `${supabaseBaseUrl}?limit=${limit}&offset=${offset}&select=*`;
      const response = await fetch(paginatedUrl, {
        headers: {
          "apikey": anonKey,
          "Authorization": `Bearer ${anonKey}`
        }
      });
      
      const chunk = await response.json();
      
      if (!chunk || chunk.length === 0) {
        hasMore = false;
      } else {
        allDbRows = allDbRows.concat(chunk);
        offset += limit;
        if (chunk.length < limit) {
          hasMore = false;
        }
      }
    }
    
    console.log(`Successfully pulled ${allDbRows.length} total records from Supabase.`);
    
    // 🔍 DEBUG WINDOW: This prints your exact database column keys right into your browser inspector
    if (allDbRows.length > 0) {
      console.log("👉 REAL SUPABASE ROW OBJECT KEYS:", Object.keys(allDbRows[0]));
      console.log("👉 SAMPLE DATA ROW:", allDbRows[0]);
    }

    // 3. Map database properties using a case/space-insensitive alias utility
    const mappedData = allDbRows.map(row => {
      
      // Dynamic Helper: Checks matching aliases across standard formatting permutations
      const readField = (aliases) => {
        for (let alias of aliases) {
          if (row[alias] !== undefined && row[alias] !== null) return row[alias];
          
          // Fallback: Check exact lowercase
          const lower = alias.toLowerCase();
          if (row[lower] !== undefined && row[lower] !== null) return row[lower];
          
          // Fallback: Check standard snake_case conversion (spaces to underscores)
          const snake = alias.toLowerCase().replace(/\s+/g, '_');
          if (row[snake] !== undefined && row[snake] !== null) return row[snake];
        }
        return "";
      };

      // Safely extract the primary key
      const emisStr = String(readField(["EMIS Code", "School EMIS", "emis", "emis_code"])).trim();
      
      // Look up our fresh enrollment mapping entry
      const liveEnrollment = enrollmentMap[emisStr] || 0;
      
      return [
        String(readField(["District", "district"])).toUpperCase().trim(),            // Index 0: District
        String(readField(["Tehsil", "tehsil"])).trim(),                              // Index 1: Tehsil
        String(readField(["Markaz", "markaz"])).trim(),                              // Index 2: Markaz
        String(readField(["Wing", "wing"])).trim(),                                  // Index 3: Wing
        emisStr,                                                                     // Index 4: EMIS
        String(readField(["School", "School Name", "school", "school_name"])).trim(),// Index 5: School
        parseInt(readField(["Baseline", "baseline"])) || 0,                          // Index 6: Baseline
        liveEnrollment,                                                              // Index 7: Current (Live JSON match)
        parseInt(readField(["Target", "target"])) || 0,                              // Index 8: Target
        parseInt(readField(["Previous", "previous"])) || 0,                          // Index 9: Previous
        parseInt(readField(["New Target", "new_target"])) || 0                       // Index 10: New Target
      ];
    }).filter(r => r[4] && r[0]); // Filters out empty structural artifacts missing names or keys
    
    console.log(`Successfully mapped and finalized ${mappedData.length} active rows for dashboard consumption.`);
    return mappedData;
    
  } catch (error) {
    console.error("Critical dashboard synthesis failure:", error);
    return [];
  }
}
