export interface AresStatutarniClen {
  jmeno: string;
  prijmeni: string;
  titulPred?: string;
  funkce: string;           // "předseda výboru" | "místopředseda výboru" | "člen výboru" | "předseda SVJ"
  datumZapisu?: string;     // ISO date
  datumVymazu?: string;     // ISO date — null = stále aktivní
  vznikFunkce?: string;
  zanikFunkce?: string;
  adresa?: string;          // textovaAdresa
  datumNarozeni?: string;
  kbPersonId?: string;      // link to KbPerson if matched
}

export interface AresFullData {
  // Ze základního endpointu
  ico: string;
  nazev: string;
  pravniForma: string;      // "145" = SVJ, "110" = BD
  sidlo: string;            // textovaAdresa
  dic?: string;
  datumVzniku?: string;
  datumAktualizace?: string;
  stavVr: string;           // z seznamRegistraci.stavZdrojeVr: "AKTIVNI" | "NEEXISTUJICI"
  czNace?: string[];
  spisovaZnacka?: string;   // z dalsiUdaje[].datovyZdroj="vr" → spisovaZnacka

  // Ze /ekonomicke-subjekty-vr endpointu
  statutarniOrgan?: {
    nazev: string;          // "Statutární orgán" | "Statutární orgán - představenstvo"
    clenove: AresStatutarniClen[];
  };

  // Ze /ekonomicke-subjekty-ros endpointu
  datovaSChrana?: string;  // ID datové schránky ze zdroje ROS
  stavRos?: string;        // "AKTIVNI" / "ZANIKLÝ" / atd.

  fetchedAt: string; // ISO
}
