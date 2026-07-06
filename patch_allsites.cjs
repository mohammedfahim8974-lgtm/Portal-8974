const fs = require('fs');

async function getSites() {
  const { createClient } = require('@supabase/supabase-js');
  const LZString = require('lz-string');
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
  
  const sites = new Set();
  attendance.forEach(r => {
    if (r.date && r.date.startsWith('2026-06')) {
      sites.add(r.site);
    }
  });
  console.log("Sites for June 2026:", Array.from(sites));
  
  const sites2024 = new Set();
  attendance.forEach(r => {
    if (r.date && r.date.startsWith('2024-06')) {
      sites2024.add(r.site);
    }
  });
  console.log("Sites for June 2024:", Array.from(sites2024));

  const sites2025 = new Set();
  attendance.forEach(r => {
    if (r.date && r.date.startsWith('2025-06')) {
      sites2025.add(r.site);
    }
  });
  console.log("Sites for June 2025:", Array.from(sites2025));

}
getSites();
