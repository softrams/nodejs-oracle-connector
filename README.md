# Oracle DB Connector

Wrapper utility to easily manage multiple data sources and pooled connections.

## Requirements

### Oracle Instant Client

https://www.oracle.com/database/technologies/instant-client/downloads.html

### Node Installation

We've noticed incompatible behavior on OSX using Node versions installed via nodejs.org or NVM. If you are receiving "Cannot locate a 64-bit Oracle Client library" when attemtping to access Oracle, try the following:

1. Uninstall Node
2. `brew update && brew install node`

If you wish to use NVM to maintain parallel Node installations, ensure that it defaults to using the Brew-installed `system` installation for compatibility with this library.

## References

- https://oracle.github.io/node-oracledb/INSTALL.html#quickstart

### Changelog

# v1.0.2
Added auto drop and create pool when getting connection timedout
to fix NJS-040 issue.
