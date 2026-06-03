// High-Performance Data Compiler (Flexible Live Sync)
async function convertGoogleSheetData() {
  const baseSchoolsUrl      = "data/base_schools.json";
  const liveEnrollmentUrl   = "data/live_enrollment.json";
  const yesterdayEnrollmentUrl = "data/yesterday_enrollment.json";
  
  try {
    console.log("🚀 Loading fast cache data layers...");
    
    // Fetch all three assets in parallel
    const [baseResponse, liveResponse, yesterdayResponse] = await Promise.all([
      fetch(baseSchoolsUrl),
      fetch(liveEnrollmentUrl).catch(() => null),
      fetch(yesterdayEnrollmentUrl).catch(() => null)
    ]);
    
    if (!baseResponse.ok) throw new Error("Failed to load base_schools.json profile configuration.");
    const baseSchools = await baseResponse.json();
    
    // Parse live enrollment — flat { "EMIS": count }
    let liveRawData = {};
    if (liveResponse && liveResponse.ok) {
      liveRawData = await liveResponse.json();
    }

    // Parse yesterday enrollment — same flat { "EMIS": count } format
    let yesterdayRawData = {};
    if (yesterdayResponse && yesterdayResponse.ok) {
      yesterdayRawData = await yesterdayResponse.json();
    }

    // Build lookup maps: { "EMIS": count }
    // Both files are flat dicts so no parsing acrobatics needed
    const liveMap      = {};
    const yesterdayMap = {};

    for (const emis in liveRawData) {
      liveMap[String(emis).trim()] = parseInt(liveRawData[emis]) || 0;
    }

    for (const emis in yesterdayRawData) {
      yesterdayMap[String(emis).trim()] = parseInt(yesterdayRawData[emis]) || 0;
    }

    console.log(`✅ Successfully mapped structural profiles with live CSV-JSON assets.`);
    
    // Assemble the complete 11-index tracking array for the interface
    return baseSchools.map(row => {
      const emisStr = String(row[4]).trim();

      const baseline  = parseInt(row[6]) || 0;
      const target    = parseInt(row[7]) || 0;
      const newTarget = parseInt(row[8]) || 0;

      // Current enrollment from live file, fallback to baseline if school not found
      const current = (liveMap[emisStr] !== undefined)
        ? liveMap[emisStr]
        : baseline;

      // Yesterday enrollment from yesterday file.
      // Falls back to current so delta shows 0 rather than a misleading number.
      const yesterday = (yesterdayMap[emisStr] !== undefined)
        ? yesterdayMap[emisStr]
        : current;
      
      return [
        String(row[0]).toUpperCase().trim(), // Index 0: District
        String(row[1]).trim(),               // Index 1: Tehsil
        String(row[2]).trim(),               // Index 2: Markaz
        String(row[3]).trim(),               // Index 3: Wing
        emisStr,                             // Index 4: EMIS
        String(row[5]).trim(),               // Index 5: School Name
        baseline,                            // Index 6: Baseline
        current,                             // Index 7: Current Enrollment (Live!)
        target,                              // Index 8: Target
        yesterday,                           // Index 9: Yesterday Enrollment (Delta base)
        newTarget                            // Index 10: New Target
      ];
    });
    
  } catch (error) {
    console.error("❌ Critical error inside data synthesis engine:", error);
    return [];
  }
}
