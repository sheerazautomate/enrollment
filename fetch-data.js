// Dual-Layer Self-Healing Data Fetcher for Supabase + Local JSON Map
async function convertGoogleSheetData() {
  const supabaseBaseUrl = "https://gdxdwpcllcerevqporlh.supabase.co/rest/v1/base";
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkeGR3cGNsbGNlcmV2cXBvcmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzI0MjEsImV4cCI6MjA5NTk0ODQyMX0.Lpw95wrkrYk-1vjzNEBLur8yrGnV-9hwYK0I5q50Ens";
  const jsonUrl = "data/live_enrollment.json";
  
  try {
    // 1. Fetch live enrollment delta map from your repository asset
    console.log("Loading live enrollment map...");
    let enrollmentMap = {};
    try {
      const jsonResponse = await fetch(jsonUrl);
      enrollmentMap = await jsonResponse.json();
    } catch (jsonErr) {
      console.warn("Could not load live_enrollment.json, defaulting to 0 for live stats:", jsonErr);
    }
    
    // 2. Loop page requests to download all records from database clusters
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
      
      if (!response.ok) throw new Error(`Supabase error: ${response.status}`);
      const chunk = await response.json();
      
      if (!chunk || chunk.length === 0) {
        hasMore = false;
      } else {
        allDbRows = allDbRows.concat(chunk);
        offset += limit;
        if (chunk.length < limit) hasMore = false;
      }
    }
    
    console.log(`Successfully pulled ${allDbRows.length} total records from Supabase database.`);
    
    // 🔍 UNMISSABLE DEBUG LOG: Prints column names in bright neon green text in your console
    if (allDbRows.length > 0) {
      console.log("%c👉 YOUR ACTUAL SUPABASE COLUMN KEYS ARE:", "background: #222; color: #bada55; font-size: 14px; padding: 6px;", Object.keys(allDbRows[0]));
      console.log("👉 REAL DATA SAMPLE ROW:", allDbRows[0]);
    }
    
    // 3. Transform database objects to layout arrays matching index.html positions
    const mappedData = allDbRows.map(row => {
      const rowKeys = Object.keys(row);
      
      // Helper function to find keys regardless of spaces, casing, or underscores
      const getField = (targetName, fallbacks = []) => {
        const clean = (str) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetClean = clean(targetName);
        const fallbackCleans = fallbacks.map(f => clean(f));
        
        for (let key in row) {
          if (clean(key) === targetClean || fallbackCleans.includes(clean(key))) {
            return row[key];
          }
        }
        return null;
      };

      // Layer A: Attempt Smart Character-Insensitive Name Matching
      let district = getField("District", ["district_name", "dist", "district"]);
      let tehsil   = getField("Tehsil", ["tehsil_name", "tehsil"]);
      let markaz   = getField("Markaz", ["markaz_name", "markaz"]);
      let wing     = getField("Wing", ["gender", "type", "wing_name", "wing"]);
      let emis     = getField("EMIS Code", ["emis", "emis_code", "school_emis", "emiscode"]);
      let school   = getField("School", ["school_name", "schoolname", "school"]);
      let baseline = getField("Baseline", ["base_enrollment", "baseline_enrollment", "baseline"]);
      let target   = getField("Target", ["target_enrollment", "target"]);
      let previous = getField("Previous", ["prev_enrollment", "previous_enrollment", "previous"]);
      let newTarget= getField("New Target", ["new_target", "nt", "newtarget"]);

      // Layer B: Positional Fallback (If Supabase completely scrambled column names, match via your original CSV column indices)
      if (district === null && rowKeys.length > 0) district = row[rowKeys[0]];
      if (tehsil === null && rowKeys.length > 1) tehsil = row[rowKeys[1]];
      if (markaz === null && rowKeys.length > 2) markaz = row[rowKeys[2]];
      if (wing === null && rowKeys.length > 3) wing = row[rowKeys[3]];
      if (emis === null && rowKeys.length > 5) emis = row[rowKeys[5]];       // Index 5 was EMIS in CSV
      if (school === null && rowKeys.length > 6) school = row[rowKeys[6]];   // Index 6 was School Name
      if (baseline === null && rowKeys.length > 12) baseline = row[rowKeys[12]];
      if (target === null && rowKeys.length > 17) target = row[rowKeys[17]];
      if (previous === null && rowKeys.length > 21) previous = row[rowKeys[21]];
      if (newTarget === null && rowKeys.length > 13) newTarget = row[rowKeys[13]];

      // Clean up final values safely
      const districtStr = String(district || "").toUpperCase().trim();
      const emisStr     = String(emis || "").trim();
      
      const liveEnrollment = enrollmentMap[emisStr] !== undefined ? parseInt(enrollmentMap[emisStr]) : null;
      const baselineNum   = parseInt(baseline) || 0;
      const finalCurrent  = liveEnrollment !== null ? liveEnrollment : baselineNum;

      return [
        districtStr,                          // Index 0: District
        String(tehsil || "").trim(),          // Index 1: Tehsil
        String(markaz || "").trim(),          // Index 2: Markaz
        String(wing || "").trim(),            // Index 3: Wing
        emisStr,                              // Index 4: EMIS
        String(school || "").trim(),          // Index 5: School Name
        baselineNum,                          // Index 6: Baseline
        finalCurrent,                         // Index 7: Current
        parseInt(target) || 0,                // Index 8: Target
        parseInt(previous) || 0,              // Index 9: Previous
        parseInt(newTarget) || 0              // Index 10: New Target
      ];
    }).filter(r => r[4] || r[0]); // Loosened safety check to prevent dropping rows
    
    console.log(`Successfully processed and prepared ${mappedData.length} valid active rows for your layout layout.`);
    return mappedData;
    
  } catch (error) {
    console.error("Critical error in data integration pipeline:", error);
    return [];
  }
}
