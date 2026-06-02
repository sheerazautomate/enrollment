// Fetches static metadata from Supabase and applies the daily live enrollment map
async function convertGoogleSheetData() {
  const supabaseBaseUrl = "https://gdxdwpcllcerevqporlh.supabase.co/rest/v1/base";
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkeGR3cGNsbGNlcmV2cXBvcmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzI0MjEsImV4cCI6MjA5NTk0ODQyMX0.Lpw95wrkrYk-1vjzNEBLur8yrGnV-9hwYK0I5q50Ens";
  const jsonUrl = "data/live_enrollment.json";
  
  try {
    // 1. Fetch the daily compressed enrollment file from your repository
    console.log("Loading live enrollment map...");
    const jsonResponse = await fetch(jsonUrl);
    const enrollmentMap = await jsonResponse.json();
    
    // 2. Fetch all school entries from Supabase using an automated pagination loop
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
        
        // If the chunk size is less than our page limit, we have successfully reached the end
        if (chunk.length < limit) {
          hasMore = false;
        }
      }
    }
    
    console.log(`Successfully pulled ${allDbRows.length} total records from Supabase database.`);
    
    // 3. Map database properties directly back into your custom dashboard index positions
    const mappedData = allDbRows.map(row => {
      // Handles flexible casing variants for the EMIS primary key column name
      const emisValue = row.emis || row["EMIS Code"] || row["School EMIS"] || "";
      const emisStr = String(emisValue).trim();
      
      // Intercept index position 7 (Current) and replace it with the fresh data tracking JSON asset
      const liveEnrollment = enrollmentMap[emisStr] || 0;
      
      return [
        row.District || row.district || "",                                         // Index 0: District
        row.Tehsil || row.tehsil || "",                                             // Index 1: Tehsil
        row.Markaz || row.markaz || "",                                             // Index 2: Markaz
        row.Wing || row.wing || "",                                                 // Index 3: Wing
        emisStr,                                                                    // Index 4: EMIS
        row.School || row.school || row["School Name"] || "",                       // Index 5: School
        parseInt(row.Baseline || row.baseline || row["Baseline"]) || 0,             // Index 6: Baseline
        liveEnrollment,                                                             // Index 7: Current (Live from JSON!)
        parseInt(row.Target || row.target || row["Target"]) || 0,                   // Index 8: Target
        parseInt(row.Previous || row.previous || row["Previous"]) || 0,             // Index 9: Previous
        parseInt(row["New Target"] || row.new_target || row["New Target Column"]) || 0 // Index 10: New Target
      ];
    }).filter(r => r[4]); // Safety strip to eliminate blank formatting elements that lack EMIS profiles
    
    return mappedData;
    
  } catch (error) {
    console.error("Critical dashboard synthesis failure:", error);
    return [];
  }
}
