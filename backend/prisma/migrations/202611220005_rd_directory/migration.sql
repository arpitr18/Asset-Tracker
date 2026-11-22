CREATE TABLE "IndianState" (name text PRIMARY KEY);
INSERT INTO "IndianState"(name) VALUES ('Andhra Pradesh'),
('Arunachal Pradesh'),
('Assam'),
('Bihar'),
('Chhattisgarh'),
('Goa'),
('Gujarat'),
('Haryana'),
('Himachal Pradesh'),
('Jharkhand'),
('Karnataka'),
('Kerala'),
('Madhya Pradesh'),
('Maharashtra'),
('Manipur'),
('Meghalaya'),
('Mizoram'),
('Nagaland'),
('Odisha'),
('Punjab'),
('Rajasthan'),
('Sikkim'),
('Tamil Nadu'),
('Telangana'),
('Tripura'),
('Uttar Pradesh'),
('Uttarakhand'),
('West Bengal'),
('Andaman and Nicobar Islands'),
('Chandigarh'),
('Dadra and Nagar Haveli and Daman and Diu'),
('Delhi'),
('Jammu and Kashmir'),
('Ladakh'),
('Lakshadweep'),
('Puducherry');
CREATE TABLE "RDProfile" (
  "rdCode" text PRIMARY KEY REFERENCES "Distributor"("rdCode"),
  branch text NOT NULL CHECK (branch IN ('North','South','East','West')),
  bsm text NOT NULL CHECK (bsm IN ('A','B')),
  type text NOT NULL CHECK (type IN ('TT','MT','SST','AFH')),
  phone text, address text NOT NULL, firm text NOT NULL, synthetic boolean NOT NULL DEFAULT false
);
CREATE TABLE "RDSale" (
  "rdCode" text REFERENCES "Distributor"("rdCode"), period date, amount numeric(14,2) NOT NULL,
  PRIMARY KEY ("rdCode",period)
);
INSERT INTO "Distributor"("rdCode","rdName","rdTown",state) VALUES
('SYN-RD-001','Aditi Mehra','New Delhi','Delhi'),
('SYN-RD-002','Rohan Gill','Ludhiana','Punjab'),
('SYN-RD-003','Kavya Rao','Bengaluru','Karnataka'),
('SYN-RD-004','Arun Kumar','Chennai','Tamil Nadu'),
('SYN-RD-005','Mita Sen','Kolkata','West Bengal'),
('SYN-RD-006','Anil Das','Bhubaneswar','Odisha'),
('SYN-RD-007','Neha Shah','Mumbai','Maharashtra'),
('SYN-RD-008','Dev Patel','Ahmedabad','Gujarat');
INSERT INTO "RDProfile"("rdCode",branch,bsm,type,phone,address,firm,synthetic) VALUES
('SYN-RD-001','North','A','TT','00000 00001','Warehouse 1, Demo Industrial Estate, New Delhi, Delhi, India','New Delhi Demo Distribution',true),
('SYN-RD-002','North','B','MT','00000 00002','Warehouse 2, Demo Industrial Estate, Ludhiana, Punjab, India','Ludhiana Demo Distribution',true),
('SYN-RD-003','South','A','SST','00000 00003','Warehouse 3, Demo Industrial Estate, Bengaluru, Karnataka, India','Bengaluru Demo Distribution',true),
('SYN-RD-004','South','B','AFH','00000 00004','Warehouse 4, Demo Industrial Estate, Chennai, Tamil Nadu, India','Chennai Demo Distribution',true),
('SYN-RD-005','East','A','TT','00000 00005','Warehouse 5, Demo Industrial Estate, Kolkata, West Bengal, India','Kolkata Demo Distribution',true),
('SYN-RD-006','East','B','MT','00000 00006','Warehouse 6, Demo Industrial Estate, Bhubaneswar, Odisha, India','Bhubaneswar Demo Distribution',true),
('SYN-RD-007','West','A','SST','00000 00007','Warehouse 7, Demo Industrial Estate, Mumbai, Maharashtra, India','Mumbai Demo Distribution',true),
('SYN-RD-008','West','B','AFH','00000 00008','Warehouse 8, Demo Industrial Estate, Ahmedabad, Gujarat, India','Ahmedabad Demo Distribution',true);
INSERT INTO "RDSale" ("rdCode",period,amount)
SELECT p."rdCode", m.period::date, 125000 + right(p."rdCode",1)::int*13000 + (extract(year from m.period)-2000)*3200 + mod(extract(month from m.period)*7,13)*9200
FROM "RDProfile" p CROSS JOIN generate_series(date_trunc('year', CURRENT_DATE)-interval '5 years',date_trunc('month', CURRENT_DATE),interval '1 month') m(period)
WHERE p.synthetic;
