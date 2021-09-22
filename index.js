/* istanbul ignore file */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-else-return */
const oracledb = require("oracledb");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const POOL_MAX_DEFAULT = 4;
const POOL_MIN_DEFAULT = 0;
const POOL_INCREMENT_DEFAULT = 1;

let promises = {};
let pools = {};
let config = {};

/**
 * OracleDB Parameter types
 */
exports.OracleDBTypes = {
  STRING: oracledb.STRING,
  NUMBER: oracledb.NUMBER,
  DATE: oracledb.DATE
};

exports.createPool = async (poolName) => {
  try {
    const srcCfg = config.DATASOURCES[poolName];
    if (srcCfg) {
      let poolMax = POOL_MAX_DEFAULT;
      let poolMin = POOL_MIN_DEFAULT;
      let poolIncrement = POOL_INCREMENT_DEFAULT;

      if (process.env.UV_THREADPOOL_SIZE && srcCfg.MAX_POOL && !isNaN(srcCfg.MAX_POOL)) {
        // if a max pool is provided, make sure to set poolMin equal to poolMax, as well as
        // the poolIncrement to zero, based on oracledb documentation to prevent any
        // kind of connection storms.
        // For more info, checkout https://oracle.github.io/node-oracledb/doc/api.html#-1531-connection-pool-sizing
        poolMax = srcCfg.MAX_POOL;
        poolMin = srcCfg.MAX_POOL;
        poolIncrement = 0;
      }

      if (!promises[poolName]) {
        promises[poolName] = oracledb.createPool({
          poolAlias: poolName,
          user: srcCfg.DB_USER,
          password: srcCfg.DB_PASSWORD,
          connectString: `${srcCfg.DB_HOST}:${srcCfg.DB_PORT}/${srcCfg.DB_DATABASE}`,
          poolMax,
          poolMin,
          poolIncrement
        });
      }
      pools[poolName] = await promises[poolName];
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
    console.debug(`Oracle Adapter: Successfully retrieved a connection from ${poolName} pool`);
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
      console.debug("Oracle Adapter: DB connection returned to pool");
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
    console.debug(`Oracle Adapter: Pool ${poolAlias} closed`);
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
    // to get the text from columns of type CLOB
    oracledb.fetchAsString = [ oracledb.CLOB ];
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
    if (conn) await conn.close();
  }
};

/**
 * 
 * @param {*} srcName - Connection name to connect to DB 
 * @param {*} query - SQL Query to execute. Example: 
 *                      INSERT INTO TABLE1 (ID, NAME) VALUES (:id, :name)
 * @param {*} binds - Array of objects whose keys match the bind variable names in the SQL statement. For Example: 
 *                      [
 *                        {id:1,name: name1},
 *                        {id:2,name: name2}
 *                      ]
 * @param {*} options - It is an optional parameter contains following properties:
 *                      1. autoCommit
 *                      2. batchErrors - call will stop when first error occurs
 *                      3. bindDefs - object defines the bind variable types, sizes and directions. Example:
 *                          bindDefs: {
 *                            id: { type: dataSource.OracleDBTypes.NUMBER, maxSize: 5 },
 *                             name: { type: dataSource.OracleDBTypes.STRING, maxSize: 10 }
 *                           }
 */
exports.executeMany = async (srcName, query, binds = [], options = {}) => {
  let result;
  let conn;
  try {
    console.debug(query);
    if (binds) {
      console.debug(JSON.stringify(binds));
    }

    const start = process.hrtime();
    conn = await this.connect(srcName);

    console.debug(
      `Oracle Adapter: Connection secured: ${process.hrtime(start)[0]}s ${
      process.hrtime(start)[1] / 1000000
      }ms`
    );
    result = await conn.executeMany(query, binds, options);

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
    if (conn) await conn.close();
  }
};

exports.executeStoredProc = async (srcName, storeproc, params = {}, options = {}) => {
  let result;
  let conn;
  let rows = [];
  try {
  console.debug(storeproc);
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
    result = await conn.execute(
      storeproc, params
    );
    console.debug(
      `Oracle Adapter: Query executed: ${process.hrtime(start)[0]}s ${
      process.hrtime(start)[1] / 1000000
      }ms`
    );
    const resultSet = result.outBinds.response;
    let row;
    while ((row = await resultSet.getRow())) {
      rows.push(row);
    }
  } catch (err) {
    console.error("Oracle Adapter: Error while executing query", err);
    throw new Error(err.message);
  } finally {
     if (conn) await conn.close();
     return rows;
  }
};

exports.closeAllPools = async () => {
  try {
    const tempPools = pools;
    promises = {};
    pools = {};
    for (const poolAlias of Object.keys(tempPools)) {
      await oracledb.getPool(poolAlias).close(10);
      console.debug(`Oracle Adapter: Pool ${poolAlias} closed`);
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
    console.error(`Oracle Adapter: There was an error at the moment of executing oracle query using a standalone connection: ${JSON.stringify(ex)}`);
  } finally {
    if (connection) await connection.close();
    return result;
  }
};
