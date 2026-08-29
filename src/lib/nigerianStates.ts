// Full Catalog of 36 Nigerian States + Federal Capital Territory (Abuja)
// Includes geographic center coordinates and primary commercial cities / LGAs for non-tech users

export interface NigerianStateDef {
  name: string;
  code: string;
  capital: string;
  lat: number;
  lng: number;
  cities: string[];
}

export const NIGERIAN_STATES: NigerianStateDef[] = [
  {
    name: "Abia",
    code: "AB",
    capital: "Umuahia",
    lat: 5.4527,
    lng: 7.5248,
    cities: ["Aba", "Umuahia", "Ohafia", "Arochukwu", "Osisioma", "Bende"],
  },
  {
    name: "Adamawa",
    code: "AD",
    capital: "Yola",
    lat: 9.3265,
    lng: 12.4452,
    cities: ["Yola", "Mubi", "Jimeta", "Numan", "Ganye", "Michika"],
  },
  {
    name: "Akwa Ibom",
    code: "AK",
    capital: "Uyo",
    lat: 5.0377,
    lng: 7.9128,
    cities: ["Uyo", "Eket", "Ikot Ekpene", "Oron", "Abak", "Ikot Abasi"],
  },
  {
    name: "Anambra",
    code: "AN",
    capital: "Awka",
    lat: 6.2209,
    lng: 7.0722,
    cities: ["Onitsha", "Awka", "Nnewi", "Ekwulobia", "Ihiala", "Aguata"],
  },
  {
    name: "Bauchi",
    code: "BA",
    capital: "Bauchi",
    lat: 10.3158,
    lng: 9.8442,
    cities: ["Bauchi", "Azare", "Misau", "Jama'are", "Katagum", "Ningi"],
  },
  {
    name: "Bayelsa",
    code: "BY",
    capital: "Yenagoa",
    lat: 4.9267,
    lng: 6.2676,
    cities: ["Yenagoa", "Brass", "Ogbia", "Sagbama", "Nembe", "Amassoma"],
  },
  {
    name: "Benue",
    code: "BE",
    capital: "Makurdi",
    lat: 7.7321,
    lng: 8.5391,
    cities: ["Makurdi", "Gboko", "Otukpo", "Katsina-Ala", "Vandeikya", "Zaki Biam"],
  },
  {
    name: "Borno",
    code: "BO",
    capital: "Maiduguri",
    lat: 11.8333,
    lng: 13.15,
    cities: ["Maiduguri", "Biu", "Bama", "Dikwa", "Monguno", "Gwoza"],
  },
  {
    name: "Cross River",
    code: "CR",
    capital: "Calabar",
    lat: 4.9757,
    lng: 8.3417,
    cities: ["Calabar", "Ikom", "Ogoja", "Obudu", "Ugep", "Akamkpa"],
  },
  {
    name: "Delta",
    code: "DE",
    capital: "Asaba",
    lat: 6.1984,
    lng: 6.7299,
    cities: ["Warri", "Asaba", "Ughelli", "Sapele", "Agbor", "Effurun", "Oghara"],
  },
  {
    name: "Ebonyi",
    code: "EB",
    capital: "Abakaliki",
    lat: 6.3249,
    lng: 8.1137,
    cities: ["Abakaliki", "Afikpo", "Onueke", "Ishielu", "Ezza", "Edda"],
  },
  {
    name: "Edo",
    code: "ED",
    capital: "Benin City",
    lat: 6.335,
    lng: 5.6037,
    cities: ["Benin City", "Auchi", "Ekpoma", "Uromi", "Ubiaja", "Igarra"],
  },
  {
    name: "Ekiti",
    code: "EK",
    capital: "Ado Ekiti",
    lat: 7.6212,
    lng: 5.2215,
    cities: ["Ado Ekiti", "Ikere", "Ijero", "Oye", "Ilawe", "Efon Alaaye"],
  },
  {
    name: "Enugu",
    code: "EN",
    capital: "Enugu",
    lat: 6.4584,
    lng: 7.5464,
    cities: ["Enugu", "Nsukka", "Awgu", "Udi", "Oji River", "Nkanu"],
  },
  {
    name: "Federal Capital Territory",
    code: "FC",
    capital: "Abuja",
    lat: 9.0579,
    lng: 7.4951,
    cities: ["Abuja Central", "Garki", "Wuse", "Maitama", "Asokoro", "Gwarinpa", "Kubwa", "Lugbe", "Bwari", "Kuje"],
  },
  {
    name: "Gombe",
    code: "GO",
    capital: "Gombe",
    lat: 10.2897,
    lng: 11.1673,
    cities: ["Gombe", "Kaltungo", "Billiri", "Bajoga", "Dukku", "Nafada"],
  },
  {
    name: "Imo",
    code: "IM",
    capital: "Owerri",
    lat: 5.4836,
    lng: 7.0333,
    cities: ["Owerri", "Orlu", "Okigwe", "Mbaise", "Oguta", "Mbano"],
  },
  {
    name: "Jigawa",
    code: "JI",
    capital: "Dutse",
    lat: 11.7591,
    lng: 9.3389,
    cities: ["Dutse", "Hadejia", "Gumel", "Kazaure", "Birnin Kudu", "Ringim"],
  },
  {
    name: "Kaduna",
    code: "KD",
    capital: "Kaduna",
    lat: 10.5105,
    lng: 7.4165,
    cities: ["Kaduna", "Zaria", "Kafanchan", "Kagoro", "Saminaka", "Birnin Gwari"],
  },
  {
    name: "Kano",
    code: "KN",
    capital: "Kano",
    lat: 12.0022,
    lng: 8.592,
    cities: ["Kano Municipal", "Fagge", "Dala", "Gwale", "Tarauni", "Nassarawa", "Wudil", "Bichi"],
  },
  {
    name: "Katsina",
    code: "KT",
    capital: "Katsina",
    lat: 12.9908,
    lng: 7.6018,
    cities: ["Katsina", "Daura", "Funtua", "Malumfashi", "Kankia", "Dutsin-Ma"],
  },
  {
    name: "Kebbi",
    code: "KB",
    capital: "Birnin Kebbi",
    lat: 12.4539,
    lng: 4.1975,
    cities: ["Birnin Kebbi", "Argungu", "Yauri", "Zuru", "Jega", "Kamba"],
  },
  {
    name: "Kogi",
    code: "KO",
    capital: "Lokoja",
    lat: 7.7969,
    lng: 6.7405,
    cities: ["Lokoja", "Okene", "Kabba", "Idah", "Anyigba", "Ajaokuta"],
  },
  {
    name: "Kwara",
    code: "KW",
    capital: "Ilorin",
    lat: 8.4966,
    lng: 4.5421,
    cities: ["Ilorin", "Offa", "Omu-Aran", "Lafiagi", "Jebba", "Patigi"],
  },
  {
    name: "Lagos",
    code: "LA",
    capital: "Ikeja",
    lat: 6.5244,
    lng: 3.3792,
    cities: [
      "Ikeja",
      "Lekki",
      "Victoria Island",
      "Lagos Island",
      "Yaba",
      "Surulere",
      "Ikoyi",
      "Ajah",
      "Alaba",
      "Festac",
      "Ikorodu",
      "Epe",
      "Oshodi",
      "Maryland",
      "Agege",
    ],
  },
  {
    name: "Nasarawa",
    code: "NA",
    capital: "Lafia",
    lat: 8.4932,
    lng: 8.5153,
    cities: ["Lafia", "Keffi", "Akwanga", "Karu", "Nasarawa", "Doma"],
  },
  {
    name: "Niger",
    code: "NI",
    capital: "Minna",
    lat: 9.6139,
    lng: 6.5569,
    cities: ["Minna", "Bida", "Suleja", "Kontagora", "Lapai", "Mokwa"],
  },
  {
    name: "Ogun",
    code: "OG",
    capital: "Abeokuta",
    lat: 7.1475,
    lng: 3.3619,
    cities: ["Abeokuta", "Ijebu Ode", "Sagamu", "Ota", "Ilaro", "Mowe", "Ibafo"],
  },
  {
    name: "Ondo",
    code: "ON",
    capital: "Akure",
    lat: 7.2571,
    lng: 5.2058,
    cities: ["Akure", "Ondo City", "Owo", "Ikare", "Ore", "Okitipupa"],
  },
  {
    name: "Osun",
    code: "OS",
    capital: "Osogbo",
    lat: 7.7827,
    lng: 4.5418,
    cities: ["Osogbo", "Ile-Ife", "Ilesa", "Ede", "Ikirun", "Ila Orangun"],
  },
  {
    name: "Oyo",
    code: "OY",
    capital: "Ibadan",
    lat: 7.3775,
    lng: 3.947,
    cities: ["Ibadan", "Ogbomoso", "Oyo", "Iseyin", "Saki", "Eruwa"],
  },
  {
    name: "Plateau",
    code: "PL",
    capital: "Jos",
    lat: 9.8965,
    lng: 8.8583,
    cities: ["Jos", "Bukuru", "Pankshin", "Shendam", "Langtang", "Barkin Ladi"],
  },
  {
    name: "Rivers",
    code: "RI",
    capital: "Port Harcourt",
    lat: 4.8156,
    lng: 7.0498,
    cities: ["Port Harcourt", "Obio-Akpor", "Bonny", "Eleme", "Oyigbo", "Okrika", "Ahoada"],
  },
  {
    name: "Sokoto",
    code: "SO",
    capital: "Sokoto",
    lat: 13.0601,
    lng: 5.2407,
    cities: ["Sokoto", "Tambuwal", "Wamakko", "Gwadabawa", "Bodinga", "Illela"],
  },
  {
    name: "Taraba",
    code: "TA",
    capital: "Jalingo",
    lat: 8.8937,
    lng: 11.3596,
    cities: ["Jalingo", "Wukari", "Gembu", "Bali", "Takum", "Ibi"],
  },
  {
    name: "Yobe",
    code: "YO",
    capital: "Damaturu",
    lat: 11.747,
    lng: 11.9608,
    cities: ["Damaturu", "Potiskum", "Gashua", "Nguru", "Geidam", "Buni Yadi"],
  },
  {
    name: "Zamfara",
    code: "ZA",
    capital: "Gusau",
    lat: 12.1628,
    lng: 6.6614,
    cities: ["Gusau", "Kaura Namoda", "Talata Mafara", "Anka", "Maru", "Shinkafi"],
  },
];

export function getStateByName(name?: string | null): NigerianStateDef | undefined {
  if (!name) return undefined;
  const clean = name.trim().toLowerCase().replace(/state|fct/g, "").trim();
  return NIGERIAN_STATES.find(
    (s) =>
      s.name.toLowerCase() === name.toLowerCase() ||
      s.name.toLowerCase().includes(clean) ||
      clean.includes(s.name.toLowerCase())
  );
}

export function getStateCoordinates(stateName?: string | null): { lat: number; lng: number } {
  const found = getStateByName(stateName);
  if (found) {
    return { lat: found.lat, lng: found.lng };
  }
  // Default to Lagos State center
  return { lat: 6.5244, lng: 3.3792 };
}
