const AppError = require('./AppError');

// Supabase returns { data, error }. unwrap() gives back data or throws a clean AppError.
function unwrap({ data, error }) {
  if (error) {
    console.error('DB error:', error);
    if (error.code === '23505') throw new AppError(409, 'This record already exists');
    if (error.code === '23503') throw new AppError(400, 'A related record was not found');
    if (error.code === '22P02') throw new AppError(400, 'Invalid value');
    throw new AppError(500, 'Database error');
  }
  return data;
}

// Supabase returns max 1000 rows per request, so reports read page by page.
async function fetchAll(makeQuery, pageSize = 1000) {
  let all = [];
  let from = 0;
  for (;;) {
    const rows = unwrap(await makeQuery().range(from, from + pageSize - 1));
    all = all.concat(rows);
    if (rows.length < pageSize) return all;
    from += pageSize;
  }
}

module.exports = { unwrap, fetchAll };
