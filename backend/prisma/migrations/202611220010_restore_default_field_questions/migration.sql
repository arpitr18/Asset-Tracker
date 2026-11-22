-- Restore the default questionnaire shipped with the field survey migration.
INSERT INTO "FieldQuestion" ("id", "position", "definition") VALUES
  ('mondelez', 10, '{"label":"Is a Mondelēz asset available?","type":"yesno","required":true}'),
  ('asset', 20, '{"label":"Scan the Mondelēz asset and capture its photo","type":"asset","when":"mondelez","required":true}'),
  ('competition', 30, '{"label":"Is a competitor asset present?","type":"yesno","required":true}'),
  ('brands', 40, '{"label":"Select the competitors","type":"multi","when":"competition","options":["Amul","Nestlé","Coca-Cola","Pepsi","Others"],"required":true}')
ON CONFLICT ("id") DO NOTHING;
