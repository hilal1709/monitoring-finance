const { Pool } = require("pg");
const fs = require("fs");

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres.calotdlpwthirminkhuv:Hilal170904_@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres";
  
  const pool = new Pool({
    connectionString,
  });

  try {
    const result = await pool.query(`
      SELECT 
        file_data 
      FROM public.dashboard_uploads
      WHERE role = 'payment' AND file_data IS NOT NULL
      ORDER BY uploaded_at DESC
      LIMIT 1;
    `);

    if (result.rows.length === 0) {
      console.log("No file data found.");
      return;
    }
    
    fs.writeFileSync("latest_payment.xlsx", result.rows[0].file_data);
    console.log("Saved latest_payment.xlsx");

  } finally {
    await pool.end();
  }
}

main().catch(console.error);
