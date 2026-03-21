import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── TRANSLATIONS ───────────────────────────────────────────── */
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    'nav.features':'Features','nav.modules':'Modules','nav.pricing':'Pricing',
    'nav.contact':'Contact','nav.login':'Sign in','nav.start':'Get started',
    'hero.badge':'Global Facility & Property Management Platform',
    'hero.h1.before':'Manage your ','hero.h1.em':'properties','hero.h1.after':' from anywhere',
    'hero.sub':'The complete platform for property managers, FM companies and real estate investors.',
    'hero.cta1':'Start for free \u2192','hero.cta2':'See all features',
    'stat.units':'Units managed','stat.countries':'Countries','stat.uptime':'Uptime','stat.support':'Support',
    'features.label':'Platform','features.title':'Everything you need in one place',
    'features.sub':'From property onboarding to financial reporting \u2014 all in one unified platform.',
    'feat.prop.title':'Property Management','feat.prop.desc':'Manage portfolios of any size. Track units, tenants, contracts and maintenance from a single dashboard.',
    'feat.fin.title':'Financial Prescriptions','feat.fin.desc':'Automate billing, track payments, generate invoices and reconcile bank transactions with ease.',
    'feat.wo.title':'Work Orders','feat.wo.desc':'Create, assign and track maintenance requests. Connect with suppliers and monitor SLAs in real time.',
    'feat.rep.title':'Reporting & KPIs','feat.rep.desc':'Dashboards, custom KPIs and export-ready reports for every stakeholder and portfolio level.',
    'feat.meter.title':'Meter Readings','feat.meter.desc':'Collect, validate and process utility readings for water, electricity, gas and heating automatically.',
    'feat.access.title':'Role-Based Access','feat.access.desc':'Granular permissions for every team member. Admin, manager, viewer and fully custom roles.',
    'hiw.label':'How it works','hiw.title':'Up and running in minutes',
    'step1.title':'Create workspace','step1.desc':'Sign up and configure your organisation in under 5 minutes.',
    'step2.title':'Add properties','step2.desc':'Import your portfolio or add properties one by one with full detail.',
    'step3.title':'Invite team','step3.desc':'Add colleagues and set granular access permissions for each.',
    'step4.title':'Start managing','step4.desc':'Go live instantly. No training, no migration headaches.',
    'mod.label':'Modules','mod.title':'Built for every part of your workflow',
    'mod.finance.name':'Finance','mod.finance.short':'Invoicing, prescriptions, bank reconciliation',
    'mod.finance.detail':'Full financial lifecycle management \u2014 from rent prescriptions and utility billing to automated bank reconciliation and ISDOC/XML invoice exchange.',
    'mod.maintenance.name':'Maintenance','mod.maintenance.short':'Work orders, contractors, SLA tracking',
    'mod.maintenance.detail':'Streamline maintenance workflows. Create work orders, assign contractors, track completion and measure SLA compliance across your entire portfolio.',
    'mod.tenants.name':'Tenants','mod.tenants.short':'Contracts, profiles, debt management',
    'mod.tenants.detail':'Complete tenant lifecycle \u2014 from contract signing to debt recovery. Built-in reminder system, occupancy tracking and tenant communication portal.',
    'mod.meters.name':'Meters','mod.meters.short':'Readings, billing, consumption analysis',
    'mod.meters.detail':'Collect utility readings, validate data and generate consumption-based billing automatically. Supports water, electricity, gas and heating.',
    'mod.documents.name':'Documents','mod.documents.short':'Contracts, templates, ISDOC import',
    'mod.documents.detail':'Centralised document storage with smart templates, e-signature ready exports and ISDOC electronic invoice import for seamless accounting integration.',
    'mod.reporting.name':'Reporting','mod.reporting.short':'KPIs, dashboards, custom exports',
    'mod.reporting.detail':'Real-time KPI dashboards, occupancy reports, financial summaries and one-click CSV/PDF exports tailored to every stakeholder level.',
    'mod.assets.name':'Assets & TZB','mod.assets.short':'Equipment passports, revisions, QR codes',
    'mod.assets.detail':'Technical building equipment management \u2014 boilers, elevators, HVAC. Revision plans, service history, QR asset labels and field checks.',
    'mod.kanban.name':'Kanban Board','mod.kanban.short':'Visual task management, drag & drop',
    'mod.kanban.detail':'Unified task board aggregating helpdesk tickets, work orders and ad-hoc tasks into a single drag & drop Kanban view.',
    'mod.mio.name':'Mio AI','mod.mio.short':'AI assistant for property insights',
    'mod.mio.detail':'Intelligent AI assistant integrated into the platform. Query your data, get recommendations and detect anomalies. Powered by Anthropic Claude.',
    'mod.portal.name':'Client Portal','mod.portal.short':'Self-service for tenants and owners',
    'mod.portal.detail':'Tenant and owner self-service portal \u2014 view prescriptions, payments, submit requests, access documents and check account balance.',
    'sec.label':'Security','sec.title':'Enterprise-grade security for every customer',
    'sec.sub':'Your data is protected by multiple layers of security, encryption and compliance.',
    'sec.enc.title':'Data Encryption','sec.enc.desc':'TLS 1.3 in transit, AES-256 at rest. Application-level encryption for sensitive fields (IBAN, birth numbers).',
    'sec.cf.title':'Cloudflare Protection','sec.cf.desc':'DDoS protection, WAF and Cloudflare Tunnel \u2014 backend without public ports. 330+ edge locations.',
    'sec.auth.title':'Authentication & Access','sec.auth.desc':'JWT with rotation, TOTP 2FA, role-based access control (6 roles), rate limiting and brute-force protection.',
    'sec.tenant.title':'Tenant Isolation','sec.tenant.desc':'Strict multi-tenant architecture. Every API request validated against organisation. Full audit log of all changes.',
    'sec.gdpr.title':'GDPR & Compliance','sec.gdpr.desc':'Full GDPR compliance \u2014 right to erasure, export, portability. Data stored in EU (Hetzner Frankfurt). NIS2 ready.',
    'sec.backup.title':'Backups & Uptime','sec.backup.desc':'Automated database backups. 99.9% SLA availability. 24/7 monitoring and alerting.',
    'aud.label':"Who it's for",'aud.title':'Built for professionals at every scale',
    'aud.pm.title':'Property Managers','aud.pm.desc':'Manage residential and commercial portfolios with ease.',
    'aud.pm.1':'Multi-property dashboard','aud.pm.2':'Automated rent collection','aud.pm.3':'Tenant communication','aud.pm.4':'Legal document templates',
    'aud.fm.title':'FM Companies','aud.fm.desc':'Coordinate facility operations across multiple client sites.',
    'aud.fm.1':'Work order management','aud.fm.2':'Contractor coordination','aud.fm.3':'Compliance tracking','aud.fm.4':'SLA reporting',
    'aud.dev.title':'Developers & Investors','aud.dev.desc':'Track assets, returns and occupancy across your portfolio.',
    'aud.dev.1':'Portfolio analytics','aud.dev.2':'ROI tracking','aud.dev.3':'Occupancy reports','aud.dev.4':'Investor dashboards',
    'price.label':'Pricing','price.title':'Simple, transparent pricing','price.sub':'Start free, scale as you grow. No hidden fees.','price.mo':'/mo',
    'plan.free.name':'FREE','plan.free.desc':'For individual landlords just getting started',
    'plan.starter.name':'STARTER','plan.starter.desc':'For small property managers',
    'plan.pro.name':'PROFESSIONAL','plan.pro.desc':'For growing property companies',
    'plan.ent.name':'ENTERPRISE','plan.ent.desc':'For large portfolios and FM companies','plan.ent.price':'Custom',
    'plan.popular':'Most popular','plan.cta.free':'Get started free','plan.cta.paid':'Start trial','plan.cta.ent':'Contact sales',
    'pf.property':'property','pf.properties':'properties','pf.units':'units','pf.users':'users',
    'pf.api':'API access','pf.isdoc':'ISDOC invoicing','pf.unlimited':'Unlimited properties','pf.unlimitedU':'Unlimited units','pf.unlimitedUs':'Unlimited users',
    'cta.title':'Ready to modernise your property operations?',
    'cta.sub':'Join thousands of property professionals already using ifmio.',
    'cta.btn1':'Start for free','cta.btn2':'Talk to sales',
    'footer.tagline':'The global platform for facility and property management.',
    'footer.product':'Product','footer.company':'Company','footer.legal':'Legal',
    'footer.app':'Launch app','footer.about':'About us','footer.contact':'Contact',
    'footer.privacy':'Privacy policy','footer.terms':'Terms of service','footer.gdpr':'GDPR',
  },
  cs: {
    'nav.features':'Funkce','nav.modules':'Moduly','nav.pricing':'Cen\u00edk',
    'nav.contact':'Kontakt','nav.login':'P\u0159ihl\u00e1sit se','nav.start':'Za\u010d\u00edt',
    'hero.badge':'Glob\u00e1ln\u00ed platforma pro facility a property management',
    'hero.h1.before':'Spravujte va\u0161e ','hero.h1.em':'nemovitosti','hero.h1.after':' odkudkoli',
    'hero.sub':'Kompletn\u00ed platforma pro spr\u00e1vcovsk\u00e9 firmy, FM spole\u010dnosti a investory do nemovitost\u00ed.',
    'hero.cta1':'Za\u010d\u00edt zdarma \u2192','hero.cta2':'Zobrazit funkce',
    'stat.units':'Spravovan\u00fdch jednotek','stat.countries':'Zem\u00ed','stat.uptime':'Dostupnost','stat.support':'Podpora',
    'features.label':'Platforma','features.title':'V\u0161e, co pot\u0159ebujete, na jednom m\u00edst\u011b',
    'features.sub':'Od registrace nemovitosti po finan\u010dn\u00ed reporting \u2014 v\u0161e v jedn\u00e9 sjednocen\u00e9 platform\u011b.',
    'feat.prop.title':'Spr\u00e1va nemovitost\u00ed','feat.prop.desc':'Spravujte portfolia libovoln\u00e9 velikosti. Sledujte jednotky, n\u00e1jemce, smlouvy a \u00fadr\u017ebu z jednoho m\u00edsta.',
    'feat.fin.title':'Finan\u010dn\u00ed p\u0159edpisy','feat.fin.desc':'Automatizujte fakturaci, sledujte platby, generujte faktury a p\u00e1rujte bankovn\u00ed transakce snadno.',
    'feat.wo.title':'Pracovn\u00ed p\u0159\u00edkazy','feat.wo.desc':'Vytv\u00e1\u0159ejte, p\u0159i\u0159azujte a sledujte po\u017eadavky na \u00fadr\u017ebu. Propojte dodavatele a monitorujte SLA.',
    'feat.rep.title':'Reporting a KPI','feat.rep.desc':'Dashboardy, vlastn\u00ed KPI a exportovateln\u00e9 reporty pro ka\u017ed\u00e9ho stakeholdera.',
    'feat.meter.title':'Ode\u010dty m\u011b\u0159idel','feat.meter.desc':'Sb\u00edrejte, validujte a zpracov\u00e1vejte ode\u010dty vody, elekt\u0159iny, plynu a tepla automaticky.',
    'feat.access.title':'\u0158\u00edzen\u00ed p\u0159\u00edstupu','feat.access.desc':'Detailn\u00ed opr\u00e1vn\u011bn\u00ed pro ka\u017ed\u00e9ho \u010dlena t\u00fdmu. Admin, mana\u017eer, prohl\u00ed\u017ee\u010d a vlastn\u00ed role.',
    'hiw.label':'Jak to funguje','hiw.title':'Zprovozn\u011bn\u00ed za minuty',
    'step1.title':'Vytvo\u0159te workspace','step1.desc':'Registrace a konfigurace va\u0161\u00ed organizace za m\u00e9n\u011b ne\u017e 5 minut.',
    'step2.title':'P\u0159idejte nemovitosti','step2.desc':'Importujte portfolio nebo p\u0159id\u00e1vejte nemovitosti postupn\u011b.',
    'step3.title':'Pozv\u011bte t\u00fdm','step3.desc':'P\u0159idejte kolegy a nastavte detailn\u00ed p\u0159\u00edstupov\u00e1 pr\u00e1va.',
    'step4.title':'Za\u010dn\u011bte spravovat','step4.desc':'Spus\u0165te okam\u017eit\u011b. \u017d\u00e1dn\u00e9 \u0161kolen\u00ed, \u017e\u00e1dn\u00e9 probl\u00e9my s migrac\u00ed.',
    'mod.label':'Moduly','mod.title':'Vytvo\u0159eno pro ka\u017edou \u010d\u00e1st va\u0161eho workflow',
    'mod.finance.name':'Finance','mod.finance.short':'Fakturace, p\u0159edpisy, p\u00e1rov\u00e1n\u00ed transakc\u00ed',
    'mod.finance.detail':'Kompletn\u00ed spr\u00e1va finan\u010dn\u00edho cyklu \u2014 od n\u00e1jemn\u00edch p\u0159edpis\u016f a fakturace energi\u00ed po automatick\u00e9 p\u00e1rov\u00e1n\u00ed banky.',
    'mod.maintenance.name':'\u00dadr\u017eba','mod.maintenance.short':'Pracovn\u00ed p\u0159\u00edkazy, dodavatel\u00e9, SLA',
    'mod.maintenance.detail':'Zjednodu\u0161te procesy \u00fadr\u017eby. Vytv\u00e1\u0159ejte pracovn\u00ed p\u0159\u00edkazy, p\u0159i\u0159azujte dodavatele, sledujte pln\u011bn\u00ed.',
    'mod.tenants.name':'N\u00e1jemci','mod.tenants.short':'Smlouvy, profily, spr\u00e1va pohled\u00e1vek',
    'mod.tenants.detail':'Kompletn\u00ed \u017eivotn\u00ed cyklus n\u00e1jemce \u2014 od podpisu smlouvy po vym\u00e1h\u00e1n\u00ed pohled\u00e1vek.',
    'mod.meters.name':'M\u011b\u0159idla','mod.meters.short':'Ode\u010dty, fakturace, anal\u00fdza spot\u0159eby',
    'mod.meters.detail':'Sb\u00edrejte ode\u010dty, validujte data a generujte fakturaci na z\u00e1klad\u011b spot\u0159eby automaticky.',
    'mod.documents.name':'Dokumenty','mod.documents.short':'Smlouvy, \u0161ablony, import ISDOC',
    'mod.documents.detail':'Centralizovan\u00e9 \u00falo\u017ei\u0161t\u011b dokument\u016f s chytr\u00fdmi \u0161ablonami a importem ISDOC faktur.',
    'mod.reporting.name':'Reporting','mod.reporting.short':'KPI, dashboardy, vlastn\u00ed exporty',
    'mod.reporting.detail':'Dashboardy KPI v re\u00e1ln\u00e9m \u010dase, reporty obsazenosti a exporty CSV/PDF jedn\u00edm klikem.',
    'mod.assets.name':'Assets & TZB','mod.assets.short':'Pasy za\u0159\u00edzen\u00ed, revize, QR k\u00f3dy',
    'mod.assets.detail':'Evidence technick\u00fdch za\u0159\u00edzen\u00ed budov \u2014 kotle, v\u00fdtahy, klimatizace. Revizn\u00ed pl\u00e1ny, servisn\u00ed historie, QR \u0161t\u00edtky.',
    'mod.kanban.name':'Kanban Board','mod.kanban.short':'Vizu\u00e1ln\u00ed \u0159\u00edzen\u00ed \u00fakol\u016f, drag & drop',
    'mod.kanban.detail':'Sjednocen\u00fd board agreguj\u00edc\u00ed helpdesk tickety, pracovn\u00ed p\u0159\u00edkazy i ad-hoc \u00fakoly do jednoho drag & drop Kanban pohledu.',
    'mod.mio.name':'Mio AI','mod.mio.short':'AI asistent pro spr\u00e1vu nemovitost\u00ed',
    'mod.mio.detail':'Inteligentn\u00ed AI asistent integrovan\u00fd do platformy. Dotazy na data, anal\u00fdzy, doporu\u010den\u00ed. Napojeno na Anthropic Claude.',
    'mod.portal.name':'Klientsk\u00fd port\u00e1l','mod.portal.short':'Self-service pro n\u00e1jemce a vlastn\u00edky',
    'mod.portal.detail':'Port\u00e1l pro n\u00e1jemce a vlastn\u00edky \u2014 p\u0159edpisy, platby, po\u017eadavky, dokumenty, stav konta.',
    'sec.label':'Bezpe\u010dnost','sec.title':'Enterprise bezpe\u010dnost pro ka\u017ed\u00e9ho z\u00e1kazn\u00edka',
    'sec.sub':'Va\u0161e data chr\u00e1n\u00ed n\u011bkolik vrstev zabezpe\u010den\u00ed, \u0161ifrov\u00e1n\u00ed a compliance.',
    'sec.enc.title':'\u0160ifrov\u00e1n\u00ed dat','sec.enc.desc':'TLS 1.3 p\u0159i p\u0159enosu, AES-256 v klidu. Aplika\u010dn\u00ed \u0161ifrov\u00e1n\u00ed citliv\u00fdch pol\u00ed (IBAN, rodn\u00e1 \u010d\u00edsla).',
    'sec.cf.title':'Cloudflare ochrana','sec.cf.desc':'DDoS ochrana, WAF a Cloudflare Tunnel \u2014 backend bez ve\u0159ejn\u00fdch port\u016f. 330+ edge lokac\u00ed.',
    'sec.auth.title':'Autentizace a p\u0159\u00edstup','sec.auth.desc':'JWT s rotac\u00ed, TOTP 2FA, \u0159\u00edzen\u00ed p\u0159\u00edstupu (6 rol\u00ed), rate limiting a ochrana proti brute-force.',
    'sec.tenant.title':'Izolace tenant\u016f','sec.tenant.desc':'Striktn\u00ed multi-tenant architektura. Ka\u017ed\u00fd API request validov\u00e1n v\u016f\u010di organizaci. Kompletn\u00ed audit log.',
    'sec.gdpr.title':'GDPR & Compliance','sec.gdpr.desc':'Pln\u00e1 shoda s GDPR \u2014 pr\u00e1vo na v\u00fdmaz, export, p\u0159enositelnost. Data ulo\u017eena v EU (Hetzner Frankfurt). P\u0159ipravenost na NIS2.',
    'sec.backup.title':'Z\u00e1lohy a dostupnost','sec.backup.desc':'Automatick\u00e9 z\u00e1lohy datab\u00e1ze. 99.9% SLA dostupnost. Monitoring a alerting 24/7.',
    'aud.label':'Pro koho je ur\u010den','aud.title':'Vytvo\u0159eno pro profesion\u00e1ly na ka\u017ed\u00e9 \u00farovni',
    'aud.pm.title':'Spr\u00e1vci nemovitost\u00ed','aud.pm.desc':'Spravujte reziden\u010dn\u00ed i komer\u010dn\u00ed portfolia snadno.',
    'aud.pm.1':'P\u0159ehled v\u00edce nemovitost\u00ed','aud.pm.2':'Automatizovan\u00fd v\u00fdb\u011br n\u00e1jemn\u00e9ho','aud.pm.3':'Komunikace s n\u00e1jemci','aud.pm.4':'Pr\u00e1vn\u00ed \u0161ablony dokument\u016f',
    'aud.fm.title':'FM spole\u010dnosti','aud.fm.desc':'Koordinujte facility operace nap\u0159\u00ed\u010d v\u00edce klientsk\u00fdmi lokalitami.',
    'aud.fm.1':'Spr\u00e1va pracovn\u00edch p\u0159\u00edkaz\u016f','aud.fm.2':'Koordinace dodavatel\u016f','aud.fm.3':'Sledov\u00e1n\u00ed shody','aud.fm.4':'SLA reporting',
    'aud.dev.title':'Develope\u0159i a investo\u0159i','aud.dev.desc':'Sledujte aktiva, v\u00fdnosy a obsazenost cel\u00e9ho portfolia.',
    'aud.dev.1':'Analytika portfolia','aud.dev.2':'Sledov\u00e1n\u00ed ROI','aud.dev.3':'Reporty obsazenosti','aud.dev.4':'Dashboardy pro investory',
    'price.label':'Cen\u00edk','price.title':'Jednoduch\u00e9, transparentn\u00ed ceny','price.sub':'Za\u010dn\u011bte zdarma, \u0161k\u00e1lujte dle r\u016fstu.','price.mo':'/m\u011bs',
    'plan.free.name':'ZDARMA','plan.free.desc':'Pro jednotliv\u00e9 pronaj\u00edmatele na za\u010d\u00e1tku',
    'plan.starter.name':'STARTER','plan.starter.desc':'Pro mal\u00e9 spr\u00e1vce nemovitost\u00ed',
    'plan.pro.name':'PROFESION\u00c1LN\u00cd','plan.pro.desc':'Pro rostouc\u00ed spr\u00e1vcovsk\u00e9 firmy',
    'plan.ent.name':'ENTERPRISE','plan.ent.desc':'Pro velk\u00e1 portfolia a FM spole\u010dnosti','plan.ent.price':'Na m\u00edru',
    'plan.popular':'Nejobl\u00edben\u011bj\u0161\u00ed','plan.cta.free':'Za\u010d\u00edt zdarma','plan.cta.paid':'Zku\u0161ebn\u00ed verze','plan.cta.ent':'Kontaktovat obchod',
    'pf.property':'nemovitost','pf.properties':'nemovitosti','pf.units':'jednotek','pf.users':'u\u017eivatel\u016f',
    'pf.api':'P\u0159\u00edstup k API','pf.isdoc':'ISDOC fakturace','pf.unlimited':'Neomezen\u00e9 nemovitosti','pf.unlimitedU':'Neomezen\u00e9 jednotky','pf.unlimitedUs':'Neomezen\u00ed u\u017eivatel\u00e9',
    'cta.title':'P\u0159ipraveni modernizovat spr\u00e1vu va\u0161ich nemovitost\u00ed?',
    'cta.sub':'P\u0159ipojte se k tis\u00edc\u016fm spr\u00e1vc\u016f nemovitost\u00ed, kte\u0159\u00ed ji\u017e pou\u017e\u00edvaj\u00ed ifmio.',
    'cta.btn1':'Za\u010d\u00edt zdarma','cta.btn2':'Kontaktovat obchod',
    'footer.tagline':'Glob\u00e1ln\u00ed platforma pro facility a property management.',
    'footer.product':'Produkt','footer.company':'Firma','footer.legal':'Pr\u00e1vn\u00ed',
    'footer.app':'Spustit aplikaci','footer.about':'O n\u00e1s','footer.contact':'Kontakt',
    'footer.privacy':'Z\u00e1sady ochrany osobn\u00edch \u00fadaj\u016f','footer.terms':'Obchodn\u00ed podm\u00ednky','footer.gdpr':'GDPR',
  },
  de: {
    'nav.features':'Funktionen','nav.modules':'Module','nav.pricing':'Preise',
    'nav.contact':'Kontakt','nav.login':'Anmelden','nav.start':'Loslegen',
    'hero.badge':'Globale Facility & Property Management Plattform',
    'hero.h1.before':'Verwalten Sie Ihre ','hero.h1.em':'Immobilien','hero.h1.after':' von \u00fcberall',
    'hero.sub':'Die vollst\u00e4ndige Plattform f\u00fcr Immobilienverwalter, FM-Unternehmen und Investoren.',
    'hero.cta1':'Kostenlos starten \u2192','hero.cta2':'Alle Funktionen ansehen',
    'stat.units':'Verwaltete Einheiten','stat.countries':'L\u00e4nder','stat.uptime':'Verf\u00fcgbarkeit','stat.support':'Support',
    'features.label':'Plattform','features.title':'Alles was Sie brauchen an einem Ort',
    'features.sub':'Von der Immobilienaufnahme bis zum Finanzreporting \u2014 alles in einer Plattform.',
    'feat.prop.title':'Immobilienverwaltung','feat.prop.desc':'Verwalten Sie Portfolios jeder Gr\u00f6\u00dfe von einem Dashboard.',
    'feat.fin.title':'Finanzvorschriften','feat.fin.desc':'Automatisieren Sie die Abrechnung und stimmen Sie Banktransaktionen m\u00fchelos ab.',
    'feat.wo.title':'Arbeitsauftr\u00e4ge','feat.wo.desc':'Erstellen, zuweisen und verfolgen Sie Wartungsanfragen in Echtzeit.',
    'feat.rep.title':'Reporting & KPIs','feat.rep.desc':'Dashboards, individuelle KPIs und exportfertige Berichte.',
    'feat.meter.title':'Z\u00e4hlerablesungen','feat.meter.desc':'Erfassen, validieren und verarbeiten Sie Verbrauchsdaten automatisch.',
    'feat.access.title':'Rollenbasierter Zugriff','feat.access.desc':'Detaillierte Berechtigungen f\u00fcr jedes Teammitglied.',
    'hiw.label':'So funktioniert es','hiw.title':'In wenigen Minuten einsatzbereit',
    'step1.title':'Workspace erstellen','step1.desc':'Registrieren und konfigurieren Sie Ihre Organisation in unter 5 Minuten.',
    'step2.title':'Immobilien hinzuf\u00fcgen','step2.desc':'Importieren Sie Ihr Portfolio oder f\u00fcgen Sie Immobilien einzeln hinzu.',
    'step3.title':'Team einladen','step3.desc':'F\u00fcgen Sie Kollegen hinzu und vergeben Sie detaillierte Zugriffsrechte.',
    'step4.title':'Verwalten starten','step4.desc':'Sofort live gehen. Kein Training, keine Migrationsprobleme.',
    'mod.label':'Module','mod.title':'F\u00fcr jeden Teil Ihres Workflows konzipiert',
    'mod.finance.name':'Finanzen','mod.finance.short':'Abrechnung, Vorschriften, Bankabgleich',
    'mod.finance.detail':'Vollst\u00e4ndiges Finanzlebenszyklusmanagement \u2014 von Mietvorschriften bis zum automatischen Bankabgleich.',
    'mod.maintenance.name':'Wartung','mod.maintenance.short':'Arbeitsauftr\u00e4ge, Auftragnehmer, SLA',
    'mod.maintenance.detail':'Optimieren Sie Wartungsabl\u00e4ufe. Erstellen Sie Arbeitsauftr\u00e4ge und messen Sie SLA-Einhaltung.',
    'mod.tenants.name':'Mieter','mod.tenants.short':'Vertr\u00e4ge, Profile, Schuldenmanagement',
    'mod.tenants.detail':'Vollst\u00e4ndiger Mieterlebenszyklus \u2014 von der Vertragsunterzeichnung bis zur Schuldenr\u00fcckforderung.',
    'mod.meters.name':'Z\u00e4hler','mod.meters.short':'Ablesungen, Abrechnung, Verbrauchsanalyse',
    'mod.meters.detail':'Erfassen Sie Verbrauchsdaten und generieren Sie verbrauchsbasierte Abrechnungen automatisch.',
    'mod.documents.name':'Dokumente','mod.documents.short':'Vertr\u00e4ge, Vorlagen, ISDOC-Import',
    'mod.documents.detail':'Zentralisierte Dokumentenverwaltung mit intelligenten Vorlagen und ISDOC-Rechnungsimport.',
    'mod.reporting.name':'Reporting','mod.reporting.short':'KPIs, Dashboards, individuelle Exporte',
    'mod.reporting.detail':'Echtzeit-KPI-Dashboards, Belegungsberichte und CSV/PDF-Exporte auf Knopfdruck.',
    'aud.label':'F\u00fcr wen','aud.title':'Konzipiert f\u00fcr Profis aller Gr\u00f6\u00dfen',
    'aud.pm.title':'Immobilienverwalter','aud.pm.desc':'Verwalten Sie Wohn- und Gewerbeportfolios mit Leichtigkeit.',
    'aud.pm.1':'Multi-Immobilien-Dashboard','aud.pm.2':'Automatisierte Mieterhebung','aud.pm.3':'Mieterkommunikation','aud.pm.4':'Rechtliche Dokumentvorlagen',
    'aud.fm.title':'FM-Unternehmen','aud.fm.desc':'Koordinieren Sie Facility-Operationen \u00fcber mehrere Kundenstandorte.',
    'aud.fm.1':'Arbeitsauftragsverwaltung','aud.fm.2':'Auftragnehmerkoordination','aud.fm.3':'Compliance-Tracking','aud.fm.4':'SLA-Reporting',
    'aud.dev.title':'Entwickler & Investoren','aud.dev.desc':'Verfolgen Sie Verm\u00f6genswerte, Renditen und Belegung.',
    'aud.dev.1':'Portfolio-Analytik','aud.dev.2':'ROI-Tracking','aud.dev.3':'Belegungsberichte','aud.dev.4':'Investor-Dashboards',
    'price.label':'Preise','price.title':'Einfache, transparente Preise','price.sub':'Kostenlos starten, nach Bedarf skalieren.','price.mo':'/Mo',
    'plan.free.name':'KOSTENLOS','plan.free.desc':'F\u00fcr einzelne Vermieter am Anfang',
    'plan.starter.name':'STARTER','plan.starter.desc':'F\u00fcr kleine Immobilienverwalter',
    'plan.pro.name':'PROFESSIONAL','plan.pro.desc':'F\u00fcr wachsende Immobilienunternehmen',
    'plan.ent.name':'ENTERPRISE','plan.ent.desc':'F\u00fcr gro\u00dfe Portfolios und FM-Unternehmen','plan.ent.price':'Individuell',
    'plan.popular':'Am beliebtesten','plan.cta.free':'Kostenlos starten','plan.cta.paid':'Testversion','plan.cta.ent':'Vertrieb kontaktieren',
    'pf.property':'Immobilie','pf.properties':'Immobilien','pf.units':'Einheiten','pf.users':'Benutzer',
    'pf.api':'API-Zugang','pf.isdoc':'ISDOC-Rechnungsstellung','pf.unlimited':'Unbegrenzte Immobilien','pf.unlimitedU':'Unbegrenzte Einheiten','pf.unlimitedUs':'Unbegrenzte Benutzer',
    'cta.title':'Bereit, Ihr Immobilienmanagement zu modernisieren?',
    'cta.sub':'Schlie\u00dfen Sie sich tausenden von Immobilienprofis an.',
    'cta.btn1':'Kostenlos starten','cta.btn2':'Mit Vertrieb sprechen',
    'footer.tagline':'Die globale Plattform f\u00fcr Facility und Property Management.',
    'footer.product':'Produkt','footer.company':'Unternehmen','footer.legal':'Rechtliches',
    'footer.app':'App starten','footer.about':'\u00dcber uns','footer.contact':'Kontakt',
    'footer.privacy':'Datenschutzrichtlinie','footer.terms':'Nutzungsbedingungen','footer.gdpr':'DSGVO',
  },
  pl: {
    'nav.features':'Funkcje','nav.modules':'Modu\u0142y','nav.pricing':'Cennik',
    'nav.contact':'Kontakt','nav.login':'Zaloguj si\u0119','nav.start':'Zacznij',
    'hero.badge':'Globalna platforma Facility & Property Management',
    'hero.h1.before':'Zarz\u0105dzaj swoimi ','hero.h1.em':'nieruchomo\u015bciami','hero.h1.after':' z dowolnego miejsca',
    'hero.sub':'Kompletna platforma dla zarz\u0105dc\u00f3w nieruchomo\u015bci, firm FM i inwestor\u00f3w.',
    'hero.cta1':'Zacznij za darmo \u2192','hero.cta2':'Zobacz wszystkie funkcje',
    'stat.units':'Zarz\u0105dzanych lokali','stat.countries':'Kraj\u00f3w','stat.uptime':'Dost\u0119pno\u015b\u0107','stat.support':'Wsparcie',
    'features.label':'Platforma','features.title':'Wszystko czego potrzebujesz w jednym miejscu',
    'features.sub':'Od rejestracji nieruchomo\u015bci po raportowanie finansowe \u2014 wszystko w jednej platformie.',
    'feat.prop.title':'Zarz\u0105dzanie nieruchomo\u015bciami','feat.prop.desc':'Zarz\u0105dzaj portfelami dowolnej wielko\u015bci z jednego pulpitu.',
    'feat.fin.title':'Przepisy finansowe','feat.fin.desc':'Automatyzuj rozliczenia, \u015bled\u017a p\u0142atno\u015bci i uzgadniaj transakcje bankowe.',
    'feat.wo.title':'Zlecenia robocze','feat.wo.desc':'Tw\u00f3rz, przydzielaj i \u015bled\u017a zg\u0142oszenia konserwacji w czasie rzeczywistym.',
    'feat.rep.title':'Raporty i KPI','feat.rep.desc':'Pulpity, niestandardowe KPI i raporty gotowe do eksportu.',
    'feat.meter.title':'Odczyty licznik\u00f3w','feat.meter.desc':'Zbieraj, waliduj i przetwarzaj odczyty medi\u00f3w automatycznie.',
    'feat.access.title':'Dost\u0119p oparty na rolach','feat.access.desc':'Szczeg\u00f3\u0142owe uprawnienia dla ka\u017cdego cz\u0142onka zespo\u0142u.',
    'hiw.label':'Jak to dzia\u0142a','hiw.title':'Gotowy do pracy w kilka minut',
    'step1.title':'Utw\u00f3rz workspace','step1.desc':'Zarejestruj si\u0119 i skonfiguruj organizacj\u0119 w mniej ni\u017c 5 minut.',
    'step2.title':'Dodaj nieruchomo\u015bci','step2.desc':'Importuj portfel lub dodawaj nieruchomo\u015bci jedna po drugiej.',
    'step3.title':'Zapro\u015b zesp\u00f3\u0142','step3.desc':'Dodaj wsp\u00f3\u0142pracownik\u00f3w i ustaw szczeg\u00f3\u0142owe uprawnienia dost\u0119pu.',
    'step4.title':'Zacznij zarz\u0105dza\u0107','step4.desc':'Uruchom natychmiast. Bez szkole\u0144, bez problem\u00f3w z migracj\u0105.',
    'mod.label':'Modu\u0142y','mod.title':'Zbudowany dla ka\u017cdej cz\u0119\u015bci twojego przep\u0142ywu pracy',
    'mod.finance.name':'Finanse','mod.finance.short':'Fakturowanie, przepisy, uzgodnienie bankowe',
    'mod.finance.detail':'Pe\u0142ne zarz\u0105dzanie cyklem finansowym \u2014 od przepis\u00f3w czynszowych po automatyczne uzgodnienie bankowe.',
    'mod.maintenance.name':'Konserwacja','mod.maintenance.short':'Zlecenia robocze, wykonawcy, SLA',
    'mod.maintenance.detail':'Optymalizuj procesy konserwacji. Tw\u00f3rz zlecenia, przydzielaj wykonawc\u00f3w i mierz zgodno\u015b\u0107 SLA.',
    'mod.tenants.name':'Najemcy','mod.tenants.short':'Umowy, profile, zarz\u0105dzanie d\u0142ugiem',
    'mod.tenants.detail':'Kompletny cykl \u017cycia najemcy \u2014 od podpisania umowy po windykacj\u0119.',
    'mod.meters.name':'Liczniki','mod.meters.short':'Odczyty, rozliczenia, analiza zu\u017cycia',
    'mod.meters.detail':'Zbieraj odczyty i automatycznie generuj rozliczenia oparte na zu\u017cyciu.',
    'mod.documents.name':'Dokumenty','mod.documents.short':'Umowy, szablony, import ISDOC',
    'mod.documents.detail':'Scentralizowane przechowywanie dokument\u00f3w z inteligentnymi szablonami i importem faktur ISDOC.',
    'mod.reporting.name':'Raporty','mod.reporting.short':'KPI, pulpity, niestandardowe eksporty',
    'mod.reporting.detail':'Pulpity KPI w czasie rzeczywistym, raporty ob\u0142o\u017cenia i eksporty CSV/PDF jednym klikni\u0119ciem.',
    'aud.label':'Dla kogo','aud.title':'Zbudowany dla profesjonalist\u00f3w na ka\u017cd\u0105 skal\u0119',
    'aud.pm.title':'Zarz\u0105dcy nieruchomo\u015bci','aud.pm.desc':'Zarz\u0105dzaj portfelami z \u0142atwo\u015bci\u0105.',
    'aud.pm.1':'Pulpit wielu nieruchomo\u015bci','aud.pm.2':'Automatyczne pobieranie czynszu','aud.pm.3':'Komunikacja z najemcami','aud.pm.4':'Prawne szablony dokument\u00f3w',
    'aud.fm.title':'Firmy FM','aud.fm.desc':'Koordynuj operacje facility w wielu lokalizacjach.',
    'aud.fm.1':'Zarz\u0105dzanie zleceniami','aud.fm.2':'Koordynacja wykonawc\u00f3w','aud.fm.3':'\u015aledzenie zgodno\u015bci','aud.fm.4':'Raportowanie SLA',
    'aud.dev.title':'Deweloperzy i inwestorzy','aud.dev.desc':'\u015aled\u017a aktywa, zwroty i ob\u0142o\u017cenie portfela.',
    'aud.dev.1':'Analityka portfela','aud.dev.2':'\u015aledzenie ROI','aud.dev.3':'Raporty ob\u0142o\u017cenia','aud.dev.4':'Pulpity inwestor\u00f3w',
    'price.label':'Cennik','price.title':'Proste, przejrzyste ceny','price.sub':'Zacznij za darmo, skaluj w miar\u0119 wzrostu.','price.mo':'/mies',
    'plan.free.name':'DARMOWY','plan.free.desc':'Dla indywidualnych w\u0142a\u015bcicieli na pocz\u0105tku',
    'plan.starter.name':'STARTER','plan.starter.desc':'Dla ma\u0142ych zarz\u0105dc\u00f3w nieruchomo\u015bci',
    'plan.pro.name':'PROFESJONALNY','plan.pro.desc':'Dla rosn\u0105cych firm zarz\u0105dczych',
    'plan.ent.name':'ENTERPRISE','plan.ent.desc':'Dla du\u017cych portfeli i firm FM','plan.ent.price':'Indywidualnie',
    'plan.popular':'Najpopularniejszy','plan.cta.free':'Zacznij za darmo','plan.cta.paid':'Wersja pr\u00f3bna','plan.cta.ent':'Skontaktuj z handlem',
    'pf.property':'nieruchomo\u015b\u0107','pf.properties':'nieruchomo\u015bci','pf.units':'lokali','pf.users':'u\u017cytkownik\u00f3w',
    'pf.api':'Dost\u0119p do API','pf.isdoc':'Fakturowanie ISDOC','pf.unlimited':'Nieograniczone nieruchomo\u015bci','pf.unlimitedU':'Nieograniczone lokale','pf.unlimitedUs':'Nieograniczeni u\u017cytkownicy',
    'cta.title':'Gotowy na unowocze\u015bnienie zarz\u0105dzania nieruchomo\u015bciami?',
    'cta.sub':'Do\u0142\u0105cz do tysi\u0119cy specjalist\u00f3w korzystaj\u0105cych z ifmio.',
    'cta.btn1':'Zacznij za darmo','cta.btn2':'Porozmawiaj z handlem',
    'footer.tagline':'Globalna platforma dla facility i property management.',
    'footer.product':'Produkt','footer.company':'Firma','footer.legal':'Prawne',
    'footer.app':'Uruchom aplikacj\u0119','footer.about':'O nas','footer.contact':'Kontakt',
    'footer.privacy':'Polityka prywatno\u015bci','footer.terms':'Warunki us\u0142ugi','footer.gdpr':'RODO',
  },
};

const LANG_META: Record<string, { flag: string; code: string }> = {
  en: { flag: '\ud83c\uddec\ud83c\udde7', code: 'EN' },
  cs: { flag: '\ud83c\udde8\ud83c\uddff', code: 'CS' },
  de: { flag: '\ud83c\udde9\ud83c\uddea', code: 'DE' },
  pl: { flag: '\ud83c\uddf5\ud83c\uddf1', code: 'PL' },
};

const MODULE_DATA: Record<string, { icon: string; titleKey: string; textKey: string; tags: string[] }> = {
  finance:     { icon: '\ud83d\udcb0', titleKey: 'mod.finance.name',     textKey: 'mod.finance.detail',      tags: ['Invoicing','Prescriptions','Bank Sync','ISDOC'] },
  maintenance: { icon: '\ud83d\udd27', titleKey: 'mod.maintenance.name', textKey: 'mod.maintenance.detail',  tags: ['Work Orders','SLA','Contractors','Scheduling'] },
  tenants:     { icon: '\ud83d\udc65', titleKey: 'mod.tenants.name',     textKey: 'mod.tenants.detail',      tags: ['Contracts','Reminders','Debt Recovery','Profiles'] },
  meters:      { icon: '\ud83d\udce1', titleKey: 'mod.meters.name',      textKey: 'mod.meters.detail',       tags: ['Water','Electricity','Gas','Heating'] },
  documents:   { icon: '\ud83d\udcc4', titleKey: 'mod.documents.name',   textKey: 'mod.documents.detail',    tags: ['Templates','ISDOC','Storage','e-Signature'] },
  reporting:   { icon: '\ud83d\udcca', titleKey: 'mod.reporting.name',   textKey: 'mod.reporting.detail',    tags: ['KPIs','Dashboards','CSV','PDF'] },
  assets:      { icon: '\u2699\ufe0f', titleKey: 'mod.assets.name',     textKey: 'mod.assets.detail',       tags: ['TZB','Revize','Servis','QR'] },
  kanban:      { icon: '\ud83d\udccb', titleKey: 'mod.kanban.name',     textKey: 'mod.kanban.detail',       tags: ['Drag & Drop','Helpdesk','WO','Tasks'] },
  mio:         { icon: '\ud83e\udd16', titleKey: 'mod.mio.name',        textKey: 'mod.mio.detail',          tags: ['AI','Analytics','Recommendations'] },
  portal:      { icon: '\ud83c\udf10', titleKey: 'mod.portal.name',     textKey: 'mod.portal.detail',       tags: ['Self-service','Tenants','Payments'] },
};

const MODULES_ORDER = ['finance','maintenance','tenants','meters','documents','reporting','assets','kanban','mio','portal'] as const;

/* ─── CSS ─────────────────────────────────────────────────────── */
const LANDING_CSS = `
.lp *,.lp *::before,.lp *::after{box-sizing:border-box;margin:0;padding:0}
.lp{
  --lp-bg:#FFFFFF;--lp-bg2:#F8FAFB;--lp-bg3:#F0F4F8;
  --lp-border:rgba(0,0,0,0.08);--lp-border2:rgba(0,0,0,0.12);
  --lp-accent:#0D9488;--lp-accent2:#0F766E;--lp-glow:rgba(13,148,136,0.2);
  --lp-text:#1A1A2E;--lp-muted:#6B7280;--lp-muted2:#9CA3AF;
  --lp-card-bg:#FFFFFF;--lp-card-brd:rgba(0,0,0,0.06);
  --lp-r:16px;--lp-nav-h:68px;
  background:var(--lp-bg);color:var(--lp-text);font-family:system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.6;overflow-x:hidden;
  position:relative;min-height:100vh;
}
.lp a{color:inherit;text-decoration:none}
.lp em{font-style:italic;font-family:system-ui,sans-serif;font-weight:700;
  color:var(--lp-accent)}
.lp h1,.lp h2,.lp h3{font-family:system-ui,-apple-system,sans-serif;font-weight:700;line-height:1.2}
.lp::before{display:none}
.lp .btn{display:inline-flex;align-items:center;gap:6px;padding:11px 22px;border-radius:10px;font-size:.9rem;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;border:none;transition:all .2s}
.lp .btn-primary{background:var(--lp-accent);color:#fff;box-shadow:0 2px 12px var(--lp-glow)}
.lp .btn-primary:hover{background:var(--lp-accent2);box-shadow:0 4px 20px var(--lp-glow);transform:translateY(-1px)}
.lp .btn-secondary{background:transparent;color:var(--lp-text);border:1px solid var(--lp-border2)}
.lp .btn-secondary:hover{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.2)}
.lp .btn-cta-nav{padding:8px 18px;font-size:.82rem;background:var(--lp-accent);color:#fff;border-radius:8px;font-weight:600;transition:all .2s}
.lp .btn-cta-nav:hover{background:var(--lp-accent2);transform:translateY(-1px)}
.lp .btn-outline-nav{padding:8px 16px;font-size:.82rem;background:transparent;color:var(--lp-muted);border-radius:8px;font-weight:500;transition:color .2s}
.lp .btn-outline-nav:hover{color:var(--lp-text)}
.lp nav.lp-navbar{position:fixed;top:0;left:0;right:0;z-index:900;height:var(--lp-nav-h);
  display:flex;align-items:center;padding:0 5%;
  background:rgba(255,255,255,0.8);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border-bottom:1px solid transparent;transition:all .3s}
.lp nav.lp-navbar.scrolled{background:rgba(255,255,255,0.98);border-bottom-color:var(--lp-border)}
.lp .nav-logo{display:flex;align-items:center;gap:10px;margin-right:40px}
.lp .nav-logo-mark{width:32px;height:32px;background:var(--lp-accent);border-radius:10px;
  display:flex;align-items:center;justify-content:center;font-family:'DM Serif Display',serif;font-size:14px;color:#fff;font-weight:700;letter-spacing:-.5px}
.lp .nav-logo-name{font-size:1.1rem;font-weight:700;letter-spacing:-.3px}
.lp .nav-links{display:flex;align-items:center;gap:4px;flex:1}
.lp .nav-link{padding:7px 14px;border-radius:7px;font-size:.85rem;color:var(--lp-muted);font-weight:500;transition:all .2s;cursor:pointer}
.lp .nav-link:hover{color:var(--lp-text);background:rgba(255,255,255,0.05)}
.lp .nav-right{display:flex;align-items:center;gap:8px}
.lp .lang-switcher{position:relative}
.lp .lang-btn{display:flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid var(--lp-border);cursor:pointer;font-size:.82rem;color:var(--lp-muted);transition:all .2s}
.lp .lang-btn:hover{color:var(--lp-text);border-color:var(--lp-border2)}
.lp .lang-btn span.arrow{font-size:.65rem;transition:transform .2s}
.lp .lang-switcher.open .lang-btn span.arrow{transform:rotate(180deg)}
.lp .lang-dd{position:absolute;top:calc(100% + 8px);right:0;background:#fff;border:1px solid var(--lp-border2);border-radius:10px;padding:6px;min-width:140px;opacity:0;pointer-events:none;transform:translateY(-8px);transition:all .2s;z-index:999;box-shadow:0 4px 20px rgba(0,0,0,0.1)}
.lp .lang-switcher.open .lang-dd{opacity:1;pointer-events:auto;transform:none}
.lp .lang-option{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;cursor:pointer;font-size:.83rem;color:var(--lp-muted);transition:all .15s}
.lp .lang-option:hover{background:rgba(91,95,199,0.15);color:var(--lp-text)}
.lp .lang-option.active{color:var(--lp-text);background:rgba(91,95,199,0.1)}
.lp .hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:calc(var(--lp-nav-h) + 60px) 5% 80px;overflow:hidden}
.lp .orbs{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.lp .orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.6}
.lp .orb1{width:500px;height:500px;background:radial-gradient(circle,rgba(13,148,136,0.15),transparent 70%);top:-10%;left:10%;animation:lpOrbFloat1 14s ease-in-out infinite}
.lp .orb2{width:400px;height:400px;background:radial-gradient(circle,rgba(13,148,136,0.1),transparent 70%);top:30%;right:5%;animation:lpOrbFloat2 16s ease-in-out infinite}
.lp .orb3{width:300px;height:300px;background:radial-gradient(circle,rgba(59,130,246,0.08),transparent 70%);bottom:0;left:30%;animation:lpOrbFloat1 12s ease-in-out infinite reverse}
@keyframes lpOrbFloat1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-20px) scale(1.05)}66%{transform:translate(-15px,15px) scale(.97)}}
@keyframes lpOrbFloat2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-25px,20px) scale(1.08)}}
.lp .hero-grid{position:absolute;inset:0;background-image:linear-gradient(var(--lp-border) 1px,transparent 1px),linear-gradient(90deg,var(--lp-border) 1px,transparent 1px);background-size:80px 80px;mask-image:radial-gradient(ellipse 80% 60% at 50% 50%,black,transparent);pointer-events:none}
.lp .hero-inner{position:relative;z-index:1;max-width:800px}
.lp .hero-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;background:rgba(13,148,136,0.08);border:1px solid rgba(13,148,136,0.2);border-radius:100px;font-size:.78rem;color:var(--lp-accent);margin-bottom:28px}
.lp .badge-dot{width:6px;height:6px;border-radius:50%;background:var(--lp-accent);box-shadow:0 0 8px rgba(13,148,136,0.4);animation:lpPulse 2s ease-in-out infinite}
@keyframes lpPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}
.lp .hero h1{font-size:clamp(42px,7vw,72px);color:var(--lp-text);margin-bottom:22px;letter-spacing:-.02em}
.lp .hero-sub{font-size:1.1rem;color:var(--lp-muted);max-width:560px;margin:0 auto 36px;line-height:1.7}
.lp .hero-ctas{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:64px}
.lp .stats-bar{display:flex;gap:0;border:1px solid var(--lp-border);border-radius:14px;overflow:hidden;background:var(--lp-card-bg);backdrop-filter:blur(8px)}
.lp .stat-item{flex:1;padding:18px 24px;text-align:center;border-right:1px solid var(--lp-border)}
.lp .stat-item:last-child{border-right:none}
.lp .stat-val{font-size:1.2rem;font-weight:700;font-family:'DM Serif Display',serif;color:var(--lp-text);display:block}
.lp .stat-lbl{font-size:.72rem;color:var(--lp-muted);display:block;margin-top:2px}
.lp .lp-section{padding:100px 5%}
.lp .section-label{font-size:.72rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--lp-accent);margin-bottom:14px;font-family:'DM Sans',sans-serif}
.lp .section-title{font-size:clamp(32px,4vw,48px);color:var(--lp-text);margin-bottom:16px}
.lp .section-sub{font-size:1rem;color:var(--lp-muted);max-width:540px;line-height:1.7}
.lp .section-head{text-align:center;margin-bottom:64px}
.lp .section-head .section-sub{margin:0 auto}
.lp .bg2{background:var(--lp-bg2)}
.lp .bg3{background:var(--lp-bg3);border-top:1px solid var(--lp-border);border-bottom:1px solid var(--lp-border)}
.lp .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;background:transparent}
.lp .feat-card{background:var(--lp-card-bg);padding:36px 32px;transition:all .25s;position:relative;overflow:hidden;border-radius:16px;border:1px solid var(--lp-border)}
.lp .feat-card::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(13,148,136,.04),transparent);opacity:0;transition:opacity .25s}
.lp .feat-card:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,0,0,0.06)}
.lp .feat-card:hover::after{opacity:1}
.lp .feat-icon{width:48px;height:48px;background:rgba(13,148,136,0.08);border:none;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:20px}
.lp .feat-card h3{font-size:1.05rem;font-family:'DM Serif Display',serif;color:var(--lp-text);margin-bottom:10px}
.lp .feat-card p{font-size:.85rem;color:var(--lp-muted);line-height:1.65}
.lp .hiw-steps{display:flex;gap:0;position:relative}
.lp .hiw-steps::before{content:'';position:absolute;top:28px;left:10%;right:10%;height:1px;background:repeating-linear-gradient(90deg,var(--lp-accent) 0,var(--lp-accent) 8px,transparent 8px,transparent 16px);z-index:0}
.lp .hiw-step{flex:1;text-align:center;padding:0 24px;position:relative;z-index:1}
.lp .hiw-num{width:56px;height:56px;border-radius:50%;background:var(--lp-bg2);border:1px solid rgba(91,95,199,0.4);display:flex;align-items:center;justify-content:center;font-family:'DM Serif Display',serif;font-size:1.4rem;color:var(--lp-accent);margin:0 auto 20px}
.lp .hiw-step h3{font-size:1rem;color:var(--lp-text);margin-bottom:8px}
.lp .hiw-step p{font-size:.83rem;color:var(--lp-muted);line-height:1.6}
.lp .mod-layout{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start}
.lp .mod-list{display:flex;flex-direction:column;gap:4px}
.lp .mod-item{display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:10px;cursor:pointer;border:1px solid transparent;transition:all .2s}
.lp .mod-item:hover{background:var(--lp-card-bg);border-color:var(--lp-card-brd)}
.lp .mod-item.active{background:rgba(91,95,199,0.1);border-color:rgba(91,95,199,0.3)}
.lp .mod-item-icon{font-size:20px;flex-shrink:0;width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.04);border-radius:8px}
.lp .mod-item-text strong{display:block;font-size:.9rem;font-weight:600;color:var(--lp-text)}
.lp .mod-item-text span{font-size:.78rem;color:var(--lp-muted)}
.lp .mod-preview{position:sticky;top:calc(var(--lp-nav-h) + 24px);background:rgba(91,95,199,0.06);border:1px solid rgba(91,95,199,0.15);border-radius:18px;padding:40px;min-height:360px}
.lp .mod-preview-icon{font-size:40px;margin-bottom:20px;display:block}
.lp .mod-preview h3{font-family:'DM Serif Display',serif;font-size:1.5rem;color:var(--lp-text);margin-bottom:14px}
.lp .mod-preview p{font-size:.9rem;color:var(--lp-muted);line-height:1.7;margin-bottom:24px}
.lp .mod-tags{display:flex;flex-wrap:wrap;gap:8px}
.lp .mod-tag{padding:4px 12px;border-radius:100px;background:rgba(13,148,136,0.08);border:1px solid rgba(13,148,136,0.2);font-size:.72rem;color:var(--lp-accent);font-weight:500}
.lp .aud-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.lp .aud-card{background:var(--lp-card-bg);border:1px solid var(--lp-card-brd);border-radius:18px;padding:36px 30px;transition:all .25s;position:relative;overflow:hidden}
.lp .aud-card::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:var(--lp-accent);transform:scaleX(0);transform-origin:left;transition:transform .3s}
.lp .aud-card:hover{transform:translateY(-4px);box-shadow:0 8px 30px rgba(0,0,0,.08)}
.lp .aud-card:hover::after{transform:scaleX(1)}
.lp .aud-icon{font-size:32px;margin-bottom:16px;display:block}
.lp .aud-card h3{font-family:'DM Serif Display',serif;font-size:1.2rem;color:var(--lp-text);margin-bottom:10px}
.lp .aud-card>p{font-size:.85rem;color:var(--lp-muted);margin-bottom:20px}
.lp .aud-list{list-style:none;display:flex;flex-direction:column;gap:8px}
.lp .aud-list li{font-size:.83rem;color:var(--lp-muted);display:flex;align-items:center;gap:8px}
.lp .aud-list li::before{content:'\\2713';color:var(--lp-accent);font-weight:700;flex-shrink:0}
.lp .price-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;align-items:start}
.lp .price-card{background:var(--lp-card-bg);border:1px solid var(--lp-card-brd);border-radius:18px;padding:32px 28px;position:relative;transition:all .2s}
.lp .price-card.featured{background:rgba(91,95,199,0.08);border-color:rgba(91,95,199,0.4);transform:scale(1.03)}
.lp .price-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--lp-accent);color:#fff;font-size:.7rem;font-weight:700;padding:4px 14px;border-radius:100px;white-space:nowrap}
.lp .price-name{font-size:.8rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--lp-muted);margin-bottom:12px}
.lp .price-amount{font-family:'DM Serif Display',serif;font-size:2.8rem;color:var(--lp-text);line-height:1}
.lp .price-amount sup{font-size:1rem;vertical-align:super;margin-right:2px}
.lp .price-mo{font-size:.8rem;color:var(--lp-muted);margin-left:4px}
.lp .price-desc{font-size:.82rem;color:var(--lp-muted);margin:12px 0 20px;line-height:1.5}
.lp .price-sep{height:1px;background:var(--lp-border);margin-bottom:20px}
.lp .price-feats{list-style:none;display:flex;flex-direction:column;gap:9px;margin-bottom:28px}
.lp .price-feats li{font-size:.82rem;color:var(--lp-muted);display:flex;align-items:center;gap:8px}
.lp .price-feats li .ok{color:var(--lp-accent);font-weight:700}
.lp .price-feats li .no{color:var(--lp-muted2)}
.lp .price-cta{width:100%;padding:12px;border-radius:10px;font-weight:600;font-size:.88rem;cursor:pointer;border:none;transition:all .2s;font-family:'DM Sans',sans-serif}
.lp .price-cta-primary{background:var(--lp-accent);color:#fff;box-shadow:0 0 20px var(--lp-glow)}
.lp .price-cta-primary:hover{background:#4e52b8}
.lp .price-cta-secondary{background:transparent;color:var(--lp-text);border:1px solid var(--lp-border2)}
.lp .price-cta-secondary:hover{background:rgba(255,255,255,0.05)}
.lp .cta-section{padding:100px 5%;text-align:center;position:relative;overflow:hidden;background:#F0FDFA}
.lp .cta-section::before{display:none}
.lp .cta-section h2{font-size:clamp(28px,4vw,44px);color:var(--lp-text);max-width:600px;margin:0 auto 18px}
.lp .cta-sub{font-size:1rem;color:var(--lp-muted);max-width:440px;margin:0 auto 36px}
.lp .cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.lp footer.lp-footer{background:#F8FAFB;border-top:1px solid var(--lp-border);padding:64px 5% 40px}
.lp .footer-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px}
.lp .footer-brand{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.lp .footer-tagline{font-size:.83rem;color:var(--lp-muted);max-width:240px;line-height:1.6}
.lp .footer-col h4{font-size:.72rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--lp-muted2);margin-bottom:16px}
.lp .footer-col a{display:block;font-size:.85rem;color:var(--lp-muted);margin-bottom:10px;transition:color .2s;cursor:pointer}
.lp .footer-col a:hover{color:var(--lp-text)}
.lp .footer-bottom{display:flex;align-items:center;justify-content:space-between;padding-top:24px;border-top:1px solid var(--lp-border);flex-wrap:wrap;gap:12px}
.lp .footer-copy{font-size:.78rem;color:var(--lp-muted2)}
.lp .footer-langs{display:flex;gap:6px}
.lp .footer-lang-btn{padding:4px 10px;border-radius:6px;font-size:.73rem;font-weight:600;cursor:pointer;background:transparent;border:1px solid var(--lp-border);color:var(--lp-muted2);transition:all .15s}
.lp .footer-lang-btn:hover,.lp .footer-lang-btn.active{color:var(--lp-text);border-color:var(--lp-border2);background:rgba(255,255,255,0.04)}
.lp .reveal{opacity:0;transform:translateY(20px);transition:opacity .6s ease,transform .6s ease}
.lp .reveal.visible{opacity:1;transform:none}
.lp .reveal-delay-1{transition-delay:.1s}
.lp .reveal-delay-2{transition-delay:.2s}
.lp .reveal-delay-3{transition-delay:.3s}
@media(max-width:900px){
  .lp .nav-links{display:none}
  .lp .feat-grid{grid-template-columns:1fr 1fr}
  .lp .hiw-steps{flex-direction:column;gap:32px}
  .lp .hiw-steps::before{display:none}
  .lp .mod-layout{grid-template-columns:1fr}
  .lp .mod-preview{position:static}
  .lp .aud-grid{grid-template-columns:1fr}
  .lp .price-grid{grid-template-columns:1fr 1fr}
  .lp .price-card.featured{transform:none}
  .lp .footer-grid{grid-template-columns:1fr 1fr}
  .lp .stats-bar{flex-wrap:wrap}
  .lp .stat-item{min-width:50%}
}
@media(max-width:540px){
  .lp .feat-grid{grid-template-columns:1fr}
  .lp .price-grid{grid-template-columns:1fr}
  .lp .footer-grid{grid-template-columns:1fr}
  .lp .hero-ctas{flex-direction:column;align-items:center}
}
`;

/* ─── COMPONENT ──────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [lang, setLangState] = useState(() => localStorage.getItem('ifmio_lang') || 'en');
  const [activeModule, setActiveModule] = useState('finance');
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Auth check — redirect logged-in users
  useEffect(() => {
    const token = sessionStorage.getItem('ifmio:access_token');
    if (token) navigate('/dashboard', { replace: true });
  }, [navigate]);

  // Inject Google Fonts
  useEffect(() => {
    const id = 'lp-google-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Scroll listener for navbar
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Scroll reveal (IntersectionObserver)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    root.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [lang]); // re-observe on lang change

  // Close lang dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.lang-switcher')) setLangOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const t = useCallback(
    (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key,
    [lang],
  );

  const setLang = useCallback((l: string) => {
    setLangState(l);
    localStorage.setItem('ifmio_lang', l);
    setLangOpen(false);
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, []);

  const mod = MODULE_DATA[activeModule];
  const lm = LANG_META[lang] || LANG_META.en;

  return (
    <div className="lp" ref={rootRef}>
      <style>{LANDING_CSS}</style>

      {/* NAVBAR */}
      <nav className={`lp-navbar${scrolled ? ' scrolled' : ''}`}>
        <a href="/" className="nav-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <div className="nav-logo-mark">if</div>
          <span className="nav-logo-name">ifmio</span>
        </a>
        <div className="nav-links">
          <span className="nav-link" onClick={() => scrollTo('features')}>{t('nav.features')}</span>
          <span className="nav-link" onClick={() => scrollTo('modules')}>{t('nav.modules')}</span>
          <span className="nav-link" onClick={() => scrollTo('pricing')}>{t('nav.pricing')}</span>
          <span className="nav-link" onClick={() => scrollTo('contact')}>{t('nav.contact')}</span>
        </div>
        <div className="nav-right">
          <div className={`lang-switcher${langOpen ? ' open' : ''}`}>
            <button className="lang-btn" onClick={(e) => { e.stopPropagation(); setLangOpen(!langOpen); }}>
              <span>{lm.flag}</span>
              <span>{lm.code}</span>
              <span className="arrow">{'\u25be'}</span>
            </button>
            <div className="lang-dd">
              {Object.entries(LANG_META).map(([key, meta]) => (
                <div
                  key={key}
                  className={`lang-option${key === lang ? ' active' : ''}`}
                  onClick={() => setLang(key)}
                >
                  <span>{meta.flag}</span>
                  <span>{meta.code}</span>
                </div>
              ))}
            </div>
          </div>
          <a href="/login" className="btn-outline-nav">{t('nav.login')}</a>
          <a href="/register" className="btn-cta-nav">{t('nav.start')}</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="orbs">
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>
        <div className="hero-grid" />
        <div className="hero-inner">
          <div className="hero-badge reveal">
            <span className="badge-dot" />
            <span>{t('hero.badge')}</span>
          </div>
          <h1 className="reveal reveal-delay-1">{t('hero.h1.before')}<em>{t('hero.h1.em')}</em>{t('hero.h1.after')}</h1>
          <p className="hero-sub reveal reveal-delay-2">{t('hero.sub')}</p>
          <div className="hero-ctas reveal reveal-delay-3">
            <a href="/register" className="btn btn-primary">{t('hero.cta1')}</a>
            <span className="btn btn-secondary" onClick={() => scrollTo('features')}>{t('hero.cta2')}</span>
          </div>
          <div className="stats-bar reveal">
            <div className="stat-item"><span className="stat-val">300K+</span><span className="stat-lbl">{t('stat.units')}</span></div>
            <div className="stat-item"><span className="stat-val">50+</span><span className="stat-lbl">{t('stat.countries')}</span></div>
            <div className="stat-item"><span className="stat-val">99.9%</span><span className="stat-lbl">{t('stat.uptime')}</span></div>
            <div className="stat-item"><span className="stat-val">24/7</span><span className="stat-lbl">{t('stat.support')}</span></div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section" id="features">
        <div className="section-head reveal">
          <div className="section-label">{t('features.label')}</div>
          <h2 className="section-title">{t('features.title')}</h2>
          <p className="section-sub">{t('features.sub')}</p>
        </div>
        <div className="feat-grid reveal">
          {([
            ['🏢','feat.prop'],['💰','feat.fin'],['🔧','feat.wo'],
            ['📊','feat.rep'],['📡','feat.meter'],['🔒','feat.access'],
          ] as const).map(([icon, key]) => (
            <div className="feat-card" key={key}>
              <div className="feat-icon">{icon}</div>
              <h3>{t(`${key}.title`)}</h3>
              <p>{t(`${key}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-section bg3">
        <div className="section-head reveal">
          <div className="section-label">{t('hiw.label')}</div>
          <h2 className="section-title">{t('hiw.title')}</h2>
        </div>
        <div className="hiw-steps">
          {[1,2,3,4].map((n) => (
            <div className={`hiw-step reveal${n > 1 ? ` reveal-delay-${n - 1}` : ''}`} key={n}>
              <div className="hiw-num">{n}</div>
              <h3>{t(`step${n}.title`)}</h3>
              <p>{t(`step${n}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MODULES */}
      <section className="lp-section bg2" id="modules">
        <div className="section-head reveal">
          <div className="section-label">{t('mod.label')}</div>
          <h2 className="section-title">{t('mod.title')}</h2>
        </div>
        <div className="mod-layout">
          <div className="mod-list">
            {MODULES_ORDER.map((key) => (
              <div
                key={key}
                className={`mod-item${activeModule === key ? ' active' : ''}`}
                onClick={() => setActiveModule(key)}
              >
                <div className="mod-item-icon">{MODULE_DATA[key].icon}</div>
                <div className="mod-item-text">
                  <strong>{t(MODULE_DATA[key].titleKey)}</strong>
                  <span>{t(`mod.${key}.short`)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mod-preview">
            <span className="mod-preview-icon">{mod.icon}</span>
            <h3>{t(mod.titleKey)}</h3>
            <p>{t(mod.textKey)}</p>
            <div className="mod-tags">
              {mod.tags.map((tag) => (
                <span className="mod-tag" key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AUDIENCE */}
      <section className="lp-section">
        <div className="section-head reveal">
          <div className="section-label">{t('aud.label')}</div>
          <h2 className="section-title">{t('aud.title')}</h2>
        </div>
        <div className="aud-grid">
          {([
            { key: 'pm', icon: '🏢', items: ['1','2','3','4'] },
            { key: 'fm', icon: '🔩', items: ['1','2','3','4'] },
            { key: 'dev', icon: '🏗', items: ['1','2','3','4'] },
          ]).map((aud, i) => (
            <div className={`aud-card reveal${i > 0 ? ` reveal-delay-${i}` : ''}`} key={aud.key}>
              <span className="aud-icon">{aud.icon}</span>
              <h3>{t(`aud.${aud.key}.title`)}</h3>
              <p>{t(`aud.${aud.key}.desc`)}</p>
              <ul className="aud-list">
                {aud.items.map((n) => (
                  <li key={n}>{t(`aud.${aud.key}.${n}`)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* SECURITY */}
      <section className="lp-section" id="security" style={{ background: '#F0FDFA' }}>
        <div className="section-head reveal">
          <div className="section-label">{t('sec.label')}</div>
          <h2 className="section-title">{t('sec.title')}</h2>
          <p className="section-sub">{t('sec.sub')}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
          {[
            { key: 'enc', icon: '🔐' },
            { key: 'cf', icon: '☁️' },
            { key: 'auth', icon: '🔑' },
            { key: 'tenant', icon: '🏢' },
            { key: 'gdpr', icon: '📋' },
            { key: 'backup', icon: '💾' },
          ].map(s => (
            <div key={s.key} className="reveal" style={{
              background: 'var(--lp-card-bg)', borderRadius: 12, padding: '28px 24px',
              border: '1px solid var(--lp-card-brd)', transition: 'box-shadow 0.2s',
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--lp-text)', marginBottom: 8 }}>
                {t(`sec.${s.key}.title`)}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--lp-muted)', lineHeight: 1.65 }}>
                {t(`sec.${s.key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="lp-section bg2" id="pricing">
        <div className="section-head reveal">
          <div className="section-label">{t('price.label')}</div>
          <h2 className="section-title">{t('price.title')}</h2>
          <p className="section-sub">{t('price.sub')}</p>
        </div>
        <div className="price-grid reveal">
          {/* Free */}
          <div className="price-card">
            <div className="price-name">{t('plan.free.name')}</div>
            <div className="price-amount"><sup>&euro;</sup>0<span className="price-mo">{t('price.mo')}</span></div>
            <div className="price-desc">{t('plan.free.desc')}</div>
            <div className="price-sep" />
            <ul className="price-feats">
              <li><span className="ok">{'\u2713'}</span> 1 {t('pf.property')}</li>
              <li><span className="ok">{'\u2713'}</span> 50 {t('pf.units')}</li>
              <li><span className="ok">{'\u2713'}</span> 2 {t('pf.users')}</li>
              <li><span className="no">{'\u2013'}</span> {t('pf.api')}</li>
              <li><span className="no">{'\u2013'}</span> {t('pf.isdoc')}</li>
            </ul>
            <button className="price-cta price-cta-secondary" onClick={() => navigate('/register')}>{t('plan.cta.free')}</button>
          </div>
          {/* Starter */}
          <div className="price-card">
            <div className="price-name">{t('plan.starter.name')}</div>
            <div className="price-amount"><sup>&euro;</sup>29<span className="price-mo">{t('price.mo')}</span></div>
            <div className="price-desc">{t('plan.starter.desc')}</div>
            <div className="price-sep" />
            <ul className="price-feats">
              <li><span className="ok">{'\u2713'}</span> 5 {t('pf.properties')}</li>
              <li><span className="ok">{'\u2713'}</span> 200 {t('pf.units')}</li>
              <li><span className="ok">{'\u2713'}</span> 5 {t('pf.users')}</li>
              <li><span className="no">{'\u2013'}</span> {t('pf.api')}</li>
              <li><span className="ok">{'\u2713'}</span> {t('pf.isdoc')}</li>
            </ul>
            <button className="price-cta price-cta-secondary" onClick={() => navigate('/register')}>{t('plan.cta.paid')}</button>
          </div>
          {/* Professional */}
          <div className="price-card featured">
            <div className="price-badge">{t('plan.popular')}</div>
            <div className="price-name">{t('plan.pro.name')}</div>
            <div className="price-amount"><sup>&euro;</sup>89<span className="price-mo">{t('price.mo')}</span></div>
            <div className="price-desc">{t('plan.pro.desc')}</div>
            <div className="price-sep" />
            <ul className="price-feats">
              <li><span className="ok">{'\u2713'}</span> 20 {t('pf.properties')}</li>
              <li><span className="ok">{'\u2713'}</span> 1000 {t('pf.units')}</li>
              <li><span className="ok">{'\u2713'}</span> 15 {t('pf.users')}</li>
              <li><span className="ok">{'\u2713'}</span> {t('pf.api')}</li>
              <li><span className="ok">{'\u2713'}</span> {t('pf.isdoc')}</li>
            </ul>
            <button className="price-cta price-cta-primary" onClick={() => navigate('/register')}>{t('plan.cta.paid')}</button>
          </div>
          {/* Enterprise */}
          <div className="price-card">
            <div className="price-name">{t('plan.ent.name')}</div>
            <div className="price-amount" style={{ fontSize: '1.8rem' }}>{t('plan.ent.price')}</div>
            <div className="price-desc">{t('plan.ent.desc')}</div>
            <div className="price-sep" />
            <ul className="price-feats">
              <li><span className="ok">{'\u2713'}</span> {t('pf.unlimited')}</li>
              <li><span className="ok">{'\u2713'}</span> {t('pf.unlimitedU')}</li>
              <li><span className="ok">{'\u2713'}</span> {t('pf.unlimitedUs')}</li>
              <li><span className="ok">{'\u2713'}</span> {t('pf.api')}</li>
              <li><span className="ok">{'\u2713'}</span> {t('pf.isdoc')}</li>
            </ul>
            <button className="price-cta price-cta-secondary" onClick={() => { window.location.href = 'mailto:sales@ifmio.com'; }}>{t('plan.cta.ent')}</button>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="cta-section" id="contact">
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
          <h2 className="reveal">{t('cta.title')}</h2>
          <p className="cta-sub reveal reveal-delay-1">{t('cta.sub')}</p>
          <div className="cta-btns reveal reveal-delay-2">
            <a href="/register" className="btn btn-primary">{t('cta.btn1')}</a>
            <a href="mailto:sales@ifmio.com" className="btn btn-secondary">{t('cta.btn2')}</a>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" style={{ padding: '80px 5%', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 'clamp(24px,3vw,36px)', marginBottom: 16, color: 'var(--lp-text)' }}>O ifmio</h2>
        <p style={{ fontSize: '1rem', color: 'var(--lp-muted)', lineHeight: 1.7, marginBottom: 12 }}>
          ifmio je modern&iacute; platforma pro spr&aacute;vu nemovitost&iacute; a facility management.
          Vyvinuto v &Ccaron;R, provozov&aacute;no v cloudu.
        </p>
        <p style={{ fontSize: '.9rem', color: 'var(--lp-muted2)' }}>
          Kontakt: <a href="mailto:info@ifmio.cz" style={{ color: 'var(--lp-accent)' }}>info@ifmio.cz</a>
        </p>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <div className="nav-logo-mark" style={{ width: 28, height: 28, fontSize: 12 }}>if</div>
              <span style={{ fontSize: '1rem', fontWeight: 700 }}>ifmio</span>
            </div>
            <p className="footer-tagline">{t('footer.tagline')}</p>
          </div>
          <div className="footer-col">
            <h4>{t('footer.product')}</h4>
            <span style={{ display: 'block', fontSize: '.85rem', color: 'var(--lp-muted)', marginBottom: 10, cursor: 'pointer' }} onClick={() => scrollTo('features')}>{t('nav.features')}</span>
            <span style={{ display: 'block', fontSize: '.85rem', color: 'var(--lp-muted)', marginBottom: 10, cursor: 'pointer' }} onClick={() => scrollTo('modules')}>{t('nav.modules')}</span>
            <span style={{ display: 'block', fontSize: '.85rem', color: 'var(--lp-muted)', marginBottom: 10, cursor: 'pointer' }} onClick={() => scrollTo('pricing')}>{t('nav.pricing')}</span>
            <a href="/login">{t('footer.app')}</a>
          </div>
          <div className="footer-col">
            <h4>{t('footer.company')}</h4>
            <span style={{ display: 'block', fontSize: '.85rem', color: 'var(--lp-muted)', marginBottom: 10, cursor: 'pointer' }} onClick={() => scrollTo('about')}>{t('footer.about')}</span>
            <a href="mailto:info@ifmio.cz">{t('footer.contact')}</a>
          </div>
          <div className="footer-col">
            <h4>{t('footer.legal')}</h4>
            <a href="/privacy">{t('footer.privacy')}</a>
            <a href="/terms">{t('footer.terms')}</a>
            <a href="/gdpr">{t('footer.gdpr')}</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-copy">&copy; {new Date().getFullYear()} IFMIO Ltd. All rights reserved.</span>
          <div className="footer-langs">
            {Object.entries(LANG_META).map(([key, meta]) => (
              <button
                key={key}
                className={`footer-lang-btn${key === lang ? ' active' : ''}`}
                onClick={() => setLang(key)}
              >
                {meta.code}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
