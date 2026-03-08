const SEED_VERSION = 'ifmio_seeded_v3';
const T = 'tenant-demo';
const TS = '2024-01-01T00:00:00Z';

function base(id: string) {
  return { id, tenant_id: T, created_at: TS, updated_at: TS, deleted_at: null };
}

function s(key: string, data: unknown) {
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

export function seedLocalStorage() {
  if (localStorage.getItem(SEED_VERSION)) return;

  // Properties — WITHOUT units (P0-3: units extracted to standalone entity)
  s('estateos_properties', [
    { ...base('1'), id: 1, nazev: 'Namesti Miru 1883/12', adresa: 'Namesti Miru 1883/12, Praha 2', typ: 'bytovy_dum', subjekt: { typ: 'SVJ', nazev: 'SVJ Namesti Miru 1883' } },
    { ...base('2'), id: 2, nazev: 'Polygon House', adresa: 'Karlin, Praha 8', typ: 'kancelare', subjekt: { typ: 'sro', nazev: 'Polygon FM s.r.o.' } },
    { ...base('3'), id: 3, nazev: 'Vinohrady Residence', adresa: 'Vinohradska 40, Praha 2', typ: 'bytovy_dum', subjekt: { typ: 'SVJ', nazev: 'SVJ Vinohrady Residence' } },
    { ...base('4'), id: 4, nazev: 'Smichov Park', adresa: 'Smichov, Praha 5', typ: 'obchodni', subjekt: { typ: 'as', nazev: 'Smichov Park a.s.' } },
    { ...base('5'), id: 5, nazev: 'Dejvice Office Center', adresa: 'Evropska 15, Praha 6', typ: 'kancelare', subjekt: { typ: 'sro', nazev: 'DOC s.r.o.' } },
    { ...base('6'), id: 6, nazev: 'Holesovice Lofts', adresa: 'Komunardu 30, Praha 7', typ: 'bytovy_dum', subjekt: { typ: 'BD', nazev: 'BD Holesovice Lofts' } },
  ]);

  // Units — STANDALONE (P0-3: extracted from properties)
  s('estateos_units', [
    { ...base('u1'), property_id: 1, cislo: '1A', typ: 'byt', plocha: 68, status: 'obsazeno', najemne: 18500 },
    { ...base('u2'), property_id: 1, cislo: '1B', typ: 'byt', plocha: 52, status: 'obsazeno', najemne: 14200 },
    { ...base('u3'), property_id: 1, cislo: '2A', typ: 'byt', plocha: 75, status: 'volne', najemne: 21000 },
    { ...base('u4'), property_id: 1, cislo: '2B', typ: 'byt', plocha: 45, status: 'obsazeno', najemne: 12800 },
    { ...base('u5'), property_id: 2, cislo: 'A1', typ: 'kancelar', plocha: 120, status: 'obsazeno', najemne: 45000 },
    { ...base('u6'), property_id: 2, cislo: 'A2', typ: 'kancelar', plocha: 85, status: 'obsazeno', najemne: 32000 },
    { ...base('u7'), property_id: 2, cislo: 'B1', typ: 'sklad', plocha: 200, status: 'volne', najemne: 25000 },
    { ...base('u8'), property_id: 3, cislo: '1', typ: 'byt', plocha: 92, status: 'obsazeno', najemne: 28000 },
    { ...base('u9'), property_id: 3, cislo: '2', typ: 'byt', plocha: 64, status: 'obsazeno', najemne: 19500 },
    { ...base('u10'), property_id: 3, cislo: '3', typ: 'byt', plocha: 48, status: 'rekonstrukce', najemne: 0 },
    { ...base('u11'), property_id: 4, cislo: 'P1', typ: 'obchod', plocha: 150, status: 'obsazeno', najemne: 55000 },
    { ...base('u12'), property_id: 4, cislo: 'P2', typ: 'obchod', plocha: 90, status: 'volne', najemne: 35000 },
    { ...base('u13'), property_id: 5, cislo: '301', typ: 'kancelar', plocha: 180, status: 'obsazeno', najemne: 62000 },
    { ...base('u14'), property_id: 5, cislo: '302', typ: 'kancelar', plocha: 95, status: 'obsazeno', najemne: 38000 },
    { ...base('u15'), property_id: 6, cislo: 'L1', typ: 'byt', plocha: 110, status: 'obsazeno', najemne: 32000 },
    { ...base('u16'), property_id: 6, cislo: 'L2', typ: 'byt', plocha: 78, status: 'obsazeno', najemne: 24000 },
  ]);

  // Persons — UNIFIED (P0-6: replaces address_book + residents)
  s('estateos_persons', [
    { ...base('p1'), type: 'fyzicka', roles: ['najemce'], jmeno: 'Marie', prijmeni: 'Kralova', email: 'kralova@email.cz', telefon: '+420603456789', display_name: 'Marie Kralova' },
    { ...base('p2'), type: 'fyzicka', roles: ['najemce'], jmeno: 'Petr', prijmeni: 'Maly', email: 'maly@email.cz', telefon: '+420612345678', display_name: 'Petr Maly' },
    { ...base('p3'), type: 'fyzicka', roles: ['najemce'], jmeno: 'Tomas', prijmeni: 'Novotny', email: 'novotny@email.cz', telefon: '+420606789012', display_name: 'Tomas Novotny' },
    { ...base('p4'), type: 'fyzicka', roles: ['najemce'], jmeno: 'Eva', prijmeni: 'Bila', email: 'bila@firma.cz', telefon: '+420605678901', display_name: 'Eva Bila' },
    { ...base('p5'), type: 'fyzicka', roles: ['vlastnik', 'najemce'], jmeno: 'Anna', prijmeni: 'Cerna', email: 'cerna@email.cz', telefon: '+420607890123', display_name: 'Anna Cerna' },
    { ...base('p6'), type: 'fyzicka', roles: ['najemce'], jmeno: 'Lukas', prijmeni: 'Kral', email: 'kral@email.cz', telefon: '+420608901234', display_name: 'Lukas Kral' },
    { ...base('p7'), type: 'pravnicka', roles: ['dodavatel'], nazev_firmy: 'TechServis s.r.o.', email: 'novak@techservis.cz', telefon: '+420601234567', display_name: 'TechServis s.r.o.', poznamka: 'Elektro + VZT' },
    { ...base('p8'), type: 'pravnicka', roles: ['dodavatel'], nazev_firmy: 'Svoboda Stavby', email: 'svoboda@stavby.cz', telefon: '+420602345678', display_name: 'Svoboda Stavby', poznamka: 'Stavebni prace' },
    { ...base('p9'), type: 'pravnicka', roles: ['dodavatel'], nazev_firmy: 'Dvorak Zamky', email: 'dvorak@zamky.cz', telefon: '+420604567890', display_name: 'Dvorak Zamky', poznamka: 'Zamecnicke prace' },
  ]);

  // Legacy address_book + residents (kept for backward compat with existing pages)
  s('estateos_address_book', [
    { ...base('c1'), jmeno: 'Jan Novak', typ: 'dodavatel', email: 'novak@techservis.cz', telefon: '+420601234567', firma: 'TechServis s.r.o.', poznamka: 'Elektro + VZT' },
    { ...base('c2'), jmeno: 'Petr Svoboda', typ: 'dodavatel', email: 'svoboda@stavby.cz', telefon: '+420602345678', firma: 'Svoboda Stavby', poznamka: 'Stavebni prace' },
    { ...base('c3'), jmeno: 'Marie Kralova', typ: 'najemnik', email: 'kralova@email.cz', telefon: '+420603456789', firma: '', poznamka: 'Byt 1A, Namesti Miru' },
    { ...base('c4'), jmeno: 'Karel Dvorak', typ: 'dodavatel', email: 'dvorak@zamky.cz', telefon: '+420604567890', firma: 'Dvorak Zamky', poznamka: 'Zamecnicke prace' },
    { ...base('c5'), jmeno: 'Eva Bila', typ: 'najemnik', email: 'bila@firma.cz', telefon: '+420605678901', firma: 'ABC Corp', poznamka: 'Kancelar A1, Polygon' },
    { ...base('c6'), jmeno: 'Tomas Novotny', typ: 'najemnik', email: 'novotny@email.cz', telefon: '+420606789012', firma: '', poznamka: 'Byt 2B, Namesti Miru' },
    { ...base('c7'), jmeno: 'Anna Cerna', typ: 'vlastnik', email: 'cerna@email.cz', telefon: '+420607890123', firma: '', poznamka: 'Vlastnik byt 1, Vinohrady' },
    { ...base('c8'), jmeno: 'Lukas Kral', typ: 'najemnik', email: 'kral@email.cz', telefon: '+420608901234', firma: '', poznamka: 'Loft L1, Holesovice' },
  ]);

  s('estateos_residents', [
    { ...base('r1'), jmeno: 'Marie Kralova', propId: 1, jednotkaId: 'u1', telefon: '+420603456789', email: 'kralova@email.cz', datumNastehovani: '2024-01-15', status: 'aktivni' },
    { ...base('r2'), jmeno: 'Petr Maly', propId: 1, jednotkaId: 'u2', telefon: '+420612345678', email: 'maly@email.cz', datumNastehovani: '2023-06-15', status: 'aktivni' },
    { ...base('r3'), jmeno: 'Tomas Novotny', propId: 1, jednotkaId: 'u4', telefon: '+420606789012', email: 'novotny@email.cz', datumNastehovani: '2025-02-01', status: 'aktivni' },
    { ...base('r4'), jmeno: 'Eva Bila', propId: 2, jednotkaId: 'u5', telefon: '+420605678901', email: 'bila@firma.cz', datumNastehovani: '2025-01-10', status: 'aktivni' },
    { ...base('r5'), jmeno: 'Anna Cerna', propId: 3, jednotkaId: 'u8', telefon: '+420607890123', email: 'cerna@email.cz', datumNastehovani: '2024-06-20', status: 'aktivni' },
    { ...base('r6'), jmeno: 'Lukas Kral', propId: 6, jednotkaId: 'u15', telefon: '+420608901234', email: 'kral@email.cz', datumNastehovani: '2025-03-01', status: 'aktivni' },
  ]);

  // Tenant users (P0-5: user↔tenant junction)
  s('estateos_tenant_users', [
    { ...base('tu1'), user_id: 'tm1', role: 'owner', permissions: {}, invited_at: TS, accepted_at: TS },
    { ...base('tu2'), user_id: 'tm2', role: 'manager', permissions: {}, invited_at: TS, accepted_at: TS },
    { ...base('tu3'), user_id: 'tm3', role: 'manager', permissions: {}, invited_at: TS, accepted_at: TS },
    { ...base('tu4'), user_id: 'tm4', role: 'viewer', permissions: {}, invited_at: TS, accepted_at: TS },
  ]);

  // Work orders
  s('estateos_work_orders', [
    { ...base('wo1'), nazev: 'Oprava vytahu', propId: 1, priorita: 'vysoka', stav: 'v_reseni', popis: 'Vytah v hlavni budove nefunguje', resitel: 'Jan Novak', datumVytvoreni: '2026-02-28', terminDo: '2026-03-10', ticket_id: null, unit_id: null, asset_id: null },
    { ...base('wo2'), nazev: 'Malovani chodby', propId: 1, priorita: 'nizka', stav: 'nova', popis: 'Malovani spolecne chodby 2.NP', resitel: '', datumVytvoreni: '2026-03-01', terminDo: '2026-03-20', ticket_id: null, unit_id: null, asset_id: null },
    { ...base('wo3'), nazev: 'Oprava strechy', propId: 2, priorita: 'kriticka', stav: 'v_reseni', popis: 'Zatekani v sekci B', resitel: 'Petr Svoboda', datumVytvoreni: '2026-02-25', terminDo: '2026-03-05', ticket_id: null, unit_id: null, asset_id: null },
    { ...base('wo4'), nazev: 'Vymena zamku', propId: 3, priorita: 'normalni', stav: 'vyresena', popis: 'Vymena cylindricke vlozky vstupnich dveri', resitel: 'Karel Dvorak', datumVytvoreni: '2026-02-20', terminDo: '2026-02-28', ticket_id: null, unit_id: null, asset_id: null },
    { ...base('wo5'), nazev: 'Revize elektro', propId: 4, priorita: 'vysoka', stav: 'nova', popis: 'Pravidelna revize elektroinstalace', resitel: '', datumVytvoreni: '2026-03-02', terminDo: '2026-03-15', ticket_id: null, unit_id: null, asset_id: null },
    { ...base('wo6'), nazev: 'Oprava odtoku', propId: 1, priorita: 'normalni', stav: 'uzavrena', popis: 'Ucpany odtok v suterenu', resitel: 'Jan Novak', datumVytvoreni: '2026-02-10', terminDo: '2026-02-15', ticket_id: null, unit_id: null, asset_id: null },
    { ...base('wo7'), nazev: 'Instalace kamery', propId: 5, priorita: 'normalni', stav: 'nova', popis: 'Instalace bezpecnostni kamery u vchodu', resitel: '', datumVytvoreni: '2026-03-04', terminDo: '2026-03-18', ticket_id: null, unit_id: null, asset_id: null },
    { ...base('wo8'), nazev: 'Cisteni fasady', propId: 6, priorita: 'nizka', stav: 'nova', popis: 'Tlakove cisteni fasady', resitel: '', datumVytvoreni: '2026-03-05', terminDo: '2026-04-01', ticket_id: null, unit_id: null, asset_id: null },
  ]);

  // Helpdesk tickets (P1-5: added work_order_id, unit_id, asset_id)
  s('estateos_tickets', [
    { ...base('hd1'), nazev: 'Nefunguje topeni', propId: 1, jednotkaId: 'u1', stav: 'nova', kategorie: 'Vytapeni', popis: 'Od vcera nefunguje topeni v obyvaku', zadavatel: 'Marie Kralova', datumVytvoreni: '2026-03-06', cisloProtokolu: 'HD-36001', work_order_id: null, asset_id: null },
    { ...base('hd2'), nazev: 'Tekouci kohoutek', propId: 1, jednotkaId: 'u2', stav: 'v_reseni', kategorie: 'Vodovod a kanalizace', popis: 'Kohoutek v kuchyni kape', zadavatel: 'Petr Maly', datumVytvoreni: '2026-03-04', cisloProtokolu: 'HD-36002', work_order_id: null, asset_id: null },
    { ...base('hd3'), nazev: 'Rozbite okno', propId: 3, jednotkaId: 'u8', stav: 'vyresena', kategorie: 'Stavebni prace', popis: 'Praskle sklo v loznici', zadavatel: 'Anna Cerna', datumVytvoreni: '2026-02-28', cisloProtokolu: 'HD-36003', work_order_id: null, asset_id: null },
    { ...base('hd4'), nazev: 'Hlucny soused', propId: 1, jednotkaId: 'u4', stav: 'nova', kategorie: 'Ostatni', popis: 'Soused nad nami hlucne slavil do 3 rano', zadavatel: 'Tomas Novotny', datumVytvoreni: '2026-03-05', cisloProtokolu: 'HD-36004', work_order_id: null, asset_id: null },
    { ...base('hd5'), nazev: 'Nefunkcni zasuvka', propId: 2, jednotkaId: 'u5', stav: 'nova', kategorie: 'Elektroinstalace', popis: 'Zasuvka u okna nefunguje', zadavatel: 'Eva Bila', datumVytvoreni: '2026-03-06', cisloProtokolu: 'HD-36005', work_order_id: null, asset_id: null },
    { ...base('hd6'), nazev: 'Plisen v koupelne', propId: 6, jednotkaId: 'u15', stav: 'v_reseni', kategorie: 'Stavebni prace', popis: 'Plisen na stropni v koupelne', zadavatel: 'Lukas Kral', datumVytvoreni: '2026-03-01', cisloProtokolu: 'HD-36006', work_order_id: null, asset_id: null },
  ]);

  // Finance transactions (P0-4: tenantId → lessee_person_id)
  s('estateos_fin_transactions', [
    { ...base('tx1'), propId: 1, uctId: 'acc1', typ: 'prijem', datum: '2026-03-01', castka: 18500, vs: '20260301', protiUcet: '123456/0100', popis: 'Najem 1A brezen', cil: 'najem', lessee_person_id: 'p1', parovani: [], created: '2026-03-01T08:00:00Z' },
    { ...base('tx2'), propId: 1, uctId: 'acc1', typ: 'prijem', datum: '2026-03-01', castka: 14200, vs: '20260302', protiUcet: '234567/0300', popis: 'Najem 1B brezen', cil: 'najem', lessee_person_id: 'p2', parovani: [], created: '2026-03-01T08:01:00Z' },
    { ...base('tx3'), propId: 1, uctId: 'acc1', typ: 'prijem', datum: '2026-03-02', castka: 12800, vs: '20260303', protiUcet: '345678/0600', popis: 'Najem 2B brezen', cil: 'najem', lessee_person_id: 'p3', parovani: [], created: '2026-03-02T10:00:00Z' },
    { ...base('tx4'), propId: 2, uctId: 'acc2', typ: 'prijem', datum: '2026-03-01', castka: 45000, vs: '20260201', protiUcet: '456789/0100', popis: 'Najem A1 brezen', cil: 'najem', lessee_person_id: 'p4', parovani: [], created: '2026-03-01T09:00:00Z' },
    { ...base('tx5'), propId: 2, uctId: 'acc2', typ: 'prijem', datum: '2026-03-01', castka: 32000, vs: '20260202', protiUcet: '567890/0100', popis: 'Najem A2 brezen', cil: 'najem', lessee_person_id: null, parovani: [], created: '2026-03-01T09:05:00Z' },
    { ...base('tx6'), propId: 1, uctId: 'acc1', typ: 'vydej', datum: '2026-02-28', castka: 8500, vs: '', protiUcet: '999888/0100', popis: 'Oprava vytahu zaloha', cil: 'udrzba', lessee_person_id: null, parovani: [], created: '2026-02-28T14:00:00Z' },
    { ...base('tx7'), propId: 3, uctId: 'acc3', typ: 'prijem', datum: '2026-03-01', castka: 28000, vs: '20260401', protiUcet: '111222/0800', popis: 'Najem byt 1 brezen', cil: 'najem', lessee_person_id: 'p5', parovani: [], created: '2026-03-01T07:30:00Z' },
    { ...base('tx8'), propId: 3, uctId: 'acc3', typ: 'prijem', datum: '2026-03-02', castka: 19500, vs: '20260402', protiUcet: '333444/0800', popis: 'Najem byt 2 brezen', cil: 'najem', lessee_person_id: null, parovani: [], created: '2026-03-02T08:00:00Z' },
    { ...base('tx9'), propId: 4, uctId: 'acc1', typ: 'prijem', datum: '2026-03-01', castka: 55000, vs: '20260501', protiUcet: '555666/0100', popis: 'Najem P1 brezen', cil: 'najem', lessee_person_id: null, parovani: [], created: '2026-03-01T10:00:00Z' },
    { ...base('tx10'), propId: 1, uctId: 'acc1', typ: 'vydej', datum: '2026-03-03', castka: 3200, vs: '', protiUcet: '777888/0300', popis: 'Cistici prostredky', cil: 'provoz', lessee_person_id: null, parovani: [], created: '2026-03-03T11:00:00Z' },
  ]);

  // Prescriptions (P0-4: tenantId → lessee_person_id, S4: billing_period)
  s('estateos_fin_prescriptions', [
    { ...base('pr1'), propId: 1, lessee_person_id: 'p1', lessee_name: 'Marie Kralova', jednotkaId: 'u1', castka: 18500, kUhrade: 18500, datum: '2026-03-01', splatnost: '2026-03-15', status: 'pending', popis: 'Najem + sluzby brezen 2026', typ: 'najem', billing_period: '2026-03' },
    { ...base('pr2'), propId: 1, lessee_person_id: 'p2', lessee_name: 'Petr Maly', jednotkaId: 'u2', castka: 14200, kUhrade: 0, datum: '2026-03-01', splatnost: '2026-03-15', status: 'paid', popis: 'Najem + sluzby brezen 2026', typ: 'najem', billing_period: '2026-03' },
    { ...base('pr3'), propId: 2, lessee_person_id: 'p4', lessee_name: 'Eva Bila', jednotkaId: 'u5', castka: 45000, kUhrade: 45000, datum: '2026-03-01', splatnost: '2026-03-10', status: 'pending', popis: 'Najem kancelar A1 brezen', typ: 'najem', billing_period: '2026-03' },
    { ...base('pr4'), propId: 3, lessee_person_id: 'p5', lessee_name: 'Anna Cerna', jednotkaId: 'u8', castka: 28000, kUhrade: 14000, datum: '2026-03-01', splatnost: '2026-03-15', status: 'partial', popis: 'Najem byt 1 brezen', typ: 'najem', billing_period: '2026-03' },
  ]);

  // Bank accounts
  s('estateos_fin_accounts', [
    { ...base('acc1'), nazev: 'Hlavni ucet FIO', cislo: '2901234567/2010', typ: 'banka', zustatek: 485000, propId: '1' },
    { ...base('acc2'), nazev: 'Polygon ucet KB', cislo: '1234567890/0100', typ: 'banka', zustatek: 312000, propId: '2' },
    { ...base('acc3'), nazev: 'Vinohrady CSOB', cislo: '9876543210/0300', typ: 'banka', zustatek: 178000, propId: '3' },
  ]);

  // Assets
  s('estateos_assets', [
    { ...base('zar1'), nazev: 'Kotel Viessmann 200', propertyId: 1, typNazev: 'Plynovy kotel', stav: 'aktivni', stavRevize: 'ok', posledniRevize: '2025-11-15', pristiRevize: '2026-11-15', umisteni: 'Suteren', vyrobce: 'Viessmann', unit_id: null },
    { ...base('zar2'), nazev: 'Vytah OTIS 2000', propertyId: 1, typNazev: 'Osobni vytah', stav: 'servis', stavRevize: 'blizi_se', posledniRevize: '2025-06-01', pristiRevize: '2026-06-01', umisteni: 'Schodiste', vyrobce: 'OTIS', unit_id: null },
    { ...base('zar3'), nazev: 'VZT Daikin', propertyId: 2, typNazev: 'Vzduchotechnika', stav: 'aktivni', stavRevize: 'ok', posledniRevize: '2025-12-01', pristiRevize: '2026-12-01', umisteni: 'Strecha', vyrobce: 'Daikin', unit_id: null },
    { ...base('zar4'), nazev: 'EPS Siemens', propertyId: 2, typNazev: 'Pozarni system', stav: 'aktivni', stavRevize: 'prosla', posledniRevize: '2024-12-01', pristiRevize: '2025-12-01', umisteni: 'Recepce', vyrobce: 'Siemens', unit_id: null },
    { ...base('zar5'), nazev: 'Hromosvod', propertyId: 3, typNazev: 'Hromosvod', stav: 'aktivni', stavRevize: 'ok', posledniRevize: '2025-09-01', pristiRevize: '2027-09-01', umisteni: 'Strecha', vyrobce: 'Dehn', unit_id: null },
  ]);

  // Meters
  s('estateos_meters', [
    { ...base('m1'), nazev: 'Elektrina spolecne', propId: 1, typ: 'elektrina', cislo: 'EL-001', jednotka: 'kWh', posledniOdecet: 45230, datumOdectu: '2026-02-28', unit_id: null },
    { ...base('m2'), nazev: 'Voda studena', propId: 1, typ: 'voda_studena', cislo: 'VS-001', jednotka: 'm3', posledniOdecet: 1234, datumOdectu: '2026-02-28', unit_id: null },
    { ...base('m3'), nazev: 'Plyn', propId: 1, typ: 'plyn', cislo: 'PL-001', jednotka: 'm3', posledniOdecet: 8920, datumOdectu: '2026-02-28', unit_id: null },
    { ...base('m4'), nazev: 'Elektrina budova', propId: 2, typ: 'elektrina', cislo: 'EL-002', jednotka: 'kWh', posledniOdecet: 98500, datumOdectu: '2026-02-28', unit_id: null },
    { ...base('m5'), nazev: 'Teplo', propId: 3, typ: 'teplo', cislo: 'TP-001', jednotka: 'GJ', posledniOdecet: 156, datumOdectu: '2026-02-28', unit_id: null },
    { ...base('m6'), nazev: 'Voda tepla', propId: 3, typ: 'voda_tepla', cislo: 'VT-001', jednotka: 'm3', posledniOdecet: 567, datumOdectu: '2026-02-28', unit_id: null },
  ]);

  // Meter readings (P1-3: standalone reading history)
  s('estateos_meter_readings', [
    { ...base('mr1'), meter_id: 'm1', datum: '2026-01-31', stav: 44800, spotreba: 430, spotreba_od: '2025-12-31', source: 'manual' },
    { ...base('mr2'), meter_id: 'm1', datum: '2026-02-28', stav: 45230, spotreba: 430, spotreba_od: '2026-01-31', source: 'manual' },
    { ...base('mr3'), meter_id: 'm2', datum: '2026-02-28', stav: 1234, spotreba: 18, spotreba_od: '2026-01-31', source: 'manual' },
  ]);

  // Lease agreements
  s('estateos_lease_agreements', [
    { ...base('la1'), propId: 1, jednotkaId: 'u1', najemnik: 'Marie Kralova', lessee_person_id: 'p1', datumOd: '2024-01-01', datumDo: '2026-12-31', mesicniNajem: 18500, status: 'aktivni' },
    { ...base('la2'), propId: 1, jednotkaId: 'u2', najemnik: 'Petr Maly', lessee_person_id: 'p2', datumOd: '2023-06-01', datumDo: '2026-05-31', mesicniNajem: 14200, status: 'aktivni' },
    { ...base('la3'), propId: 2, jednotkaId: 'u5', najemnik: 'ABC Corp', lessee_person_id: 'p4', datumOd: '2025-01-01', datumDo: '2027-12-31', mesicniNajem: 45000, status: 'aktivni' },
    { ...base('la4'), propId: 3, jednotkaId: 'u8', najemnik: 'Anna Cerna', lessee_person_id: 'p5', datumOd: '2024-06-01', datumDo: '2026-05-31', mesicniNajem: 28000, status: 'aktivni' },
  ]);

  // Non-conformities (compliance) — now with tenant_id
  s('ifmio:non_conformities', [
    { ...base('nc1'), nazev: 'Chybejici pozarni znaceni', propId: 1, kategorie: 'BOZP', zavaznost: 'vysoka', stav: 'otevrena', popis: 'V suterenu chybi oznaceni unikovych cest', datumZjisteni: '2026-02-15', terminNapravy: '2026-03-15' },
    { ...base('nc2'), nazev: 'Prosla revize hasicich pristroju', propId: 2, kategorie: 'PO', zavaznost: 'kriticka', stav: 'v_reseni', popis: '3 hasici pristroje maji proslou revizi', datumZjisteni: '2026-02-20', terminNapravy: '2026-03-10' },
    { ...base('nc3'), nazev: 'Nezabezpeceny pristup na strechu', propId: 3, kategorie: 'BOZP', zavaznost: 'normalni', stav: 'uzavrena', popis: 'Chybejici zamek na dverich ke streche', datumZjisteni: '2026-01-10', terminNapravy: '2026-02-10' },
  ]);

  // Corrective actions — now with tenant_id
  s('ifmio:corrective_actions', [
    { ...base('ca1'), ncId: 'nc1', nazev: 'Instalace unikoveho znaceni', stav: 'planovana', zodpovedny: 'Jan Novak', terminSplneni: '2026-03-12', popis: 'Objednat a instalovat fotoluminiscencni znaceni' },
    { ...base('ca2'), ncId: 'nc2', nazev: 'Revize hasicich pristroju', stav: 'v_realizaci', zodpovedny: 'Petr Svoboda', terminSplneni: '2026-03-08', popis: 'Objednat revizniho technika' },
    { ...base('ca3'), ncId: 'nc3', nazev: 'Vymena zamku strechy', stav: 'dokoncena', zodpovedny: 'Karel Dvorak', terminSplneni: '2026-02-05', popis: 'Instalovan novy bezpecnostni zamek' },
  ]);

  // Team members
  s('estateos_team', [
    { ...base('tm1'), jmeno: 'Martin Nosek', email: 'martin@ifmio.cz', role: 'admin', pozice: 'CEO', telefon: '+420601000001', accountEnabled: true },
    { ...base('tm2'), jmeno: 'Jana Vesela', email: 'jana@ifmio.cz', role: 'manager', pozice: 'Property Manager', telefon: '+420601000002', accountEnabled: true },
    { ...base('tm3'), jmeno: 'Petr Cerny', email: 'petr@ifmio.cz', role: 'manager', pozice: 'Facility Manager', telefon: '+420601000003', accountEnabled: true },
    { ...base('tm4'), jmeno: 'Lucie Mala', email: 'lucie@ifmio.cz', role: 'viewer', pozice: 'Uctovka', telefon: '+420601000004', accountEnabled: true },
  ]);

  // Calendar events
  s('estateos_calendar', [
    { ...base('ev1'), nazev: 'Schuze SVJ Namesti Miru', datum: '2026-03-15', cas: '18:00', typ: 'schuze', propId: 1, popis: 'Rocni shromazdeni vlastniku' },
    { ...base('ev2'), nazev: 'Revize plynu', datum: '2026-03-20', cas: '09:00', typ: 'revize', propId: 1, popis: 'Pravidelna revize plynoveho zarizeni' },
    { ...base('ev3'), nazev: 'Predani kancelare B1', datum: '2026-04-01', cas: '10:00', typ: 'predani', propId: 2, popis: 'Predani kancelare novemu najemci' },
    { ...base('ev4'), nazev: 'Kontrola VZT', datum: '2026-03-25', cas: '14:00', typ: 'udrzba', propId: 2, popis: 'Servisni prohlidka vzduchotechniky' },
    { ...base('ev5'), nazev: 'Pojistna udalost', datum: '2026-03-10', cas: '11:00', typ: 'ostatni', propId: 3, popis: 'Setkani s likvidatorem pojistovny' },
  ]);

  // Documents
  s('estateos_documents', [
    { ...base('doc1'), nazev: 'Najemni smlouva - Kralova', typ: 'smlouva', propId: 1, datum: '2024-01-01', velikost: 245000 },
    { ...base('doc2'), nazev: 'Revizni zprava elektro 2025', typ: 'revize', propId: 1, datum: '2025-11-15', velikost: 1200000 },
    { ...base('doc3'), nazev: 'Faktura TechServis', typ: 'faktura', propId: 2, datum: '2026-02-28', velikost: 89000 },
    { ...base('doc4'), nazev: 'Pojistna smlouva', typ: 'smlouva', propId: 3, datum: '2025-06-01', velikost: 350000 },
    { ...base('doc5'), nazev: 'Pasport budovy Polygon', typ: 'pasport', propId: 2, datum: '2025-01-15', velikost: 5600000 },
  ]);

  // Communication
  s('estateos_messages', [
    { ...base('msg1'), od: 'Marie Kralova', komu: 'Sprava budovy', predmet: 'Dotaz na parkovani', text: 'Dobry den, chtela bych se zeptat na moznost pronajmu parkovaciho stani.', datum: '2026-03-06T14:30:00Z', precteno: false, propId: 1 },
    { ...base('msg2'), od: 'Petr Maly', komu: 'Sprava budovy', predmet: 'Reklamace topeni', text: 'Topeni v byte stale nefunguje spravne, prosim o kontrolu.', datum: '2026-03-05T10:15:00Z', precteno: true, propId: 1 },
    { ...base('msg3'), od: 'Eva Bila', komu: 'Sprava budovy', predmet: 'Zadost o prodlouzeni smlouvy', text: 'Chteli bychom prodlouzit najemni smlouvu o dalsi 2 roky.', datum: '2026-03-04T09:00:00Z', precteno: true, propId: 2 },
    { ...base('msg4'), od: 'Lukas Kral', komu: 'Sprava budovy', predmet: 'Hlaseni zavady', text: 'V chodbe na nasem patre nefunguje osvetleni.', datum: '2026-03-06T16:45:00Z', precteno: false, propId: 6 },
  ]);

  s('estateos_announcements', [
    { ...base('ann1'), nazev: 'Odstávka vody', text: 'Dne 15.3.2026 bude od 8:00 do 14:00 odstavka studene vody z duvodu opravy potrubi.', datum: '2026-03-06', propId: 1, autor: 'Martin Nosek', dulezite: true },
    { ...base('ann2'), nazev: 'Zmena hodin uklidu', text: 'Od dubna se meni harmonogram uklidu spolecnych prostor na Po-St-Pa.', datum: '2026-03-04', propId: null, autor: 'Jana Vesela', dulezite: false },
    { ...base('ann3'), nazev: 'Revize plynu - pripravte byty', text: 'Dne 20.3. probehne revize plynovych zarizeni. Prosime o zpristupneni bytu.', datum: '2026-03-05', propId: 1, autor: 'Petr Cerny', dulezite: true },
  ]);

  s('estateos_meetings', [
    { ...base('meet1'), nazev: 'Shromazdeni vlastniku SVJ', datum: '2026-03-15', cas: '18:00', misto: 'Spolecenska mistnost, Namesti Miru', propId: 1, stav: 'planovana', ucastnici: 12 },
    { ...base('meet2'), nazev: 'Vyborova schuze BD', datum: '2026-03-22', cas: '17:00', misto: 'Online - MS Teams', propId: 6, stav: 'planovana', ucastnici: 5 },
    { ...base('meet3'), nazev: 'Jednani s dodavatelem', datum: '2026-02-28', cas: '10:00', misto: 'Kancelar spravce', propId: null, stav: 'uskutecnena', ucastnici: 3 },
  ]);

  s('estateos_mail', [
    { ...base('mail1'), adresat: 'Marie Kralova', predmet: 'Vyuctovani sluzeb 2025', typ: 'odchozi', datum: '2026-03-01', stav: 'doruceno', propId: 1 },
    { ...base('mail2'), adresat: 'Mestsky urad Praha 2', predmet: 'Zadost o vyjimku z parkovani', typ: 'odchozi', datum: '2026-02-25', stav: 'odeslano', propId: 1 },
    { ...base('mail3'), adresat: 'Sprava budovy', predmet: 'Odpoved na reklamaci', typ: 'prichozi', datum: '2026-03-03', stav: 'doruceno', propId: 2 },
  ]);

  localStorage.setItem(SEED_VERSION, '1');
}

// Migration: extract units from old property.units[] format
export function migrateUnitsFromProperties() {
  const existingUnits = localStorage.getItem('estateos_units');
  if (existingUnits) return;

  try {
    const raw = localStorage.getItem('estateos_properties');
    if (!raw) return;
    const properties = JSON.parse(raw);
    const units: unknown[] = [];

    const cleaned = properties.map((prop: Record<string, unknown>) => {
      if (Array.isArray(prop.units)) {
        for (const u of prop.units) {
          units.push({
            ...u,
            property_id: prop.id,
            tenant_id: (prop as Record<string, unknown>).tenant_id || 'default',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          });
        }
        const { units: _, ...rest } = prop;
        return rest;
      }
      return prop;
    });

    if (units.length > 0) {
      localStorage.setItem('estateos_units', JSON.stringify(units));
      localStorage.setItem('estateos_properties', JSON.stringify(cleaned));
    }
  } catch { /* ignore */ }
}
