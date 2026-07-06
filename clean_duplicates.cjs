const { createClient } = require('@supabase/supabase-js');
const LZString = require('lz-string');

async function check() {
  const supabase = createClient('https://mkmpyxrrvxysvgvjujbo.supabase.co', 'sb_publishable_C7a73hNMYbGbEYNAJDhyPw_dSPGmQrk');
  const { data, error } = await supabase.from('shared_data').select('*').eq('portal_id', 'FahimKhan_Portal').eq('data_key', 'attendance');
  if (error) {
    console.error(error);
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
  
  console.log("Total attendance records:", attendance.length);
  
  const matches = attendance.filter(r => {
    // Check if site matches UAQ LULU DAY (case-insensitive and trimmed)
    const isUaqLuluDay = r.site && r.site.toUpperCase().includes('UAQ LULU');
    return isUaqLuluDay;
  });
  
  console.log("\nMatches for UAQ LULU DAY:");
  matches.forEach(m => {
    if (m.date.includes('-17') || m.date.includes('-16') || m.date.includes('-18')) {
      console.log(`ID: ${m.id}, Date: ${m.date}, Site: ${m.site}, Hours: ${m.hours}, OT: ${m.otHours}, WorkersCount: ${m.workerIds ? m.workerIds.length : 0}, Workers: ${JSON.stringify(m.workerIds)}`);
    }
  });
}

check();
