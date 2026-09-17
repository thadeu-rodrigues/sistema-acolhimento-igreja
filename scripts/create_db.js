const { Client } = require("pg");

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres@localhost:5432/postgres";

// Connect to postgres default DB to check/create ictaubate_db
const client = new Client({
  connectionString: connectionString.replace(/\/[^\/]+$/, "/postgres"),
});

async function main() {
  await client.connect();
  const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'ictaubate_db'");
  if (res.rows.length === 0) {
    console.log("Criando banco de dados ictaubate_db...");
    await client.query("CREATE DATABASE ictaubate_db");
    console.log("Banco de dados ictaubate_db criado com sucesso!");
  } else {
    console.log("Banco de dados ictaubate_db já existe.");
  }
  await client.end();
}

main().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});
