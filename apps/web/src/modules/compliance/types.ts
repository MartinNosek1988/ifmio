export interface NonConformity {
  id: string;
  nazev: string;
  propId: number;
  kategorie: string;
  zavaznost: string;
  stav: string;
  popis: string;
  datumZjisteni: string;
  terminNapravy: string;
}

export interface CorrectiveAction {
  id: string;
  ncId: string;
  nazev: string;
  stav: string;
  zodpovedny: string;
  terminSplneni: string;
  popis: string;
}
