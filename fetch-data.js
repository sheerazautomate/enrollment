// Complete Bulletproof Data Fetcher for Supabase + Local JSON Map
async function convertGoogleSheetData() {
  const supabaseBaseUrl = "https://gdxdwpcllcerevqporlh.supabase.co/rest/v1/base";
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkeGR3cGNsbGNlcmV2cXBvcmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzI0MjEsImV4cCI6MjA5NTk0ODQyMX0.Lpw95wrkrYk-1vjzNEBLur8yrGnV-9hwYK0I5q50Ens";
  const jsonUrl = "data/live_enrollment.json";
  
  try {
    // 1. Fetch the compressed enrollment JSON asset from your repository
    console.log("Loading live enrollment map...");
    let enrollmentMap = {};
    try {
      const jsonResponse = await fetch(jsonUrl);
      enrollmentMap = await jsonResponse.json();
    } catch (jsonErr) {
      console.warn("Could not load live_enrollment.json, defaulting to 0 for live stats:", jsonErr);
    }
    
    // 2. Paginate through Supabase to pull all 38,000+ records
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
      
      if (!response.ok) {
        throw new Error(`Supabase API communication error: ${response.status}`);
      }
      
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
    
    console.log(`Successfully pulled ${allDbRows.length} total records from Supabase database.`);
    
    // 3. Map records into the exact 11-index array system required by your layout
    const mappedData = allDbRows.map(row => {
      
      // Helper function to find keys regardless of spaces, casing, or underscores
      const getField = (targetName, fallbacks = []) => {
        const clean = (str) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetClean = clean(targetName);
        const fallbackCleans = fallbacks.map(f => clean(f));
        
        // Loop through all keys in this database row to find a structural match
        for (let key in row) {
          const keyClean = clean(key);
          if (keyClean === targetClean || fallbackCleans.includes(keyClean)) {
            return row[key];
          }
        }
        return "";
      };

      // Extract properties using flexible name variations
      const districtValue = String(getField("District", ["district_name", "dist"])).toUpperCase().trim();
      const tehsilValue   = String(getField("Tehsil", ["tehsil_name"])).trim();
      const markazValue   = String(getField("Markaz", ["markaz_name"])).trim();
      const wingValue     = String(getField("Wing", ["gender", "type"])).trim();
      const schoolValue   = String(getField("School", ["school_name", "schoolname"])).trim();
      
      // Strict matching for EMIS key to connect with live JSON map metrics
      const emisStr = String(getField("EMIS Code", ["emis", "emis_code", "school_emis"])).trim();
      
      // Read live status values from matching JSON object keys
      const liveEnrollment = enrollmentMap[emisStr] !== undefined ? parseInt(enrollmentMap[emisStr]) : null;
      
      // Read integers safely
      const baselineValue = parseInt(getField("Baseline", ["base_enrollment"])) || 0;
      const targetValue   = parseInt(getField("Target", ["target_enrollment"])) || 0;
      const previousValue = parseInt(getField("Previous", ["prev_enrollment"])) || 0;
      const newTargetVal  = parseInt(getField("New Target", ["new_target", "nt"])) || 0;
      
      // If live map doesn't have it, fall back safely to whatever baseline or database value is available
      const finalCurrentValue = liveEnrollment !== null ? liveEnrollment : baselineValue;

      // Return array index addresses perfectly tailored to your unchanged index.html layout
      return [
        districtValue,     // Index 0: District
        tehsilValue,       // Index 1: Tehsil
        markazValue,       // Index 2: Markaz
        wingValue,         // Index 3: Wing
        emisStr,           // Index 4: EMIS
        schoolValue,       // Index 5: School Name
        baselineValue,     // Index 6: Baseline
        finalCurrentValue, // Index 7: Current (Live Dynamic Metric)
        targetValue,       // Index 8: Target
        previousValue,     // Index 9: Previous
        newTargetVal       // Index 10: New Target
      ];
    }).filter(r => r[4] && r[0]); // Drops empty layout rows missing an EMIS code or a District
    
    console.log(`Successfully processed and prepared ${mappedData.length} valid active rows for your layout layout.`);
    return mappedData;
    
  } catch (error) {
    console.error("Critical error in data integration pipeline:", error);
    // Return empty array on crash so dashboard loader components handle it gracefully
    return [];
  }
}
