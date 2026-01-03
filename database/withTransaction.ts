import type { PoolConnection } from "mysql2/promise";
import connectDB from "./connection.js";

type TxFn<T> = (conn: PoolConnection) => Promise<T>;

async function withTransaction<T>(fn: TxFn<T>): Promise<T> {
  const conn = await connectDB().getConnection();

  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      // PASS
    }
    throw err;
  } finally {
    conn.release();
  }
}

export default withTransaction;
