import pg from "pg";

const pgClient = new pg.Client({ ssl: { rejectUnauthorized: false } });
await pgClient.connect();

const GET_QUERY = "SELECT * FROM dist($1,$2);";
const getDistance = async (a: string, b: string): Promise<number> => {
  console.log(`getDistance(${a}, ${b})`);
  if (a === b) {
    return 0;
  }
  try {
    const { rows } = await pgClient.query(GET_QUERY, [a, b]);
    return rows[0].dist;
  } catch (e) {
    console.error("Error querying Postgres");
    process.exit(1);
  }
};

export const generateDistanceFunction = () => {
  console.log("generateDistanceFunction");

  const distanceFunction = async (a: string, b: string) => {
    return getDistance(a, b);
  };

  return { distanceFunction };
};
