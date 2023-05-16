CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS embeddings(
    id char(512) NOT NULL,
    content text,
    vector vector(1536)
);

CREATE TABLE IF NOT EXISTS cluster_cohesion(
    cluster1 int NOT NULL,
    cluster2 int NOT NULL,
    cohesion real DEFAULT NULL
);

TRUNCATE TABLE embeddings;

TRUNCATE TABLE cluster_cohesion;

CREATE UNIQUE INDEX IF NOT EXISTS doc ON embeddings(id);

CREATE UNIQUE INDEX IF NOT EXISTS cluster_cohesion_uniq ON cluster_cohesion(cluster1, cluster2);

CREATE OR REPLACE FUNCTION dist(x_id embeddings.id%TYPE, y_id embeddings.id%TYPE)
    RETURNS real
    LANGUAGE SQL
    STABLE
    AS $$
    SELECT
        x.vector <-> y.vector
    FROM
        embeddings AS x,
        embeddings AS y
    WHERE(x.id = x_id
        AND y.id = y_id);
$$;

CREATE OR REPLACE FUNCTION rel_distance(x_id embeddings.id%TYPE, y_id embeddings.id%TYPE)
    RETURNS real
    LANGUAGE SQL
    STABLE
    AS $$
    SELECT
        dist(x_id, y_id) -(
            SELECT
                sum(dist(id, x_id)) / count(id)
            FROM
                embeddings);
$$;

DROP MATERIALIZED VIEW IF EXISTS store;

CREATE MATERIALIZED VIEW store AS
SELECT
    sum(dist(x.id, y.id)) /(count(x.id) * count(y.id)) AS base
FROM
    embeddings AS x
    CROSS JOIN embeddings AS y;

CREATE OR REPLACE FUNCTION rel_distance(y_id embeddings.id%TYPE)
    RETURNS real
    LANGUAGE SQL
    STABLE
    AS $$
    SELECT
(
            SELECT
                sum(dist(id, y_id)) / count(id)
            FROM
                embeddings) -(
        SELECT
            base
        FROM
            store);
$$;

CREATE OR REPLACE FUNCTION cohesion(x_id embeddings.id%TYPE, y_id embeddings.id%TYPE)
    RETURNS real
    LANGUAGE SQL
    STABLE
    AS $$
    SELECT
        rel_distance(y_id) - rel_distance(x_id, y_id);
$$;

CREATE OR REPLACE FUNCTION cohesion(s1 char(512)[], s2 char(512)[])
    RETURNS real
    LANGUAGE SQL
    AS $$
    SELECT
        sum(cohesion(set1.x, set2.y)) /(array_length(s1, 1) * array_length(s2, 1))
    FROM(
        SELECT
            unnest(s1) AS x) AS set1
    CROSS JOIN(
        SELECT
            unnest(s2) AS y) AS set2;
$$;

DROP MATERIALIZED VIEW IF EXISTS points;

CREATE MATERIALIZED VIEW points AS
SELECT
    (row_number() OVER ()) - 1 AS rnum,
    id
FROM
    embeddings
ORDER BY
    rnum;

CREATE UNIQUE INDEX IF NOT EXISTS points_row ON points(rnum);

CREATE UNIQUE INDEX IF NOT EXISTS points_id ON points(id);

