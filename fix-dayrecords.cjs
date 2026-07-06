const { createClient } = require('@supabase/supabase-js');
const LZString = require('lz-string');

async function clean() {
  const supabase = createClient('https://mkmpyxrrvxysvgvjujbo.supabase.co', 'sb_publishable_C7a73hNMYbGbEYNAJDhyPw_dSPGmQrk');
  const { data, error } = await supabase.from('shared_data').select('*').eq('portal_id', 'FahimKhan_Portal').eq('data_key', 'attendance');
  if (error) {
    console.error("Fetch error:", error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("No data found for portal FahimKhan_Portal");
    return;
  }
  
  const payload = data[0].payload;
  let attendanceStr = "";
  if (payload._compressed) {
    attendanceStr = LZString.decompressFromBase64(payload._compressed);
  } else {
    attendanceStr = JSON.stringify(payload.list);
  }
  const attendance = JSON.parse(attendanceStr).list || JSON.parse(attendanceStr) || [];
  
  console.log("Initial attendance records count:", attendance.length);
  
  const uniqueRecords = [];
  const seenHashes = new Set();
  let duplicateCount = 0;
  
  attendance.forEach(record => {
    // Generate a unique fingerprint for each record
    // Sort workerIds to make sure ordering doesn't affect fingerprinting
    const sortedWorkers = record.workerIds ? [...record.workerIds].sort().join(',') : '';
    const fingerprint = `${record.date || ''}|${(record.site || '').toUpperCase()}|${record.hours || 0}|${record.otHours || 0}|${sortedWorkers}|${record.companyName || ''}`;
    
    if (seenHashes.has(fingerprint)) {
      console.log(`Removing duplicate record: ID: ${record.id}, Date: ${record.date}, Site: ${record.site}, Hours: ${record.hours}, OT: ${record.otHours}`);
      duplicateCount++;
    } else {
      seenHashes.add(fingerprint);
      uniqueRecords.push(record);
    }
  });
  
  console.log(`Found ${duplicateCount} duplicate records.`);
  
  if (duplicateCount > 0) {
    console.log("Updating database with deduplicated attendance list...");
    const compressed = LZString.compressToBase64(JSON.stringify({ list: uniqueRecords }));
    const { error: updateError } = await supabase.from('shared_data').upsert({
      portal_id: 'FahimKhan_Portal',
      data_key: 'attendance',
      payload: { _compressed: compressed },
      updated_at: new Date().toISOString()
    });
    
    if (updateError) {
      console.error("Update error:", updateError);
    } else {
      console.log("Successfully cleaned up duplicates in database!");
    }
  } else {
    console.log("No duplicate records found to remove.");
  }
}

clean();
