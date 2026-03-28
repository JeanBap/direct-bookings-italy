// AffittoDiretto.it - Owner Outreach Analysis & Export Script
// Run: node outreach_analysis.js
// Reads data_contacts.json and data_public.js, exports CSVs for WhatsApp + Email outreach

var fs = require('fs');

// Load contacts
var contacts = JSON.parse(fs.readFileSync('data_contacts.json', 'utf8'));

// Load property names from data_public.js
var dataJS = fs.readFileSync('data_public.js', 'utf8');
eval(dataJS);

// Build property lookup
var propLookup = {};
RAW_DATA.forEach(function(d) {
  propLookup[d[0]] = {
    id: d[0],
    name: d[5],
    comune: d[3],
    region: REGIONS[d[1]],
    type: PROPERTY_TYPES[d[4]],
    website: d[15] || ''
  };
});

// Categorize contacts
var whatsappList = [];
var emailOnlyList = [];
var noContactList = [];

contacts.forEach(function(c) {
  var prop = propLookup[c.id];
  if (!prop) return;

  // Check for mobile numbers (Italian mobiles start with 3)
  var mobile = '';
  ['telefono_1', 'telefono_2', 'telefono_3'].forEach(function(field) {
    var num = (c[field] || '').replace(/[\s\-\.]/g, '');
    if (!mobile && num.startsWith('3') && num.length >= 9) {
      mobile = '+39' + num;
    }
  });

  var email = c.email_1 || c.email_2 || '';

  var record = {
    id: c.id,
    name: prop.name,
    comune: prop.comune,
    region: prop.region,
    type: prop.type,
    mobile: mobile,
    email: email,
    email2: c.email_2 || '',
    website: prop.website
  };

  if (mobile) {
    whatsappList.push(record);
  } else if (email) {
    emailOnlyList.push(record);
  } else {
    noContactList.push(record);
  }
});

// Sort by region then city
function sortByRegionCity(a, b) {
  if (a.region !== b.region) return a.region.localeCompare(b.region);
  return a.comune.localeCompare(b.comune);
}
whatsappList.sort(sortByRegionCity);
emailOnlyList.sort(sortByRegionCity);

// Export WhatsApp list as CSV
var whatsappCSV = 'ID,Property Name,City,Region,Type,Mobile (WhatsApp),Email,Website\n';
whatsappList.forEach(function(r) {
  whatsappCSV += [r.id, '"' + r.name.replace(/"/g, '""') + '"', r.comune, r.region, r.type, r.mobile, r.email, r.website].join(',') + '\n';
});
fs.writeFileSync('outreach_whatsapp.csv', whatsappCSV);
console.log('WhatsApp outreach list: ' + whatsappList.length + ' properties -> outreach_whatsapp.csv');

// Export Email-only list as CSV
var emailCSV = 'ID,Property Name,City,Region,Type,Email,Email2,Website\n';
emailOnlyList.forEach(function(r) {
  emailCSV += [r.id, '"' + r.name.replace(/"/g, '""') + '"', r.comune, r.region, r.type, r.email, r.email2, r.website].join(',') + '\n';
});
fs.writeFileSync('outreach_email.csv', emailCSV);
console.log('Email-only outreach list: ' + emailOnlyList.length + ' properties -> outreach_email.csv');

// Summary
console.log('\n=== OUTREACH SUMMARY ===');
console.log('Total properties: ' + contacts.length);
console.log('Can WhatsApp (have mobile): ' + whatsappList.length);
console.log('Can Email only (no mobile): ' + emailOnlyList.length);
console.log('Reachable total: ' + (whatsappList.length + emailOnlyList.length));
console.log('No contact info: ' + noContactList.length);
console.log('');

// Breakdown by region
var regionBreakdown = {};
whatsappList.concat(emailOnlyList).forEach(function(r) {
  if (!regionBreakdown[r.region]) regionBreakdown[r.region] = { whatsapp: 0, email: 0 };
  if (r.mobile) regionBreakdown[r.region].whatsapp++;
  else regionBreakdown[r.region].email++;
});
console.log('=== BY REGION ===');
Object.keys(regionBreakdown).sort().forEach(function(region) {
  var rb = regionBreakdown[region];
  console.log(region + ': ' + rb.whatsapp + ' WhatsApp, ' + rb.email + ' Email');
});
