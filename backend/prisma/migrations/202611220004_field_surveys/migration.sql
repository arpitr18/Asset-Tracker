CREATE TABLE "FieldQuestion" (
  id text PRIMARY KEY, position integer NOT NULL, active boolean NOT NULL DEFAULT true, definition jsonb NOT NULL
);
INSERT INTO "FieldQuestion" (id,position,definition) VALUES
 ('mondelez',10,'{"label":"Is a Mondelēz asset available?","type":"yesno","required":true}'),
 ('asset',20,'{"label":"Scan the Mondelēz asset and capture its photo","type":"asset","when":"mondelez","required":true}'),
 ('competition',30,'{"label":"Is a competitor asset present?","type":"yesno","required":true}'),
 ('brands',40,'{"label":"Select the competitors","type":"multi","when":"competition","options":["Amul","Nestlé","Coca-Cola","Pepsi","Others"],"required":true}');
CREATE TABLE "FieldSurvey" (
 id uuid PRIMARY KEY REFERENCES "Visit"(id), answers jsonb NOT NULL,
 "storePhoto" bytea NOT NULL, "assetPhoto" bytea, distance double precision
);
