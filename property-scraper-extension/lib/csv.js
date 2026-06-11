// CSV generation matching PropertyForm.jsx import format exactly

const CSV_HEADERS = [
  'name', 'location', 'checkIn', 'checkOut', 'currency', 'price',
  'price_type', 'bedrooms', 'bathrooms', 'images', 'homeImageIndex',
  'selected', 'room_type', 'category', 'recommended'
];

function escapeCSVField(value) {
  const str = String(value ?? '');
  return '"' + str.replace(/"/g, '""') + '"';
}

export function generateCSV(properties) {
  const headerRow = CSV_HEADERS.join(',');

  const dataRows = properties.map(prop => {
    const values = [
      prop.name || '',
      prop.location || '',
      prop.checkIn || '',
      prop.checkOut || '',
      prop.currency || 'NZD',
      prop.price || 0,
      prop.price_type || 'Total Stay',
      prop.bedrooms || 0,
      prop.bathrooms || 0,
      Array.isArray(prop.images) ? prop.images.join('\n') : (prop.images || ''),
      prop.homeImageIndex || 0,
      prop.selected ? 'TRUE' : 'FALSE',
      prop.room_type || '',
      prop.category || '',
      prop.recommended ? 'TRUE' : 'FALSE',
    ];
    return values.map(escapeCSVField).join(',');
  });

  return headerRow + '\n' + dataRows.join('\n');
}

export function downloadCSV(csvString, filename) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `properties_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
