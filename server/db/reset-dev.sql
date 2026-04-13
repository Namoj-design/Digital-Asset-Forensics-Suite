-- Destructive: drops DAFS MVP tables. Use only on a dedicated dev database.
DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS users CASCADE;
