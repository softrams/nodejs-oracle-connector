/* istanbul ignore file */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-else-return */
const oracledb = require("oracledb");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pools = {};
let config = {};

exports.createPool = async (poolName) => {
  try {
    const srcCfg = config.DATASOURCES[poolName];
    if (srcCfg) {
      pools[poolName] = await oracledb.createPool({
        poolAlias: poolName,
        user: srcCfg.DB_USER,
        password: srcCfg.DB_PASSWORD,
        connectString: `${srcCfg.DB_HOST}:${srcCfg.DB_PORT}/${srcCfg.DB_DATABASE}`,
      });
      console.debug(`Oracle Adapter: Pool ${poolName} created`);
      return true;
    } else {
      console.error(`Oracle Adapter: Missing configuration for ${poolName}`);
      return false;
    }
  } catch (err) {
    console.error("Oracle Adapter: Error while closing connection", err);
    return false;
  }
};

exports.connect = async (poolName) => {
  try {
    if (!pools[poolName]) {
      await this.createPool(poolName);
    }
    const connection = await oracledb.getConnection(poolName);
    console.info(
      `Oracle Adapter: Successfully retrieved a connection from ${poolName} pool`
    );
    return connection;
  } catch (err) {
    console.error("Oracle Adapter: Error while retrieving a connection", err);
    throw new Error(err.message);
  }
};

exports.close = async (conn) => {
  if (conn) {
    try {
      await conn.close();
      console.info("Oracle Adapter: DB connection returned to pool");
      return true;
    } catch (err) {
      console.error("Oracle Adapter: Error while closing connection", err);
      return false;
    }
  } else {
    return true;
  }
};

exports.closePool = async (poolAlias) => {
  try {
    await oracledb.getPool(poolAlias).close(10);
    console.info(`Oracle Adapter: Pool ${poolAlias} closed`);
    return true;
  } catch (err) {
    console.error("Oracle Adapter: Error while closing connection", err);
    return false;
  }
};

exports.init = async (cfg) => {
  config = cfg;
};

exports.execute = async (srcName, query, params = {}, options = {}) => {
  let result;
  let conn;
  try {
    console.debug(query);
    if (params) {
      console.debug(JSON.stringify(params));
    }

    const start = process.hrtime();
    conn = await this.connect(srcName);

    console.debug(
      `Oracle Adapter: Connection secured: ${process.hrtime(start)[0]}s ${
      process.hrtime(start)[1] / 1000000
      }ms`
    );
    result = await conn.execute(query, params, options);

    console.debug(
      `Oracle Adapter: Query executed: ${process.hrtime(start)[0]}s ${
      process.hrtime(start)[1] / 1000000
      }ms`
    );

    return result;
  } catch (err) {
    console.error("Oracle Adapter: Error while executing query", err);
    throw new Error(err.message);
  } finally {
    await conn.close();
  }
};

exports.closeAllPools = async () => {
  try {
    const tempPools = pools;
    pools = {};
    for (const poolAlias of Object.keys(tempPools)) {
      await oracledb.getPool(poolAlias).close(10);
      console.info(`Oracle Adapter: Pool ${poolAlias} closed`);
    }
    return true;
  } catch (err) {
    console.error("Oracle Adapter: Error while closing connection", err);
    return false;
  }
};

/**
 * create a new standalone, non-pooled query and executes query using
 * the datasource based on the source name provided
 *
 * @param {string} sourceName - provide the data source name to be used. It should be
 * one match one of the datasources set in the express.config file
 * @param {string} query - provide the query to be executed
 * @param {object} params - provide the bindings used in the query
 * @param {object} options - provide oracleDB.ExecuteOptions
 */
exports.executeStandaloneConnection = async (
  sourceName,
  query,
  params = {},
  options = {}
) => {
  const srcCfg = config.DATASOURCES[sourceName];
  if (!srcCfg) {
    console.error(`Oracle Adapter: Missing configuration for ${sourceName}`);
    return false;
  }

  const connection = await oracledb.getConnection({
    user: srcCfg.DB_USER,
    password: srcCfg.DB_PASSWORD,
    connectString: `${srcCfg.DB_HOST}:${srcCfg.DB_PORT}/${srcCfg.DB_DATABASE}`
  });
  const start = process.hrtime();

  let result;

  console.debug(
    `Oracle Adapter: Connection secured: ${process.hrtime(start)[0]}s ${
    process.hrtime(start)[1] / 1000000
    }ms`
  );

  try {
    result = await connection.execute(query, params, options);

    console.debug(
      `Oracle Adapter: Query executed: ${process.hrtime(start)[0]}s ${
      process.hrtime(start)[1] / 1000000
      }ms`
    );
  } catch (ex) {
    console.info(`Oracle Adapter: There was an error at the moment of executing oracle query using a standalone connection: ${JSON.stringify(ex)}`);
  } finally {
    await connection.close();
    return result;
  }
};
