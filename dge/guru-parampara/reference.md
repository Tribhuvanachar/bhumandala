# Guru Parampara — Madhva (Dvaita Vedanta) Lineage
### Consolidated reference for the DGE project
*210 figures · compiled 2026-08-08 · scholarly, non-commercial*
> This document is the human-readable companion to the interactive lineage tree (`guru_parampara.html`) and the machine-readable dataset (`parampara.json`). Nothing here is committed to the DGE repository — it is staged for review.
## How the data is organised
The lineage is modelled as a single **guru → disciple / pontifical-succession tree** rooted at Narayana. Shared early ancestors (whom the rival mathas each count as their own #1–#7) appear **once**, on the *core* trunk, and the mathas branch off at the two historical split points — **Vidyadhiraja Tirtha** (→ Vyasaraja Matha) and **Ramachandra Tirtha** (→ Raghavendra Matha). This avoids duplicating the shared saints while still showing every branch.
**Confidence flags** — `high` (historically attested), `medium` (traditional but broadly accepted), `traditional` (matha hagiography / legendary; dates unverifiable). Pre-1500 dates are largely traditional; confidence rises sharply from the 16th century onward.
**Contemporaries** are computed automatically from lifespan / pontificate overlap and shown in each figure's detail card in the tree.
### Data dictionary (`parampara.json`)
| field | meaning |
|---|---|
| `id` | stable unique key |
| `name` | display name |
| `purva` | purvashrama (pre-monastic) name |
| `titles` | birudas / alternate names |
| `guru` | id of predecessor (tree parent) |
| `matha` | lineage key (see colour legend) |
| `period` | dates as sourced (both variants where they conflict) |
| `b`,`d` | numeric birth / death (CE) when known |
| `brindavana`,`place` | resting place and its location |
| `works` | principal Sanskrit / Kannada works |
| `contrib` | contribution summary |
| `contemporaries` | auto-computed overlaps |
| `confidence` | high / medium / traditional |
| `role` | present incumbent / status |
| `sources` | references |

## Mula Parampara (eternal lineage)  ·  12 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Narayana (Vishnu, as Hamsa)** |  | Eternal |  | traditional |
| **Chaturmukha Brahma** |  | Cosmic age |  | traditional |
| **Sanakadi (Sanaka, Sanandana, Sanatana, Sanatkumara)** |  | Cosmic age |  | traditional |
| **Durvasa** |  | Puranic age |  | traditional |
| **Jnananidhi Tirtha** |  | unknown |  | traditional |
| **Garuda-vahana Tirtha** |  | unknown |  | traditional |
| **Kaivalya Tirtha** |  | unknown |  | traditional |
| **Jnanesha Tirtha** |  | unknown |  | traditional |
| **Para Tirtha** |  | unknown |  | traditional |
| **Satyaprajna Tirtha** |  | unknown |  | traditional |
| **Prajna Tirtha (Prajnanidhi)** |  | unknown |  | traditional |
| **Achyutapreksha** |  | 13th c. CE |  | medium |

## Core peetha (pre-split)  ·  7 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Madhvacharya** | Vasudeva | 1238-1317 CE (mainstream); 1199-1278 CE (older scholarly alt.) | No brindavana - tradition holds he withdrew to Badarikashrama (Badari) — Born at Pajaka, near Udupi; seat at Udupi Sri Krishna Matha | high |
| **Padmanabha Tirtha** | Shobhana Bhatta | pontificate c.1317-1324 | Nava Brindavana — island in the Tungabhadra near Hampi / Anegundi | medium |
| **Narahari Tirtha** | Shyama Shastri | c.1243-1333 CE | Chakratirtha — near Hampi (Tungabhadra) | medium |
| **Madhava Tirtha** | Vishnu Shastri | pontificate c.1333-1350 | Mannur — near Kalaburagi (Gulbarga), north Karnataka | medium |
| **Akshobhya Tirtha** | Govinda Bhatta | c.1282-1365; pontificate c.1350-1365 | Malkhed (Manyakheta) — Kalaburagi district, north Karnataka | medium |
| **Jayatirtha (Tikacharya)** | Dhondo Raghunath Deshpande (Dhondu Pant) | c.1345-1388; pontificate 1365-1388 | Malkhed — on the Kagina river, Kalaburagi district | high |
| **Vidyadhiraja Tirtha** | Krishna Bhatta | pontificate c.1388-1392 |  | medium |

## Lay disciples / scholars  ·  2 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Trivikrama Panditacharya** |  | c.1258-c.1320 CE |  | medium |
| **Narayana Panditacharya** |  | late 13th - 14th c. |  | medium |

## Sripadaraja Matha (Mulbagal)  ·  36 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Lakshmidhara Tirtha** |  | c.1324-1334 |  | traditional |
| **Sankarshana Tirtha** |  | c.1334-1354 |  | traditional |
| **Parashurama Tirtha** |  | c.1354-1364 |  | traditional |
| **Adiraja Tirtha** |  | c.1364-1384 |  | traditional |
| **Satyavrata Tirtha** |  | c.1384-1400 |  | traditional |
| **Swarnavarna Tirtha** |  | c.1400-1420 | Srirangam — Srirangam (Tiruchirapalli), Tamil Nadu | traditional |
| **Sripadaraja (Lakshminarayana Tirtha)** | Lakshminarayana; born at Abbur | 1422-1480 CE (Wikipedia); 1412-1504 (matha traditional) | Narasimha Tirtha, Mulbagal — Kolar district, Karnataka | medium |
| **Hayagreeva Tirtha** |  | 1500-1536 | Mulbagal — Mulbagal (Mulabagilu), Kolar dist., Karnataka | traditional |
| **Sripati Tirtha** |  | 1536-1571 |  | traditional |
| **Sridhara Tirtha** |  | 1570-1598 |  | traditional |
| **Gopalaswami Tirtha** |  | 1598-1620 |  | traditional |
| **Uttanda Ramachandra Tirtha** |  | 1620-1645 |  | traditional |
| **Raghunatha Tirtha** |  | 1645-1670 |  | traditional |
| **Lakshmi Manohara Tirtha** |  | 1670-1708 |  | traditional |
| **Lakshmipati Tirtha** |  | 1700-1715 |  | traditional |
| **Lakshminatha Tirtha** |  | 1715-1726 |  | traditional |
| **Lakshmikantha Tirtha** |  | 1726-1746 |  | traditional |
| **Srikantha Tirtha** |  | 1740-1761 |  | traditional |
| **Srinidhi Tirtha** |  | 1761-1787 |  | traditional |
| **Vidyanidhi Tirtha** |  | 1782-1795 |  | traditional |
| **Jnananidhi Tirtha** |  | 1788-1800 |  | traditional |
| **Gunanidhi Tirtha** |  | 1798-1804 |  | traditional |
| **Gunasaranidhi Tirtha** |  | 1804-1813 |  | traditional |
| **Prajnanidhi Tirtha** |  | 1813-1818 |  | traditional |
| **Subodhanidhi Tirtha** |  | 1818-1839 |  | traditional |
| **Vairagyanidhi Tirtha** |  | 1839-1851 |  | traditional |
| **Sujnananidhi Tirtha** |  | 1851-1886 |  | traditional |
| **Sugunanidhi Tirtha** |  | 1856-1885 |  | traditional |
| **Sudhinidhi Tirtha** |  | 1881-1906 |  | traditional |
| **Medhanidhi Tirtha** |  | 1906-1926 |  | traditional |
| **Dayanidhi Tirtha** |  | 1926-1962 |  | traditional |
| **Satyanidhi Tirtha** |  | 1955-1980 |  | traditional |
| **Vijayanidhi Tirtha** |  | 1980-1987 |  | traditional |
| **Vignananidhi Tirtha** |  | 1987-2010 |  | traditional |
| **Keshavanidhi Tirtha** |  | 2010s |  | traditional |
| **Sujayanidhi Tirtha** ★ |  | present incumbent (~2021-) |  | traditional |

## Uttaradi Matha  ·  35 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Kavindra Tirtha** | Vishnudasacharya | pontificate ~7 yrs (c.1392-1399) | Anegundi — Koppal district | medium |
| **Vageesha Tirtha** | Raghunathacharya | unknown | Nava Brindavana — near Anegundi | traditional |
| **Ramachandra Tirtha** |  | late 14th-15th c. | Yaragola (Yergol) — Yadgir taluk, Gulbarga | medium |
| **Vidyanidhi Tirtha** | Kambhaluri Narasimhacharya | unknown (long tenure) | Yaragola — Yadgir taluk | traditional |
| **Raghunatha Tirtha** | Vishnu Shastri | c.1405-1502; pontificate 1442-1502 | Malkhed — Kalaburagi | medium |
| **Raghuvarya Tirtha** |  | c.1462-1535; pontificate 1502-1535 | Nava Brindavana — Anegundi | medium |
| **Raghuttama Tirtha (Bhavabodhacharya)** | Ramachandra | c.1527-1596; pontificate 1535-1596 | Manampoondi — near Tirukoilur, Tiruvannamalai district, Tamil Nadu | high |
| **Vedavyasa Tirtha** | Anantha Vyasacharya | pontificate 1595-1619 (d. Penukonda) | bank of the Markandeya river — died at Penukonda, Andhra Pradesh | medium |
| **Vidyadhisha Tirtha** | Narasimhacharya | early 17th c. | Ekachakranagara — on the Ganga | medium |
| **Vedanidhi Tirtha** | Koratagi Pradyumnacharya | pontificate ~5 yr 10 mo (before 1635) | Pandharpur — Maharashtra | medium |
| **Satyavrata Tirtha** | Ranganathacharya | 1635-1638 | Sangli (bank of Krishna) — Sangli district, Maharashtra | high |
| **Satyanidhi Tirtha** | Kaulagi Raghunathacharya | 1638-1660 | Kurnool (orig. Nivrutti Sangama) — Kurnool district, Andhra Pradesh (orig. Nivrutti Sangama) | high |
| **Satyanatha Tirtha** | Narasimhacharya | 1660-1673 | Veeracholapuram, Tamil Nadu — Veeracholapuram, Villupuram district, Tamil Nadu (bank of South Pennar) | high |
| **Satyabhinava Tirtha** | Keshavacharya | 1673-1706 | Nachiarkoil, near Kumbakonam — Nachiarkoil, near Kumbhakonam, Thanjavur district, Tamil Nadu | high |
| **Satyapurna Tirtha** | Kolhapur Krishnacharya | 1706-1726 | Kolhapur — Kolhapur (Kolpur) village, Mahabubnagar district, Telangana (bank of Krishna) | high |
| **Satyavijaya Tirtha** | Pandurangi Balacharya | 1726-1737 | Satyavijayanagaram (Arani) — Satyavijayanagaram (Arani), Tiruvannamalai district, Tamil Nadu (bank of Kaveri) | high |
| **Satyapriya Tirtha** | Garlapad Ramacharya | 1737-1744 | Manamadurai, Tamil Nadu — Manamadurai, Sivaganga district, Tamil Nadu | high |
| **Satyabodha Tirtha** | Ramacharya | 1744-1783 | Savanur, Haveri district — Savanur, Haveri district, Karnataka (matha named 'Satyabodha Matha') | high |
| **Satyasandha Tirtha** | Haveri Raghavendracharya (Ramachandra Rao) | 1783-1794 | Mahishi, Thirthahalli — Mahishi, Tirthahalli taluk, Shivamogga district, Karnataka | high |
| **Satyavara Tirtha** | Haveri Krishnacharya | 1794-1797 | Santhebidanur — Santhebidanur, Anantapur district, Andhra Pradesh | high |
| **Satyadharma Tirtha** | Navaratna Purushottamacharya | 1797-1830 | Holehonnur, Shivamogga | high |
| **Satyasankalpa Tirtha** | Navaratna Srinivasacharya | 1830-1841 | Mysore — Mysore, Karnataka | high |
| **Satyasanthushta Tirtha** | Balacharya | c.1841 (~8 mo) | Mysore — Mysore, Karnataka | high |
| **Satyaparayana Tirtha** | Gururayacharya | 1841-1863 | Santebidanoor — Santhebidanur, Anantapur district, Andhra Pradesh | high |
| **Satyakama Tirtha** | Srinivasacharya | 1863-1871 | Atkur (Krishna river) — Atkur, near Raichur, Karnataka (bank of Krishna) | high |
| **Satyeshti Tirtha** | Hattimuttur Narasimhacharya | 1871-1872 | Atkur — Atkur, near Raichur, Karnataka (bank of Krishna) | high |
| **Satyaparakrama Tirtha** | Vykar Srinivasacharya | 1872-1879 | Chittapur — Chittapur, Kalaburagi district, Karnataka (bank of Krishna) | high |
| **Satyaveera Tirtha** | Bhodaramacharya | 1879-1886 | Korlahalli — Korlahalli, Karnataka (bank of Tungabhadra) | high |
| **Satyadheera Tirtha** | Korlahalli Jayacharya | 1886-1906 | Atkur — Atkur, near Raichur, Karnataka (bank of Krishna) | high |
| **Satyajnana Tirtha** | Kinhal Jayacharya | 1906-1911 | Rajahmundry (Godavari) — Rajahmundry, East Godavari district, Andhra Pradesh (bank of Godavari) | high |
| **Satyadhyana Tirtha** | Korlahalli Sethuramacharya | 1911-1942 | Pandharpur | high |
| **Satyaprajna Tirtha** | Pandurangi Jayacharya | 1942-1945 | Atkur — Atkur, near Raichur, Karnataka (bank of Krishna) | high |
| **Satyabhijna Tirtha** | Katti Venkannacharya | 1945-1948 | Ranebennur — Ranebennur (fort area), Haveri district, Karnataka | high |
| **Satyapramoda Tirtha** | Guru Raja (Guttal) | 1948-1997 | Tirukoilur / Manampoondi, Tamil Nadu | high |
| **Satyatma Tirtha** ★ | Sarvajnacharya | since 1997 (b.1973) | present incumbent (42nd Jagadguru) | high |

## Raghavendra Matha (Mantralaya)  ·  30 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Vibudhendra Tirtha** | Kambhaluri Narasimhacharya | c.1435-1490 | Tirunelveli (banks of Tamraparni) — Tirunelveli, Tamil Nadu | medium |
| **Jitamitra Tirtha** | Anantappa | 1490-1492 | Tirunelveli — Tirunelveli, Tamil Nadu | medium |
| **Raghunandana Tirtha** |  | 1492-1504 | Hampi — Hampi, Karnataka | medium |
| **Surendra Tirtha** | Venkatakrishnacharya | 1504-1575 |  | medium |
| **Vijayindra (Vijayeendra) Tirtha** | Vitthalacharya | c.1517-1614; pontificate 1575-1614 | Kumbhakonam — Tamil Nadu | high |
| **Sudhindra Tirtha** | Narayanacharya | pontificate 1614-1621 | Navabrindavana, Anegundi — Hampi/Anegundi, Karnataka | medium |
| **Raghavendra Tirtha (Rayaru)** | Venkatanatha (Venkanna Bhatta), born Bhuvanagiri | c.1595-1671; pontificate 1621-1671 | Mantralaya (Manchale / Mantralayam) — Tungabhadra bank, Adoni taluk, Kurnool dist., Andhra Pradesh | high |
| **Yogindra Tirtha** | Venkannacharya | 1671-1688 | Srirangam — Tiruchirapalli, Tamil Nadu | medium |
| **Suryindra (Sooreendra) Tirtha** | Vasudevacharya | 1688-1692 | Madurai — Madurai, Tamil Nadu | medium |
| **Sumatindra Tirtha** | Muddu Krishnacharya | 1692-1725 | Srirangam — Tiruchirapalli, Tamil Nadu | medium |
| **Upendra Tirtha** | Vijayindracharya | 1725-1728 | Srirangam — Tiruchirapalli, Tamil Nadu | medium |
| **Vadindra (Vadeendra) Tirtha** | Srinivasacharya | 1728-1750 | Mantralayam — Mantralaya, Andhra Pradesh | medium |
| **Vasudhendra Tirtha** | Purushottamacharya | 1750-1761 | Kenchanagudda — Kenchanagudda, Karnataka | medium |
| **Varadendra Tirtha** | Balaramacharya | 1761-1785 | Pune — Pune, Maharashtra | medium |
| **Dheerendra Tirtha** | Jayaramacharya | 1785 | Hosaritti (near Haveri) — Hosaritti, Karnataka | medium |
| **Bhuvanendra Tirtha** |  | 1785-1799 | Rajoli — Rajoli, Karnataka | medium |
| **Subodhendra Tirtha** |  | 1799-1807 | Nanjangud — Nanjangud, Karnataka | medium |
| **Sujanendra Tirtha** |  | 1807-1836 | Nanjangud — Nanjangud, Karnataka | medium |
| **Sujnanendra Tirtha** | Raghavendracharya | 1836-1861 | Nanjangud — Nanjangud, Karnataka | medium |
| **Sudharmendra Tirtha** |  | 1861-1872 | Mantralayam — Mantralaya, Andhra Pradesh | medium |
| **Sugunendra Tirtha** |  | 1872-1884 | Chittoor — Chittoor, Andhra Pradesh | medium |
| **Suprajnendra Tirtha** | Gururajacharya | 1884-1903 | Nanjangud — Nanjangud, Karnataka | medium |
| **Sukrutheendra Tirtha** |  | 1903-1912 | Nanjangud — Nanjangud, Karnataka (attained Hari Pada at Opal) | medium |
| **Susheelendra Tirtha** | Krishnacharya | 1912-1926 | Hosaritti (near Haveri) — Hosaritti, Karnataka | medium |
| **Suvratindra Tirtha** |  | 1926-1933 | Mantralayam — Mantralaya, Andhra Pradesh | medium |
| **Suyamindra Tirtha** | Srinivasamurthyachar | 1933-1967 | Mantralayam — Mantralaya, Andhra Pradesh | medium |
| **Sujayindra Tirtha** | Venkataraghavendracharya | 1967-1986 | Mantralayam — Mantralaya, Andhra Pradesh | medium |
| **Sushameendra Tirtha** | Suprajnendrachar | 1985-2009 | Mantralayam — Mantralaya, Andhra Pradesh (born at Nanjanagud) | medium |
| **Suyatindra Tirtha** | Susheelendracharya | 2009-2014 | Mantralayam — Mantralaya, Andhra Pradesh | medium |
| **Subudhendra Tirtha** ★ | Raja S. Pavamanacharya | 2014-present | present incumbent (Mantralaya) — Born at Kurnool, Andhra Pradesh; present incumbent at Mantralaya | medium |

## Vyasaraja Matha (Sosale)  ·  34 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Rajendra Tirtha** | Rajadeva (Rajdev) | late 14th c. | Yeragola (believed; not identifiable) | medium |
| **Jayadhwaja Tirtha** |  | 15th c. | Yeragola (Yeraghola) | traditional |
| **Purushottama Tirtha** |  | 15th c. | Abbur area (tradition: entered a cave alive, no ordinary brindavana) — Abbur (Channapatna), Karnataka | traditional |
| **Brahmanya Tirtha** | Narasimha | d. 1478 (Abbur) | Abbur | medium |
| **Vyasatirtha (Vyasaraja)** | Yatiraja | 1447-1539 CE (birth also given c.1460) | Nava Brindavana — island in the Tungabhadra near Anegundi / Hampi | high |
| **Srinivasa Tirtha** |  | 16th c. | Nava Brindavana, Anegondi — Anegondi (near Hampi), Karnataka | traditional |
| **Rama Tirtha** |  | 16th c. | Nava Brindavana — Anegondi (near Hampi), Karnataka | traditional |
| **Lakshmikantha Tirtha** |  | 16th-20th c. |  | traditional |
| **Sripathi Tirtha** |  | 16th-20th c. |  | traditional |
| **Ramachandra Tirtha** |  | 16th-20th c. |  | traditional |
| **Lakshmivallabha Tirtha** |  | 16th-20th c. |  | traditional |
| **Lakshminatha Tirtha** |  | 16th-20th c. |  | traditional |
| **Lakshmipathi Tirtha** |  | 16th-20th c. |  | traditional |
| **Lakshminarayana Tirtha** |  | 16th-20th c. |  | traditional |
| **Raghunatha Tirtha** |  | 16th-20th c. |  | traditional |
| **Jagannatha Tirtha** |  | 16th-20th c. |  | traditional |
| **Srinatha Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyanatha Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyapathi Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyavallabha Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyakantha Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyanidhi Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyapurna Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyasrisindhu Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyasridhara Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyasrinivasa Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyasamudra Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyaratnakara Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyavaridhi Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyaprasanna Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyapayonidhi Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyavachaspathi Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyamanohara Tirtha** |  | 16th-20th c. |  | traditional |
| **Vidyashreesha Tirtha** ★ | Prof. D. Prahladacharya | crowned 2 July 2017 |  | high |

## Kashi Math Samsthan (GSB)  ·  20 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Yadavendra Tirtha I** | Hanumantha Bhat | d. 1608 | Bhatkal | medium |
| **Keshava(ndra) Tirtha** |  | 1583-1670 | Basrur | medium |
| **Upendra Tirtha I** |  | 1670-1674 | Varanasi | medium |
| **Yadavendra Tirtha II** |  | d.1711 | Hemmadi | medium |
| **Raghavendra Tirtha** |  | 1646-1725 | Varanasi | medium |
| **Devendra Tirtha** |  | d.1740 | Bantwal | medium |
| **Madhavendra Tirtha** |  | d.1775 | Walkeshwar | medium |
| **Jnaneendra Tirtha** |  | 18th c. | Nasik | medium |
| **Yadavendra Tirtha III** |  | d.1773 | Honnavar | medium |
| **Upendra Tirtha II** |  | d.1791 | Varanasi | medium |
| **Rajendra Tirtha** |  | d.1799 | Thuravoor | medium |
| **Sureendra Tirtha** |  | 1778-1831 | Alleppey | medium |
| **Vibhudendra Tirtha** |  | 1782-1834 | Manjeshwar | medium |
| **Sumatheendra Tirtha** |  | 1798-1851 | Alleppey | medium |
| **Vasudendra Tirtha** |  | 19th c. |  | medium |
| **Bhuvanendra Tirtha** |  | 1837-1886 | Basrur | medium |
| **Varadendra Tirtha** |  | 1866-1914 | Walkeshwar | medium |
| **Sukrathindra Tirtha** |  | 1897-1949 | Cochin | medium |
| **Sudhindra Tirtha** |  | 1926-2016 | Haridwar | medium |
| **Samyamindra Tirtha** ★ | Umesh Mallan | since 2016 | Varanasi | medium |

## Gokarna Partagali Math (GSB)  ·  3 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Narayana Tirtha (Gokarna Partagali)** |  | foundation trad. 1475; vrindavana 1517 | Bhatkal — Partagali, Canacona, South Goa | medium |
| **Jeevottama Tirtha** |  | d. 1588 | Bhatkal | medium |
| **Vidyadheesh Tirtha (Partagali)** ★ | Uday Bhat Sharma | present | Partagali (Poinginim, Canacona, Goa) | medium |

## Palimaru Matha  ·  3 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Hrishikesha Tirtha (Palimaru)** |  | 13th-14th c. | Palimaru | traditional |
| **Vidyamanya Tirtha** | Narayana | 27 Jul 1913 - 14 May 2000 | Palimaru (also Bhandarkeri, Barkur) — Udupi | high |
| **Vidyadheesha Tirtha (Palimaru)** ★ | Ramesha Tantri | present (29th) | Palimaru | high |

## Adamaru Matha  ·  3 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Narasimha Tirtha (Adamaru)** |  | 13th-14th c. | Adamaru | traditional |
| **Vibudhapriya Tirtha** |  | late 19th - mid 20th c. | Ghatikachala (Sholinghur) | medium |
| **Vishwapriya Tirtha** ★ |  | b. 1958; ordained 1972 | Puttige, near Moodubidre | high |

## Krishnapura Matha  ·  2 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Janardana Tirtha (Krishnapura)** |  | 13th-14th c. | Krishnapura | traditional |
| **Vidyasagara Tirtha (Krishnapura)** ★ | Umapati | present | Krishnapura | medium |

## Puttige Matha  ·  2 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Upendra Tirtha (Puttige)** |  | 13th-14th c. | Puttige | traditional |
| **Sugunendra Tirtha (Puttige)** ★ | Hayavadana | present | Puttige | medium |

## Shirur Matha  ·  2 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Vamana Tirtha (Shirur)** |  | 13th-14th c. | Shirur | traditional |
| **Lakshmivara Tirtha (Shirur)** | Harish Acharya | present (disputed, sub judice) | Madamakki, Hebri (Udupi dist.) | medium |

## Sode Matha  ·  3 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Vishnu Tirtha (Sode)** | Subhaktiman; Madhva's younger brother | 13th-14th c. |  | medium |
| **Vadiraja Tirtha** | Bhuvaraha; born Huvinakere | c.1480-1600 (traditional 120-yr lifespan; 16th-c. floruit attested) | Sode (Sonda) — near Sirsi, North Kanara (Uttara Kannada) | high |
| **Vishwavallabha Tirtha (Sode)** ★ | Raghava | present | Padigaru, near Udupi | medium |

## Kaniyooru Matha  ·  2 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Rama Tirtha (Kaniyooru)** |  | 13th-14th c. | Kaniyooru | traditional |
| **Vidyavallabha Tirtha (Kaniyooru)** ★ | Krishnaraja Acharya | present | Udupi | medium |

## Pejawara Matha  ·  4 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Adhokshaja Tirtha (Pejawara)** |  | 13th-14th c. | Pejawara | traditional |
| **Vijayadhwaja Tirtha** |  | 15th-16th c. (dates contested: 1381-1410 / 1410 / 1434-1448) | Kanva Tirtha (Kanvatirtha) — ~40 km from Udupi | medium |
| **Vishvesha Tirtha** | Venkataramana Bhat | 27 Apr 1931 - 29 Dec 2019 | Pejawara Matha, Udupi | high |
| **Vishwaprasanna Tirtha (Pejawara)** ★ | Devidas Bhat | since 2019 (33rd) | Haleyangadi-Pakshikere (Dakshina Kannada) | high |

## Peripheral / early mathas  ·  5 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Bhandarkere (Bhandarakeri) Matha** |  | Tulu-region Madhva matha; antiquity claim traditional | Barkur, ~20 km N of Udupi | traditional |
| **Bhimanakatte Matha** |  | claims ~5,000 yrs (LEGEND); real: Madhva matha | Doorvasapuram, near Thirthahalli (Tunga river) | traditional |
| **Balagaru Akshobhya Tirtha Matha** |  | founded by Akshobhya Tirtha's initiation of Lokavandita Tirtha | Balagaru, Thirthahalli taluk | medium |
| **Kudli Arya Akshobhya Tirtha Matha** |  | centres Akshobhya Tirtha at Kudli | Koodli (Tunga-Bhadra sangama) | medium |
| **Kukke Subrahmanya Matha** |  | 13th c. | Kukke Subrahmanya | medium |

## Haridasa (Dasa parampara)  ·  5 figures
| Figure | Purvashrama | Period (CE) | Brindavana / place | Conf. |
|---|---|---|---|---|
| **Purandara Dasa** |  | c.1484-1564 |  | medium |
| **Kanaka Dasa** |  | c.1509-1609 |  | medium |
| **Vijaya Dasa** |  | c.1682-1755 |  | medium |
| **Gopala Dasa** |  | c.1721-1769 |  | medium |
| **Jagannatha Dasa** |  | c.1728-1809 |  | medium |

## Principal works of the marquee acharyas
**Madhvacharya** (1238-1317 CE (mainstream); 1199-1278 CE (older scholarly alt.)) — Brahmasutra Bhashya; Anuvyakhyana (masterpiece); Anubhashya; Gita Bhashya & Gita Tatparya Nirnaya; Bhashyas on 10 Upanishads; Rig Bhashya; Mahabharata Tatparya Nirnaya; Bhagavata Tatparya Nirnaya; Dasa Prakaranas (incl. Tattva Sankhyana, Vishnu Tattva Vinirnaya, Mayavada Khandana); Dvadasha Stotra; Krishnamruta Maharnava; Tantra Sara Sangraha.

**Narayana Panditacharya** (late 13th - 14th c.) — Sumadhva Vijaya (16-canto biography of Madhva); Prameya-ratna-malika; Manimanjari.

**Padmanabha Tirtha** (pontificate c.1317-1324) — Sannyaya Ratnavali (on Anuvyakhyana); Sattarka Dipavali (on Brahmasutra Bhashya); Nyaya Ratnavali.

**Jayatirtha (Tikacharya)** (c.1345-1388; pontificate 1365-1388) — Nyaya Sudha (magnum opus, ~24,000 granthas, on Anuvyakhyana); Tattva Prakashika (on Brahmasutra Bhashya); Prameya Dipika / Nyaya Dipika (on Gita Bhashya); Pramana Paddhati; Vadavali.

**Raghuvarya Tirtha** (c.1462-1535; pontificate 1502-1535) — Laghupariksha (Raghupariksha); commentary on Prameyaratnamalika; Krishnastuti (Kannada).

**Raghuttama Tirtha (Bhavabodhacharya)** (c.1527-1596; pontificate 1535-1596) — Brihadaranyaka Bhavabodha (~9,000 granthas); Tattvaprakashika Bhavabodha; Vishnutattvanirnaya Bhavabodha.

**Satyanidhi Tirtha** (1638-1660) — Bhedojjivana; Vayu-Bharati Stotra; Vishnu-Sahasranama Vyakhyana.

**Satyanatha Tirtha** (1660-1673) — Abhinava Chandrika (~12,500); Abhinava Tarka Tandava; Abhinava Gada (vs Appayya Dikshita).

**Satyabhinava Tirtha** (1673-1706) — Mahabharata Tatparya Nirnaya Vyakhyana; Durghata Bhavadipa; Satyanatha Guru Stuti.

**Satyapriya Tirtha** (1737-1744) — Mahabhashya Vivarana; Mandukya Upanishad Bhashya; Tatvaprakashika Vivruthi; Chandrika Bindu; Jayatirtha Stuti.

**Satyasandha Tirtha** (1783-1794) — commentary on Vishnu-Sahasranama; Vishnu-Stuti (48 verses); Purusha-Sukta commentary; Pishta-Pashu Mimamsa.

**Satyadharma Tirtha** (1797-1830) — ~27 works incl. Tattvasamkhyana Tippani; Kavikanthamani; Yaduvara Charitamruta Lahari.

**Satyaparayana Tirtha** (1841-1863) — Sri Rama Shabdartha; Valmiki Ramayana Balakanda Vyakhyana; Lakshmi Dandaka Stotra.

**Satyapramoda Tirtha** (1948-1997) — Nyayasudha Mandanam; Yuktimallika Vyakhyana; Vaishnava Siddhanta Arjavam.

**Sudhindra Tirtha** (pontificate 1614-1621) — Alamkara Manjari; Alamkara Nikasha; Subhadra-Dhananjaya (drama).

**Raghavendra Tirtha (Rayaru)** (c.1595-1671; pontificate 1621-1671) — Parimala (on Nyaya Sudha); Tantradipika (on Brahma Sutras); Nyayamuktavali / Bhavadipa; Bhatta Sangraha; Mantrartha Manjari; Gita commentaries.

**Sumatindra Tirtha** (1692-1725) — Bhavaratnakosha; Vakyaratnakosha; Abhinavakadambari.

**Dheerendra Tirtha** (1785) — Narayanopanishat Vyakhyana; Yajnikopanishat Vyakhyana; Vishayavakya Sangraha.

**Vyasatirtha (Vyasaraja)** (1447-1539 CE (birth also given c.1460)) — Nyayamruta ('nectar of logic'); Tatparya Chandrika; Tarka Tandava; Mandaramanjari; Bhedojjivana.

**Kanaka Dasa** (c.1509-1609) — Haribhaktisara; Mohanatarangini; Nalacharitre; Ramadhanya Charite.

**Srinivasa Tirtha** (16th c.) — Nyayamrita-Prakasha; Sri Brahmanyatirtha Vijaya; Brahmanyatirtha Mangalashtaka; Brahmanyatirtha Stotram.

**Vidyashreesha Tirtha** (crowned 2 July 2017) — Critically edited 10+ Sanskrit works (incl. Gita Tatparya, Gita Bhashya); 100+ research papers; Kannada translations of Sanskrit texts.

**Vidyamanya Tirtha** (27 Jul 1913 - 14 May 2000) — Advaita Tattva Samiksha; Tattva Martanda Vimarsha; Apurvatavada.

**Vadiraja Tirtha** (c.1480-1600 (traditional 120-yr lifespan; 16th-c. floruit attested)) — Yuktimallika (magnum opus of Dvaita metaphysics); Tirtha Prabandha (verse pilgrimage travelogue); Rukminisha Vijaya (19-canto mahakavya); Sarasa Bharati Vilasa; Dashavatara Stuti; Lakshmi Shobhane & Haridasa songs.

## Key corrections & scholarly caveats
- **Chitrapur Math is Advaita/Smarta, not Dvaita.** The supposed link to the Vijayadhwaja (Madhva) lineage is *not* attested — the only commonality with the Vaishnava GSB mathas is shared Saraswat caste ancestry. It is therefore intentionally **excluded** from this Dvaita lineage tree.
- **Bhimanakatte's ~5,000-year antiquity claim (and Bhandarkere's) are matha legend**, not history. Both are genuine old Madhva mathas tracing to the Achyutapreksha line, but neither predates Madhva.
- **Madhva's dates** are given two ways in reputable sources: **1238–1317** (mainstream) and **1199–1278** (older scholarly). Both are recorded; the tree uses 1238–1317.
- **Mathatraya seniority (Uttaradi / Vyasaraja / Raghavendra) is an unresolved dispute.** Each matha claims to be the *mula* throne. The tree shows the branch structure neutrally and does not adjudicate.
- **Akshobhya Tirtha's brindavana** is placed at Malkhed by standard references; the Kudli math centres him at Kudli — competing traditions, both noted.
- **Vijayadhwaja Tirtha's dates** genuinely conflict across sources (1381–1410 / 1410 / 1434–1448); the later-15th/early-16th-c. placement is preferred.
- **Shirur Matha** has a live, litigated succession dispute (Lakshmivara vs Vedavardhana Tirtha).
- Thinly-documented in open sources (flagged as skeletons): intermediate pontiffs of Sripadaraja, Vyasaraja (Sosale/Kundapura), and the Krishnapura/Puttige/Kaniyooru medieval lines.

## Primary references
- B.N.K. Sharma, *History of the Dvaita School of Vedanta and Its Literature* (Motilal Banarsidass).
- Narayana Panditacharya, *Sumadhva Vijaya* (traditional biography of Madhva).
- Official matha websites: uttaradimath.org, srsmatha.org / gururaghavendra, vyasarajamatha.org, sripadaraja math, kashimath.org, partagalimath.org, pejavaramatha.in, adamarumatha.com, and others.
- Per-figure Wikipedia articles (which themselves largely cite B.N.K. Sharma).

*Full per-figure research notes with source URLs are in the `research/` folder (files 01–05).*
