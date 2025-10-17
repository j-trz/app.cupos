  import { useState, useEffect } from "react";
  import AgencyService from "../services/agencyService";
  import UserService from "../services/userService";

// Diccionario de aerolíneas
export const AIRLINES = {
  'A3': 'Aegean Airlines',
  'AA': 'American Airlines',
  'AB': 'Air Berlin',
  'AC': 'Air Canada',
  'AD': 'Azul Linhas Aéreas',
  'AI': 'Air India',
  'AM': 'Aeroméxico',
  'AF': 'Air France',
  'AR': 'Aerolíneas Argentinas',
  'AS': 'Alaska Airlines',
  'AT': 'Royal Air Maroc',
  'AV': 'Avianca',
  'AY': 'Finnair',
  'AZ': 'Alitalia',
  'BA': 'British Airways',
  'BE': 'Flybe',
  'BH': 'Bamboo Airways',
  'BR': 'EVA Air',
  'BT': 'Air Baltic',
  'BW': 'Caribbean Airlines',
  'CA': 'Air China',
  'CI': 'China Airlines',
  'CM': 'Copa Airlines',
  'CU': 'Cubana de Aviación',
  'CX': 'Cathay Pacific',
  'CY': 'Cyprus Airways',
  'DE': 'Condor Flugdienst',
  'DL': 'Delta Air Lines',
  'EI': 'Aer Lingus',
  'EK': 'Emirates',
  'EQ': 'Equair',
  'ET': 'Ethiopian Airlines',
  'EY': 'Etihad Airways',
  'F9': 'Frontier Airlines',
  'FI': 'Icelandair',
  'FJ': 'Fiji Airways',
  'FZ': 'Flydubai',
  'G3': 'Gol Linhas Aéreas',
  'GF': 'Gulf Air',
  'H1': 'Hainan Airlines',
  'H2': 'TUI Airways',
  'HA': 'Hawaiian Airlines',
  'HU': 'Hainan Airlines',
  'HX': 'Hong Kong Airlines',
  'IB': 'Iberia',
  'JA': 'Jetsmart',
  'JL': 'Japan Airlines',
  'KE': 'Korean Air',
  'KL': 'KLM Royal Dutch Airlines',
  'LA': 'LATAM Airlines',
  'LH': 'Lufthansa',
  'LY': 'EL AL Israel Airlines',
  'LO': 'LOT Polish Airlines',
  'LX': 'Swiss International Air Lines',
  'ME': 'Middle East Airlines',
  'MH': 'Malaysia Airlines',
  'MX': 'Mexicana de Aviación',
  'MS': 'EgyptAir',
  'NH': 'All Nippon Airways',
  'NZ': 'Air New Zealand',
  'OB': 'Boliviana de Aviación',
  'OK': 'Czech Airlines',
  'OM': 'Oman Air',
  'OS': 'Austrian Airlines',
  'OU': 'Croatia Airlines',
  'OZ': 'Asiana Airlines',
  'QF': 'Qantas',
  'QR': 'Qatar Airways',
  'RJ': 'Royal Jordanian',
  'SK': 'SAS',
  'SA': 'South African Airways',
  'SC': 'Air Seychelles',
  'SQ': 'Singapore Airlines',
  'TK': 'Turkish Airlines',
  'TP': 'TAP Air Portugal',
  'U2': 'easyJet',
  'UA': 'United Airlines',
  'UX': 'Air Europa',
  'W6': 'Wizz Air',
  'P5': 'Wingo',
  'VY': 'Vueling',
  'FR': 'Ryanair',
};

// Diccionario de imágenes de aerolíneas
export const AIRLINE_LOGOS = {
  'A3': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/a3.png',
  'AA': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/aa.png',
  'AB': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ab.png',
  'AC': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ac.png',
  'AD': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ad.png',
  'AF': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/af.png',
  'AI': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ai.png',
  'AM': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/am.png',
  'AR': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ar.png',
  'AS': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/as.png',
  'AT': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/at.png',
  'AV': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/av.png',
  'AY': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ay.png',
  'AZ': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/az.png',
  'BA': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ba.png',
  'BE': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/be.png',
  'BH': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/bh.png',
  'BR': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/br.png',
  'BT': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/bt.png',
  'BW': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/bw.png',
  'CA': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ca.png',
  'CI': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ci.png',
  'CM': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/cm.png',
  'CU': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/cu.png',
  'CX': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/cx.png',
  'CY': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/cy.png',
  'DE': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/de.png',
  'DL': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/dl.png',
  'EI': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ei.png',
  'EK': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ek.png',
  'EQ': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/eq.png',
  'ET': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/et.png',
  'EY': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ey.png',
  'F9': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/f9.png',
  'FI': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/fi.png',
  'FJ': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/fj.png',
  'FR': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/fr.png',
  'FZ': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/fz.png',
  'G3': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/g3.png',
  'GF': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/gf.png',
  'H1': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/h1.png',
  'H2': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/h2.png',
  'HA': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ha.png',
  'HU': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/hu.png',
  'HX': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/hx.png',
  'IB': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ib.png',
  'JA': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ja.png',
  'JL': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/jl.png',
  'KE': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ke.png',
  'KL': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/kl.png',
  'LA': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/la.png',
  'LH': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/lh.png',
  'LO': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/lo.png',
  'LX': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/lx.png',
  'ME': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/me.png',
  'MH': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/mh.png',
  'MS': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ms.png',
  'P5': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/p5.png',
  'TK': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/tk.png',
  'TP': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/tp.png',
  'UA': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ua.png',
  'UX': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ux.png',
  'VY': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/vy.png',
  'U2': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/u2.png',
  'ZP': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/zp.png',
  
};

 // Diccionario de aeropuertos
export const AIRPORTS = {
  'MVD': 'Montevideo, Carrasco',
  'REC': 'Recife, Guararapes',
  'FOR': 'Fortaleza, Pinto Martins',
  'NAT': 'Natal, Augusto Severo',
  'SSA': 'Salvador, Deputado Luís Eduardo Magalhães',
  'EZE': 'Buenos Aires, Ezeiza',
  'AEP': 'Buenos Aires, Jorge Newbery',
  'GRU': 'São Paulo, Guarulhos',
  'CGH': 'São Paulo, Congonhas',
  'GIG': 'Rio de Janeiro, Galeão',
  'SDU': 'Rio de Janeiro, Santos Dumont',
  'BSB': 'Brasília',
  'SCL': 'Santiago de Chile',
  'ANF': 'Antofagasta, Cerro Moreno',
  'CPP': 'Concepción, Carriel Sur',
  'LIM': 'Lima, Jorge Chávez',
  'CUZ': 'Cusco, Alejandro Velasco Astete',
  'BOG': 'Bogotá, El Dorado',
  'MDE': 'Medellín, José María Córdova',
  'SMR': 'Santa Marta, Simón Bolívar',
  'CLO': 'Cali, Alfonso Bonilla Aragón',
  'CTG': 'Cartagena, Rafael Núñez',
  'UIO': 'Quito, Mariscal Sucre',
  'GYE': 'Guayaquil, José Joaquín de Olmedo',
  'CCS': 'Caracas, Simón Bolívar',
  'ASU': 'Asunción, Silvio Pettirossi',
  'LPB': 'La Paz, El Alto',
  'MAD': 'Madrid, Barajas',
  'BCN': 'Barcelona, El Prat',
  'CDG': 'París, Charles de Gaulle',
  'ORY': 'París, Orly',
  'AMS': 'Ámsterdam, Schiphol',
  'FRA': 'Frankfurt am Main',
  'MIA': 'Miami',
  'JFK': 'Nueva York, John F. Kennedy',
  'LAX': 'Los Ángeles',
  'PTY': 'Ciudad de Panamá, Tocumen',
  'YYZ': 'Toronto, Pearson',
  'YUL': 'Montreal, Trudeau',
  'YVR': 'Vancouver, Vancouver International',
  'YYC': 'Calgary, Calgary International',
  'SFO': 'San Francisco',
  'CUN': 'Cancún, Cancún International',
  'HND': 'Tokio, Haneda',
  'SIN': 'Singapur, Changi',
  'SYD': 'Sídney, Kingsford Smith',
  'AKL': 'Auckland, Auckland Airport',
  'NRT': 'Tokio, Narita',
  'HKG': 'Hong Kong, Hong Kong International',
  'PVG': 'Shanghái, Pudong',
  'ICN': 'Seúl, Incheon',
  'DEL': 'Delhi, Indira Gandhi',
  'PUJ': 'Punta Cana, Punta Cana Internacional',
  'SJO': 'San José, Juan Santamaría',
  'LIS': 'Lisboa, Humberto Delgado',
  'OPO': 'Oporto, Francisco Sá Carneiro',
  'FCO': 'Roma, Fiumicino',
  'VCE': 'Venecia, Marco Polo',
  'MXP': 'Milán, Malpensa',
  'ZRH': 'Zúrich, Kloten',
  'GVA': 'Ginebra, Cointrin',
  'BRU': 'Bruselas, Zaventem',
  'DUB': 'Dublín, Dublín',
  'EDI': 'Edimburgo, Edimburgo',
  'GLA': 'Glasgow, Glasgow',
  'MAN': 'Manchester, Manchester',
  'STN': 'Londres, Stansted',
  'LTN': 'Londres, Luton',
  'LGW': 'Londres, Gatwick',
  'LHR': 'Londres, Heathrow',
  'NCE': 'Niza, Côte d\'Azur',
  'LYS': 'Lyon, Saint-Exupéry',
  'MRS': 'Marsella, Provenza',
  'TLS': 'Toulouse, Blagnac',
  'BOD': 'Burdeos, Mérignac',
  'AGP': 'Málaga, Costa del Sol',
  'SVQ': 'Sevilla, San Pablo',
  'BIO': 'Bilbao, Loiu',
  'VLC': 'Valencia, Manises',
  'ALC': 'Alicante, Elche',
  'PMI': 'Palma de Mallorca, Son Sant Joan',
  'IBZ': 'Ibiza, Ibiza',
  'FUE': 'Fuerteventura, Fuerteventura',
  'ACE': 'Lanzarote, Lanzarote',
  'TFS': 'Tenerife, Reina Sofía',
  'TFN': 'Tenerife, Norte-Ciudad de La Laguna',
  'LPA': 'Gran Canaria, Gran Canaria',
  'SPC': 'La Palma, La Palma',
  'VDE': 'El Hierro, El Hierro',
  'VGO': 'Vigo, Vigo-Peinador',
  'SCQ': 'Santiago de Compostela, Lavacolla',
  'CUR': 'Curazao, Hato',
  'AUA': 'Aruba, Reina Beatriz',
  'SXM': 'San Martín, Princess Juliana',
  'BGI': 'Barbados, Grantley Adams',
  'GND': 'Granada, Maurice Bishop',
  'PTP': 'Pointe-à-Pitre, Le Raizet',
  'FDF': 'Fort-de-France, Martinica',
  'EIS': 'Islas Vírgenes Británicas, Terrance B. Lettsome',
  'STT': 'Islas Vírgenes de EE.UU., Cyril E. King',
  'FLL': 'Fort Lauderdale',
  'ORD': 'Chicago, O\'Hare',
  'ATL': 'Atlanta, Hartsfield-Jackson',
  'DFW': 'Dallas/Fort Worth',
  'DEN': 'Denver, Denver International',
  'CLT': 'Charlotte, Charlotte Douglas',
  'PHX': 'Phoenix, Sky Harbor',
  'IAH': 'Houston, George Bush Intercontinental',
  'MCO': 'Orlando, Orlando International',
  'MSP': 'Minneapolis, Minneapolis-Saint Paul',
  'DTW': 'Detroit, Detroit Metropolitan',
  'BOS': 'Boston, Logan',
  'SLC': 'Salt Lake City, Salt Lake City International',
  'SAN': 'San Diego, San Diego International',
  'TPA': 'Tampa, Tampa International',
  'HOU': 'Houston, William P. Hobby',
  'OAK': 'Oakland, Oakland International',
  'SJC': 'San José, Norman Y. Mineta San José',
  'RDU': 'Raleigh/Durham, Raleigh-Durham International',
  'PIT': 'Pittsburgh, Pittsburgh International',
  'CLE': 'Cleveland, Cleveland Hopkins International',
  'MKE': 'Milwaukee, General Mitchell International',
  'IND': 'Indianápolis, Indianapolis International',
  'CMH': 'Columbus, John Glenn Columbus International',
  'CVG': 'Cincinnati, Cincinnati/Northern Kentucky International',
  'SDF': 'Louisville, Louisville International',
  'OKC': 'Oklahoma City, Will Rogers World',
  'TUL': 'Tulsa, Tulsa International',
  'BHM': 'Birmingham, Birmingham-Shuttlesworth International',
  'HSV': 'Huntsville, Huntsville International',
  'MGM': 'Montgomery, Montgomery Regional',
  'DCA': 'Washington D.C., Ronald Reagan Washington National',
  'IAD': 'Washington D.C., Washington Dulles International',
  'BWI': 'Baltimore, Baltimore/Washington International Thurgood Marshall',
  'SJU': 'San Juan, Luis Muñoz Marín International',
  'STX': 'St. Croix, Henry E. Rohlsen',
  'STY': 'St. Thomas, Cyril E. King',
  'EYW': 'Key West, Key West International',
  'PSE': 'Ponce, Mercedita',
  'MAZ': 'Manzanillo, Playa de Oro',
  'ZLO': 'Zihuatanejo, Ixtapa-Zihuatanejo',
  'LZC': 'Lázaro Cárdenas, Lázaro Cárdenas',
  'BJX': 'León, Del Bajío',
  'GDL': 'Guadalajara, Don Miguel Hidalgo y Costilla',
  'PVR': 'Puerto Vallarta, Gustavo Díaz Ordaz',
  'HMO': 'Hermosillo, General Ignacio Pesqueira García',
  'CEN': 'Ciudad Obregón, General Álvaro Obregón',
  'CUL': 'Culiacán, Federal de Bachigualato',
  'LMM': 'Los Mochis, Federal de Los Mochis',
  'SJD': 'San José del Cabo, Los Cabos',
  'TIJ': 'Tijuana, General Abelardo L. Rodríguez',
  'NTR': 'Monterrey, General Mariano Escobedo',
  'MTY': 'Monterrey, General Mariano Escobedo',
  'MID': 'Mérida, Manuel Crescencio Rejón',
  'CZM': 'Cozumel, Cozumel International',
  'ISJ': 'Isla Mujeres, Isla Mujeres',
  'AGU': 'Aguascalientes, Aguascalientes',
  'SDQ': 'Santo Domingo, Las Américas',
  'STI': 'Santiago de los Caballeros, Cibao International',
  'AZS': 'Samana, El Catey',
  'POP': 'Puerto Plata, Gregorio Luperón',
  'JBQ': 'La Romana, La Romana International',
  'BAQ': 'Barranquilla, Ernesto Cortissoz',
  'VVI': 'Santa Cruz de la Sierra, Viru Viru',
  'CBB': 'Cochabamba, Jorge Wilstermann',
  'VCP': 'Campinas, Viracopos',
  'POA': 'Porto Alegre, Salgado Filho',
  'CWB': 'Curitiba, Afonso Pena',
  'FLN': 'Florianópolis, Hercílio Luz',
  'MAO': 'Manaus, Eduardo Gomes',
  'BEL': 'Belém, Val de Cans',
  'CGB': 'Cuiabá, Marechal Rondon',
  'GYN': 'Goiânia, Santa Genoveva',
  'MCZ': 'Maceió, Zumbi dos Palmares',
  'JOI': 'Joinville, Lauro Carneiro de Loyola',
  'NVT': 'Navegantes, Ministro Victor Konder',
  'BVB': 'Boa Vista, Atlas Brasil Cantanhede',
  'PVH': 'Porto Velho, Governador Jorge Teixeira',
  'PPB': 'Presidente Prudente, Presidente Prudente',
  'BGX': 'Bage, Comandante Gustavo Kraemer',
  'BVH': 'Vilhena, Brigadeiro Camarão',
  'BVX': 'Bento Gonçalves, Bento Gonçalves',
  'AJU': 'Aracaju, Santa Maria',
  'CAW': 'Campos, Bartolomeu Lysandro',
  'CMG': 'Corumbá, Corumbá International',
  'CZS': 'Cruzeiro do Sul, Cruzeiro do Sul',
  'DOU': 'Dourados, Dourados',
  'ESQ': 'Esmeraldas, Esmeraldas',
  'FEN': 'Fernando de Noronha, Fernando de Noronha',
  'GEL': 'Santo Ângelo, Sepé Tiaraju',
  'GGJ': 'Guigó, Guigó',
  'GPB': 'Guarapuava, Tancredo Thomas de Farias',
  'JDF': 'Juiz de Fora, Francisco Álvares de Assis',
  'JPA': 'João Pessoa, Presidente Castro Pinto',
  'JTC': 'Bauru/Arealva, Moussa Nakhl Tobias',
  'LAJ': 'Lages, Antônio Correia Pinto de Macedo',
  'LDB': 'Londrina, Governador José Richa',
  'MAB': 'Marabá, Marabá',
  'MTE': 'Monte Dourado, Monte Dourado',
  'MOC': 'Montes Claros, Mário Ribeiro',
  'MTR': 'Minatitlán, Minatitlán/Coatzacoalcos',
  'MVF': 'Mocímboa da Praia, Mocímboa da Praia',
  'OIA': 'Oiapoque, Oiapoque',
  'PMG': 'Pimenta Bueno, Pimenta Bueno',
  'PVX': 'Porto Velho, Porto Velho',
  'QPS': 'Pirapora, Pirapora',
  'RBR': 'Rio Branco, Plácido de Castro',
  'PDP': 'Punta del Este, Uruguay',
  'BRC': 'San Carlos de Bariloche, San Carlos de Bariloche',
  'COR': 'Córdoba, Ingeniero Ambrosio Taravella',
  'MDZ': 'Mendoza, Gobernador Francisco Gabrielli',
  'SLA': 'Salta, Martín Miguel de Güemes',
  'ROS': 'Rosario, Islas Malvinas',
  'FTE': 'El Calafate, El Calafate',
  'USH': 'Ushuaia, Malvinas Argentinas',
  'SDE': 'Santiago del Estero, Santiago del Estero',
  'RES': 'Resistencia, Resistencia',
  'IGR': 'Puerto Iguazú, Cataratas del Iguazú',
  'CPC': 'San Martín de los Andes, Aviador Carlos Campos',
  'PMY': 'Puerto Madryn, El Tehuelche',
  'REL': 'Trelew, Almirante Marcos A. Zar',
  'VLG': 'Villa Gesell, Villa Gesell',
  'LUQ': 'San Luis, Brigadier Mayor César Raúl Ojeda',
  'MDQ': 'Mar del Plata, Astor Piazzolla',
  'BHI': 'Bahía Blanca, Comandante Espora',
  'TUC': 'San Miguel de Tucumán, Teniente Benjamin Matienzo',
  'PSS': 'Posadas, Libertador General José de San Martín',
  'LIN': 'Milán, Linate',
  'IST': 'Estambul, Aeropuerto de Estambul',
  'SAW': 'Estambul, Sabiha Gökçen',
  'HEL': 'Helsinki, Helsinki-Vantaa',
  'CPH': 'Copenhague, Copenhague-Kastrup',
  'ARN': 'Estocolmo, Arlanda',
  'OSL': 'Oslo, Gardermoen',
  'BGO': 'Bergen, Flesland',
  'SVG': 'Stavanger, Sola',
  'TRD': 'Trondheim, Værnes',
  'GOT': 'Gotemburgo, Landvetter',
  'VIE': 'Viena, Aeropuerto Internacional de Viena',
  'ZAG': 'Zagreb, Aeropuerto de Zagreb',
  'WAW': 'Varsovia, Aeropuerto de Varsovia-Chopin',
  'CPQ': 'Campinas, Campo de Marte',
  'NAP': 'Nápoles, Nápoles-Capodichino',
  'BDS': 'Brindisi, Brindisi-Salento',
  'CTA': 'Catania, Catania-Fontanarossa',
  'PMO': 'Palermo, Palermo-Punta Raisi',
  'VRN': 'Verona, Verona-Villafranca',
  'BLQ': 'Bolonia, Bolonia-Guglielmo Marconi',
  'TRS': 'Trieste, Trieste-Friuli Venezia Giulia',
  'SUF': 'Lamezia Terme, Lamezia Terme',
  'PSA': 'Pisa, Pisa International',
  'FLR': 'Florencia, Florencia-Peretola',
  'PEG': 'Venecia, Venecia-Tessera',
  'CAG': 'Cagliari, Cagliari-Elmas',
  'OLB': 'Olbia, Olbia-Costa Smeralda',
  'KUL': 'Kuala Lumpur, Kuala Lumpur International',
  'BKK': 'Bangkok, Suvarnabhumi',
  'CNX': 'Chiang Mai, Chiang Mai International',
  'HKT': 'Phuket, Phuket International',
  'CEI': 'Chiang Rai, Mae Fah Luang-Chiang Rai International',
  'USM': 'Koh Samui, Koh Samui',
  'KBV': 'Krabi, Krabi',
  'PEN': 'Penang, Penang International',
  'LGK': 'Langkawi, Langkawi International',
  'MEL': 'Melbourne, Melbourne Airport',
  'BNE': 'Brisbane, Brisbane Airport',
  'ADL': 'Adelaida, Adelaida Airport',
  'CNS': 'Cairns, Cairns Airport',
  'HBA': 'Hobart, Hobart Airport',
  'PER': 'Perth, Perth Airport',
  'WLG': 'Wellington, Wellington Airport',
  'CHC': 'Christchurch, Christchurch Airport',
  'DUD': 'Dunedin, Dunedin Airport',
  'ZQN': 'Queenstown, Queenstown Airport',
  'KIX': 'Osaka, Kansai International',
  'CTS': 'Sapporo, New Chitose',
  'NGO': 'Nagoya, Chubu Centrair International',
  'FUK': 'Fukuoka, Fukuoka',
  'OKA': 'Okinawa, Naha',
  'SPN': 'Saipan, Saipan International',
  'ROR': 'Palau, Roman Tmetuchl International',
  'TPE': 'Taipéi, Taoyuan International',
  'KHH': 'Kaohsiung, Kaohsiung International',
  'RMQ': 'Taichung, Taichung International',
  'TSA': 'Taipéi, Songshan',
  'CGQ': 'Changchun, Changchun Longjia International',
  'SHE': 'Shenyang, Shenyang Taoxian International',
  'HRB': 'Harbin, Harbin Taiping International',
  'TXL': 'Berlín, Tegel',
  'BER': 'Berlín, Berlín-Brandeburgo',
  'MUC': 'Múnich, Múnich-Franz Josef Strauß',
  'CGN': 'Colonia, Colonia-Bonn',
  'DUS': 'Düsseldorf, Düsseldorf',
  'HAM': 'Hamburgo, Hamburgo',
  'STR': 'Stuttgart, Stuttgart',
  'NUE': 'Núremberg, Núremberg',
  'BRE': 'Bremen, Bremen',
  'HAJ': 'Hanóver, Hanóver',
  'LEJ': 'Leipzig/Halle, Leipzig/Halle',
  'DRS': 'Dresde, Dresde',
  'SXF': 'Berlín, Schönefeld',
  'TXG': 'Taichung, Taichung International',
  'ZNZ': 'Zanzíbar, Aeropuerto Internacional Abeid Amani Karume',
  'JRO': 'Kilimanjaro, Aeropuerto Internacional del Kilimanjaro',
  'DAR': 'Dar es Salaam, Aeropuerto Internacional Julius Nyerere',
  'MBE': 'Monbetsu, Monbetsu',
  'WKJ': 'Wakkanai, Wakkanai',
  'MMB': 'Memanbetsu, Memanbetsu',
  'KUH': 'Kushiro, Kushiro',
  'SHB': 'Nakashibetsu, Nakashibetsu',
  'OBO': 'Obihiro, Obihiro',
  'HKD': 'Hakodate, Hakodate',
  'SPK': 'Sapporo, Sapporo',
  'ASR': 'Kayseri, Kayseri Erkilet Airport',
  'ADB': 'Esmirna, Adnan Menderes Airport',
  'BJV': 'Bodrum, Milas-Bodrum Airport',
  'DLM': 'Dalaman, Dalaman Airport',
  'GZP': 'Gazipaşa, Gazipaşa-Alanya Airport',
  'NBO': 'Nairobi, Jomo Kenyatta International Airport',
  'MBA': 'Mombasa, Moi International Airport',
  'KIS': 'Kisumu, Kisumu International Airport',
  'EIN': 'Eindhoven, Eindhoven Airport',
  'MST': 'Maastricht, Maastricht Aachen Airport',
  'LUX': 'Luxemburgo, Luxembourg Airport',
  'NCL': 'Newcastle, Newcastle International Airport',
  'SNN': 'Shannon, Shannon Airport',
  'KWI': 'Kuwait, Kuwait International Airport',
  'BAH': 'Manama, Bahrain International Airport',
  'DOH': 'Doha, Hamad International Airport',
  'AUH': 'Abu Dabi, Abu Dhabi International Airport',
  'DXB': 'Dubái, Dubai International Airport',
  'SHJ': 'Sharjah, Sharjah International Airport',
  'FNA': 'Freetown, Lungi International Airport',
  'ACC': 'Acra, Kotoka International Airport',
  'DLA': 'Douala, Douala International Airport',
  'NSI': 'Yaundé, Nsimalen International Airport',
  'LOS': 'Lagos, Murtala Muhammed International Airport',
  'ABV': 'Abuya, Nnamdi Azikiwe International Airport',
  'KAN': 'Kano, Mallam Aminu Kano International Airport',
  'PHC': 'Port Harcourt, Port Harcourt International Airport',
  'CPT': 'Ciudad del Cabo, Aeropuerto Internacional de Ciudad del Cabo',
  'JNB': 'Johannesburgo, Aeropuerto Internacional OR Tambo',
};

// Función para formatear fecha a formato 15DEC25
const formatearFecha = (fechaStr) => {
  if (!fechaStr) return fechaStr;

  const meses = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const s = String(fechaStr).trim();
  if (!s) return fechaStr;

  // Normalizar formatos tipo 15OCT25 / 15oct25 -> 15oct25
  const m1 = s.match(/^(\d{1,2})([A-Za-z]{3})(\d{2})$/);
  if (m1) {
    const dia = m1[1].padStart(2, '0');
    const mon = m1[2].toLowerCase();
    const yy = m1[3];
    return `${dia}${mon}${yy}`;
  }
  try {
    let fecha;

    // dd/mm/aaaa o dd/mm/aa
    const mSlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (mSlash) {
      const [, d, m, yRaw] = mSlash;
      let y = yRaw;
      if (y.length === 2) {
        const yn = parseInt(y, 10);
        y = yn < 50 ? `20${y}` : `19${y}`;
      }
      fecha = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    } else if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      // ISO aaaa-mm-dd
      fecha = new Date(s.substring(0, 10));
    } else {
      // dd-mm-aaaa, dd.mm.aaaa, "15 Oct 2025", etc.
      const mOther = s.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{2,4})$/);
      if (mOther) {
        const [, d, m, yRaw] = mOther;
        let y = yRaw;
        if (y.length === 2) {
          const yn = parseInt(y, 10);
          y = yn < 50 ? `20${y}` : `19${y}`;
        }
        fecha = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      } else {
        const parsed = new Date(s);
        if (!isNaN(parsed.getTime())) {
          fecha = parsed;
        } else {
          return fechaStr; // dejar como vino si no se puede interpretar
        }
      }
    }

    if (isNaN(fecha.getTime())) return fechaStr;

    const dia = String(fecha.getDate()).padStart(2, '0');
    const mon = meses[fecha.getMonth()];
    const yy = String(fecha.getFullYear()).slice(-2);
    return `${dia}${mon}${yy}`;
  } catch {
    return fechaStr;
  }
};


export default function ItineraryDetails({ itineraryData = null }) {
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Branding por agencia (desde public.agencies)
  const [brand, setBrand] = useState({
    name: "Jetmar Viajes",
    address: "Gral. Santander 1970",
    phone: "598 2 1793",
    email: "",
    logo: null,
    primary: "#2c4b8b",
    text: "#ffffff",
  });

// Logs de montaje/desmontaje y cambios de itinerary
useEffect(() => {
  try {
    console.log("[ItineraryDetails] mounted:", new Date().toISOString(), "path:", window.location?.pathname);
  } catch (err) {
    console.log("[ItineraryDetails] debug mount log failed:", err);
  }
  return () => {
    try {
      console.log("[ItineraryDetails] unmounted");
    } catch (err) {
      console.log("[ItineraryDetails] debug unmount log failed:", err);
    }
  };
}, []);

// Log cuando cambia el estado 'itinerary' y análisis de fechas
useEffect(() => {
  if (!itinerary) return;
  console.log("[ItineraryDetails] itinerary state updated:", itinerary);
  try {
    const vuelos = Array.isArray(itinerary?.vuelos) ? itinerary.vuelos : [];
    vuelos.forEach((v, idx) => {
      const raw = v?.fecha;
      let yearFromDate = null;
      try {
        const d = new Date(String(raw));
        if (!isNaN(d)) yearFromDate = d.getFullYear();
      } catch (err) {
        console.log("[ItineraryDetails] debug Date parse failed:", err);
      }
      console.log(`[ItineraryDetails] vuelo[${idx}].fecha ->`, raw, "(type:", typeof raw + ")", "yearFromDate:", yearFromDate);
    });
  } catch (err) {
    console.log("[ItineraryDetails] debug itinerary change log failed:", err);
  }
}, [itinerary]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const profile = await UserService.getCurrentUserProfile();
        const agencyKey = profile?.agency || profile?.agencia || null;
        if (!agencyKey) return;

        const { data: list } = await AgencyService.listAgencies({
          search: String(agencyKey),
          activeOnly: true,
          limit: 50,
          from: 0,
        });

        const lower = String(agencyKey).toLowerCase();
        const match =
          (list || []).find(a => (a.code || "").toLowerCase() === lower) ||
          (list || []).find(a => (a.name || "").toLowerCase() === lower) ||
          (list || [])[0];

        if (match && mounted) {
          // Resolver URL absoluta del logo y forzar refresh con versión (updated_at)
          const resolveLogoUrl = (url, path, versionTs) => {
            try {
              const ver = versionTs ?? Date.now();
              if (url) {
                // Si ya es absoluta, anexar ?v= si no existe para bust de caché
                if (/^https?:\/\//i.test(url)) {
                  return /\bv=/.test(url) ? url : `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(ver)}`;
                }
                // Si vino como path relativo en logo_url
                const fromUrl = AgencyService.getLogoPublicUrl(url, ver);
                if (fromUrl) return fromUrl;
              }
              if (path) {
                const fromPath = AgencyService.getLogoPublicUrl(path, ver);
                if (fromPath) return fromPath;
              }
            } catch { return null; }
            return null;
          };
          const versionTs = match?.updated_at ? new Date(match.updated_at).getTime() : Date.now();
          const logo = resolveLogoUrl(match.logo_url, match.logo_path, versionTs);
          setBrand({
            name: match.name || agencyKey,
            address: match.address || "",
            phone: match.phone || "",
            email: match.email || "",
            logo: logo || null,
            primary: match.main_color || "#2c4b8b",
            text: match.text_color || "#ffffff",
          });
        }
      } catch {
        // silencioso si no hay agencia
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const primary = brand.primary || "#2c4b8b";
  const textColor = brand.text || "#ffffff";
  const cssStyles = `
    /* Estilos para que la previsualización coincida con la impresión */
    .itinerary-content {
      font-family: 'Montserrat', sans-serif;
      background: white;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
      font-size: 12px;
      line-height: 1.4;
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      margin-bottom: 20px;
      background: ${primary};
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }
    .logo-section { display: flex; align-items: center; gap: 16px; }
    .company-info { text-align: left; }
    .company-name { font-weight: 700; color: ${textColor}; font-size: 14px; }
    .company-details { color: rgba(255,255,255,0.9); font-size: 12px; }
    .title-section { text-align: right; }
    .title { margin: 0; font-size: 24px; color: ${textColor}; font-weight: bold; }
    .divider { background: ${primary}; height: 4px; margin: 20px 0; }
    .passenger-section {
      display: flex; justify-content: space-between; gap: 24px;
      margin: 20px 0; padding: 20px; background: #f8f9fa;
      border-radius: 8px; border-left: 4px solid ${primary};
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .passenger-info, .confirmation-info { color: #686868; font-size: 12px; }
    .confirmation-info { text-align: right; }
    .confirmation-number { font-weight: 700; font-size: 14px; }
    .separator { margin: 16px 0; border: none; border-top: 1px solid #ccc; }
    .flight-item {
      display: flex; gap: 16px; align-items: flex-start; padding: 20px; margin-bottom: 16px;
      background: white; border-radius: 8px; border-left: 4px solid ${primary};
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .flight-icon {
      width: 50px; height: 50px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;
    }
    .flight-icon img { max-width: 40px; max-height: 40px; object-fit: contain; }
    .flight-details { flex: 1; }
    .flight-header { display: flex; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #eee; }
    .airline-name { text-transform: camelcase; color: #686868; font-size: 16px; font-weight: 700; }
    .flight-number { color: #686868; font-size: 12px; }
    .flight-code { color: ${primary}; font-weight: bold; }
    .flight-date { text-align: right; color: #686868; font-size: 12px; text-transform: uppercase;}
    .flight-info { display: flex; gap: 24px; }
    .location-info { width: 30%; }
    .location-label { color: #686868; font-weight: 700; font-size: 11px; }
    .location-name { color: ${primary}; text-transform: camelcase; font-size: 12px; font-weight: 600; }
    .location-time { color: ${primary}; font-size: 11px; }
    .cabin-info { flex: 1; color: #686868; font-size: 11px; }
    .flights-section {
      background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;
      border-left: 4px solid ${primary}; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .flights-section h3 { margin: 0 0 16px 0; color: #323C46; font-size: 16px; font-weight: bold; }
    .footer-section {
      margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;
      border-left: 4px solid ${primary}; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .footer-title { font-size: 14px; font-weight: bold; color: ${primary}; margin-bottom: 10px; }
    .footer-content { font-size: 11px; line-height: 1.5; color: #686868; }
    @media print { .no-print { display: none !important; } }
  `;

  // Impresión/PDF con branding de agencia
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const itineraryContent = document.querySelector(".itinerary-content").innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Itinerario</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
        <style>${cssStyles}</style>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: 'Montserrat', sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0; padding: 0; background: white;
            font-size: 12px; line-height: 1.4;
          }
        </style>
      </head>
      <body>
        ${itineraryContent}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  useEffect(() => {
    // Si se pasan datos directamente como prop, usarlos
    console.log("[ItineraryDetails] effect start. itineraryData present:", Boolean(itineraryData), itineraryData);
    if (itineraryData) {
      try {
        console.log("[ItineraryDetails] itineraryData (prop):", itineraryData);
        if (Array.isArray(itineraryData?.vuelos)) {
          itineraryData.vuelos.forEach((v, idx) => {
            console.log(`[ItineraryDetails] vuelo[${idx}].fecha (prop):`, v?.fecha);
          });
        }
      } catch (err) {
        console.log("[ItineraryDetails] debug prop parse error:", err);
      }
      setItinerary(itineraryData);
      setLoading(false);
      return;
    }

    const fetchItinerary = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/itinerary");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Debug: datos crudos desde API/DB
        try {
          console.log("[ItineraryDetails] /api/itinerary result:", data);
          if (Array.isArray(data?.vuelos)) {
            data.vuelos.forEach((v, idx) => {
              console.log(`[ItineraryDetails] vuelo[${idx}].fecha (api):`, v?.fecha);
            });
          }
        } catch (err) {
          console.log("[ItineraryDetails] debug api parse error:", err);
        }
        setItinerary(data);
      } catch (err) {
        console.error("Error fetching itinerary:", err);
        setError(err.message || "Error fetching itinerary");
      } finally {
        setLoading(false);
      }
    };

  fetchItinerary();
}, [itineraryData]);

if (loading) return <div>Loading itinerary...</div>;
if (error) return <div style={{ color: "#c00" }}>Error: {error}</div>;

const { localizadorReserva = "-", detallesViajero = [], vuelos = [] } = itinerary || {};

return (
  <div>
    <style>{cssStyles}</style>
    
    <div className="print-container">
      <div>
        <div>
          <span className="ms-Button-flexContainer flexContainer-159 no-print" data-automationid="splitbuttonprimary" />
        </div>

        <div style={{ width: "100%", background: "white" }}>
          {/* Botón de impresión/PDF */}
          <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", padding: "8px 16px", borderBottom: "1px solid #eee" }}>
            <button
              onClick={handlePrint}
              style={{
                backgroundColor: "#2c4b8b",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#1e355e"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#2c4b8b"}
            >
              🖨️ Imprimir / Descargar PDF
            </button>
          </div>

          {/* Contenido del itinerario que se imprimirá */}
          <div className="itinerary-content">
            <div className="header-section">
              <div className="logo-section">
                <img
                  width={180}
                  src={brand.logo || "https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/media/logojetmar-png%20(2).png"}
                  alt="Logo"
                  style={{ objectFit: "contain" ,"width":"120px","height":"auto"}}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/media/logojetmar-png%20(2).png";
                  }}
                />
                <div className="company-info">
                  <div className="company-name">{brand.name}</div>
                  {brand.address ? <div className="company-details">{brand.address}</div> : null}
                  {brand.phone ? <div className="company-details">{brand.phone}</div> : null}
                  {brand.email ? <div className="company-details">{brand.email}</div> : null}
                </div>
              </div>

              <div className="title-section">
                <h2 className="title">Itinerario</h2>
              </div>
            </div>

            {/*<div className="divider"></div>*/}

            <div className="passenger-section">
              <div className="passenger-info">
                <div style={{color: primary}}><strong>Pasajero:</strong></div>
                <div>
                  {detallesViajero.length > 0 ? (
                    detallesViajero.map((v, idx) => (
                      <div key={idx}>
                        {v.nombre} {v.apellido}
                      </div>
                    ))
                  ) : (
                    <div>-</div>
                  )}
                </div>
              </div>

              <div className="confirmation-info">
                <div style={{color: primary, fontWeight: "bold"}}>Confirmación:</div>
                <div className="confirmation-number">{localizadorReserva}</div>
              </div>
            </div>

            {/* <hr className="separator" /> */}

            <div className="flights-section">
              <h3 style={{color: primary}}>Detalles de vuelos</h3>
              {vuelos.length === 0 && <div style={{ color: primary }}>No hay vuelos para mostrar.</div>}

              {vuelos.map((vuelo, i) => (
                <div key={i} className="flight-item">
                  <div className="flight-icon">
                    <img 
                      src={AIRLINE_LOGOS[vuelo.aerolinea] || "https://documents.sabre.com/static/images/tc/mail/icon-air.png"} 
                      alt={AIRLINES[vuelo.aerolinea] || vuelo.aerolinea} 
                      width={40} 
                      height={40}
                      style={{ borderRadius: '4px', objectFit: 'contain' }}
                      onError={(e) => {
                        e.target.src = "https://documents.sabre.com/static/images/tc/mail/icon-air.png";
                      }}
                    />
                  </div>
                  <div className="flight-details">
                    <div className="flight-header">
                      <div>
                        <div className="airline-name">
                          {AIRLINES[vuelo.aerolinea] || vuelo.aerolinea}
                        </div>
                        <div className="flight-number">
                          N° de vuelo: <span className="flight-code">{vuelo.aerolinea}{vuelo.numeroVuelo}</span>
                        </div>
                      </div>
                      <div className="flight-date">
                        {(() => {
                          const raw = vuelo.fecha;
                          const formatted = formatearFecha(raw);
                          try {
                            console.log("[ItineraryDetails] render fecha raw:", raw, "formatted:", formatted);
                          } catch (err) {
                            console.log("[ItineraryDetails] debug render log failed:", err);
                          }
                          return formatted;
                        })()}
                      </div>
                    </div>

                    <div className="flight-info">
                      <div className="location-info">
                        <div className="location-label">Salida:</div>
                        <div className="location-name">
                          {AIRPORTS[vuelo.origen] || vuelo.origen}
                        </div>
                        <div className="location-time">{vuelo.horaSalida}hs.</div>
                      </div>
                      <div className="location-info">
                        <div className="location-label">Llegada:</div>
                        <div className="location-name">
                          {AIRPORTS[vuelo.destino] || vuelo.destino}
                        </div>
                        <div className="location-time">{vuelo.horaLlegada}hs.</div>
                      </div>
                      <div className="cabin-info">
                        <div>Cabina: <strong>{vuelo.clase}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Footer con información general */}
            <div className="footer-section">
              <div className="footer-title">Información general</div>
              <div className="footer-content">
                Estimado cliente, te deseamos un muy buen viaje!<br />
                Favor verifica la documentación con la cual estarás viajando (Visas y vacunas en caso de ser necesarias).<br />
                No olvides solicitarle a tu asesor que ingrese tu número de viajero frecuente en la reserva.<br />
                Te aconsejamos hacer el web check-in.
                <strong>¡Gracias por elegirnos!</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>);
}