/* istanbul ignore file */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-else-return */
const oracledb = require("oracledb");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// #region PRIVATE
let pools = {};
let config = {};

createPool = async (poolName) => {
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

connect = async (poolName) => {
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

close = async (conn) => {
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

closePool = async (poolAlias) => {
  try {
    await oracledb.getPool(poolAlias).close(10);
    console.info(`Oracle Adapter: Pool ${poolAlias} closed`);
    return true;
  } catch (err) {
    console.error("Oracle Adapter: Error while closing connection", err);
    return false;
  }
};

// #endregion

// #region PUBLIC

exports.init = async (cfg) => {
  config = cfg;
};

exports.execute = async (srcName, query, params = {}, options = {}) => {
  try {
    console.debug(query);
    if (params) {
      console.debug(JSON.stringify(params));
    }

    const start = process.hrtime();
    const conn = await this.connect(srcName);

    console.debug(
      `Oracle Adapter: Connection secured: ${process.hrtime(start)[0]}s ${
        process.hrtime(start)[1] / 1000000
      }ms`
    );
    const result = await conn.execute(query, params, options);

    console.debug(
      `Oracle Adapter: Query executed: ${process.hrtime(start)[0]}s ${
        process.hrtime(start)[1] / 1000000
      }ms`
    );

    await conn.close();
    return result.rows;
  } catch (err) {
    console.error("Oracle Adapter: Error while executing query", err);
    throw new Error(err.message);
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

// #endregion
