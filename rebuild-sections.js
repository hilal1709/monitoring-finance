const { Pool } = require("pg");

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres.calotdlpwthirminkhuv:Hilal170904_@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres";
  
  const pool = new Pool({
    connectionString,
  });

  try {
    console.log("🔄 Rebuilding section_data from dashboard_data...\n");

    const result = await pool.query(`
      SELECT 
        id,
        role,
        dashboard_data
      FROM public.dashboard_uploads
      ORDER BY role, uploaded_at DESC;
    `);

    let updated = 0;

    for (const row of result.rows) {
      const dashboardData = row.dashboard_data;
      const section = dashboardData[row.role];
      
      if (!section) {
        console.log(`❌ [${row.role}] ID ${row.id}: No section data`);
        continue;
      }

      // Update with fresh section_data
      const updateResult = await pool.query(
        `
          UPDATE public.dashboard_uploads
          SET section_data = $1::jsonb
          WHERE id = $2
          RETURNING id, role, uploaded_at;
        `,
        [JSON.stringify(section), row.id]
      );

      if (updateResult.rowCount > 0) {
        const monthCount = section.monthly?.length || 0;
        const firstMonth = section.monthly?.[0]?.label || 'N/A';
        const lastMonth = section.monthly?.[section.monthly?.length - 1]?.label || 'N/A';
        
        console.log(`✅ [${row.role}] ID ${row.id}: Updated ${monthCount} months (${firstMonth} - ${lastMonth})`);
        updated++;
      }
    }

    console.log(`\n📊 Total updated: ${updated} records`);

  } finally {
    await pool.end();
  }
}

main().catch(console.error);
