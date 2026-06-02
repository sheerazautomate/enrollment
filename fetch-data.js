// High-Performance Static Cache Data Compiler
async function convertGoogleSheetData() {
  const baseSchoolsUrl = "data/base_schools.json";
  const liveEnrollmentUrl = "data/live_enrollment.json";
  
  try {
    console.log("🚀 Loading high-performance static cache assets...");
    
    // 1. Fetch the unified school profile configurations
    const baseResponse = await fetch(baseSchoolsUrl);
    if (!baseResponse.ok) throw new Error("Failed to load base_schools.json configuration profile.");
    const baseSchools = await baseResponse.json();
    
    // 2. Attempt to fetch live tracking metrics safely (won't crash if the file isn't created yet)
    let enrollmentMap = {};
    try {
      const liveResponse = await fetch(liveEnrollmentUrl);
      if (liveResponse.ok) {
        enrollmentMap = await liveResponse.json();
      }
    } catch (e) {
      console.log("ℹ️ live_enrollment.json not found or empty; defaulting entirely to baseline stats.");
    }
    
    console.log(`✅ Loaded ${baseSchools.length} school configurations instantly.`);
    
    // 3. Reassemble data items back into the exact 11-index layout required by index.html
    return baseSchools.map(row => {
      const emisStr = String(row[4]).trim();
      const live = enrollmentMap[emisStr] || {};
      
      const baseline  = parseInt(row[6]) || 0;
      const target    = parseInt(row[7]) || 0;
      const newTarget = parseInt(row[8]) || 0;
      
      // Extract metrics managed by your upcoming daily snapshot script
      const current   = live.current !== undefined ? parseInt(live.current) : baseline;
      const yesterday = live.yesterday !== undefined ? parseInt(live.yesterday) : current;
      
      return [
        String(row[0]).toUpperCase().trim(), // Index 0: District
        String(row[1]).trim(),               // Index 1: Tehsil
        String(row[2]).trim(),               // Index 2: Markaz
        String(row[3]).trim(),               // Index 3: Wing
        emisStr,                             // Index 4: EMIS
        String(row[5]).trim(),               // Index 5: School Name
        baseline,                            // Index 6: Baseline
        current,                             // Index 7: Current (Live)
        target,                              // Index 8: Target
        yesterday,                           // Index 9: Yesterday (Calculates Delta: current - yesterday)
        newTarget                            // Index 10: New Target
      ];
    });
    
  } catch (error) {
    console.error("❌ Critical error parsing static cache data assets:", error);
    return [];
  }
}
