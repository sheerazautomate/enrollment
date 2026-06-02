// High-Performance Data Compiler (Flexible Live Sync)
async function convertGoogleSheetData() {
  const baseSchoolsUrl = "data/base_schools.json";
  const liveEnrollmentUrl = "data/live_enrollment.json";
  
  try {
    console.log("🚀 Loading fast cache data layers...");
    
    // Fetch both assets at the same time
    const [baseResponse, liveResponse] = await Promise.all([
      fetch(baseSchoolsUrl),
      fetch(liveEnrollmentUrl).catch(() => null)
    ]);
    
    if (!baseResponse.ok) throw new Error("Failed to load base_schools.json profile configuration.");
    const baseSchools = await baseResponse.json();
    
    let liveRawData = [];
    if (liveResponse && liveResponse.ok) {
      liveRawData = await liveResponse.json();
    }
    
    // Create a flexible lookup map to normalize your existing live file data
    const liveMap = {};
    
    // Helper function to remove spaces, underscores, and casing for bulletproof matching
    const cleanKey = (str) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const findValue = (obj, possibleNames) => {
      for (let key in obj) {
        if (possibleNames.includes(cleanKey(key))) return obj[key];
      }
      return null;
    };

    // Parse your live data file dynamically whether it's an Array or an Object map
    if (Array.isArray(liveRawData)) {
      liveRawData.forEach(row => {
        const emis = findValue(row, ['emiscode', 'emis', 'semiscode', 'emis_code']);
        if (emis) {
          const current = findValue(row, ['currentenrolment', 'current', 'livecurrent', 'currentenrollment']);
          const yesterday = findValue(row, ['yesterdaysenrolment', 'yesterday', 'yesterdayenrollment', 'yesterdaysenrollment']);
          liveMap[String(emis).trim()] = { current, yesterday };
        }
      });
    } else if (typeof liveRawData === 'object' && liveRawData !== null) {
      for (let emis in liveRawData) {
        const row = liveRawData[emis];
        if (typeof row === 'object' && row !== null) {
          const current = findValue(row, ['currentenrolment', 'current', 'livecurrent', 'currentenrollment']);
          const yesterday = findValue(row, ['yesterdaysenrolment', 'yesterday', 'yesterdayenrollment', 'yesterdaysenrollment']);
          liveMap[String(emis).trim()] = { current, yesterday };
        } else {
          // Fallback if it's a direct key-value map { "EMIS": CurrentCount }
          liveMap[String(emis).trim()] = { current: row, yesterday: row };
        }
      }
    }
    
    console.log(`✅ Successfully mapped structural profiles with live CSV-JSON assets.`);
    
    // Assemble the complete 11-index tracking array for your interface
    return baseSchools.map(row => {
      const emisStr = String(row[4]).trim();
      const live = liveMap[emisStr] || {};
      
      const baseline  = parseInt(row[6]) || 0;
      const target    = parseInt(row[7]) || 0;
      const newTarget = parseInt(row[8]) || 0;
      
      // Pull directly from your live JSON data properties, fallback safely if not found
      const current   = (live.current !== null && live.current !== undefined) ? parseInt(live.current) : baseline;
      const yesterday = (live.yesterday !== null && live.yesterday !== undefined) ? parseInt(live.yesterday) : current;
      
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
