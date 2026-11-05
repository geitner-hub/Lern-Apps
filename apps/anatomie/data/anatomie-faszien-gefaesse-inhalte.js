/* ═══════════════════════════════════════════════════════
   Lernwelt – apps/anatomie/data/anatomie-faszien-gefaesse-inhalte.js
   Allgemeine Anatomie · Kapitel 6–8: Faszien, Gefäße, lymphatisches System (Prometheus S. 66–77)
   Kein Knochenbezug: prüfungsrelevante Kernaussagen. Seitenangaben = Buchseiten, Buchstabe = Abbildung.
   Alle Texte eigene Formulierungen.
   ═══════════════════════════════════════════════════════ */
(function () {
  const S = (lat, de, info, ref) => ({ lat, de, info, ref });

  const strukturen = {
    /* 6.1 Muskelfaszien */
    'fascia': S('Fascia', 'Faszie', 'Abgrenzbare Bindegewebshülle oder -platte; man unterscheidet Muskel-, Rumpfwand-, Körperhöhlen- und subkutane Faszien.', 'S. 66 A'),
    'fascia-musculi': S('Fascia musculi', 'Muskelfaszie', 'Im engeren Sinn die äußerste Bindegewebsschicht über dem Epimysium eines Muskels.', 'S. 66 A'),
    'septum-intermusculare': S('Septum intermusculare', 'Muskelscheidewand', 'Am Knochen befestigte Bindegewebsplatte dort, wo zwei Gruppenfaszien aufeinandertreffen.', 'S. 66 A'),
    'compartimentum': S('Compartimentum', 'Muskelloge (Kompartiment)', 'Osteofibröser Raum aus Faszie, Septen und Knochen, in dem Muskeln, Gefäße und Nerven liegen.', 'S. 66 A, 67 C'),
    'retinaculum': S('Retinaculum', 'Halteband', 'Aponeurotisch verstärkte Faszie am Übergang Unterschenkel/Fuß oder Unterarm/Hand.', 'S. 66 A'),
    'tractus-iliotibialis': S('Tractus iliotibialis', 'Tractus iliotibialis', 'Laterale Längsverstärkung der Fascia lata; mindert als Zuggurtung die Biegebelastung des Femurs.', 'S. 66 A–B'),
    'scherengitter': S('Dispositio cancellata', 'Scherengitteranordnung', 'Schichten aus Kollagen-Typ-I-Fasern mit wechselnden Steigungswinkeln: belastbar in mehreren Richtungen und anpassungsfähig an die Muskelform.', 'S. 66 A b, B'),
    'kollagenfasern-faszie': S('Fibrae collagenosae', 'Kollagenfasern der Faszie', 'Etwa 5 % dehnbar, durch welligen Verlauf ca. 3 % verlängerbar, sehr reißfest (50–100 N/mm²); richten sich nach den Zugkräften aus.', 'S. 66 A'),
    'kompartmentsyndrom': S('Syndroma compartimenti', 'Kompartmentsyndrom', 'Druckanstieg in einer Loge (z. B. Hämatom, Ödem) stört die Kapillardurchblutung; ab etwa 4 h irreversible Schäden. Therapie: Faszienspaltung.', 'S. 67 C'),
    'tibialis-anterior-syndrom': S('Syndroma m. tibialis anterioris', 'Tibialis-anterior-Syndrom', 'Häufigstes Kompartmentsyndrom in der Extensorenloge; Schmerz, Dehnungsschmerz, Schwäche, Sensibilitätsstörung – distale Pulse meist tastbar.', 'S. 67 C'),
    'fascia-thoracolumbalis': S('Fascia thoracolumbalis', 'Rückenfaszie', 'Umhüllt den M. erector spinae, dient dem M. latissimus dorsi als Ursprung; dicht innerviert (Nozi-, Propriozeptoren, viel Sympathikus) und schmerzempfindlich.', 'S. 67 D'),

    /* 6.2 Rumpffaszien */
    'fascia-investiens-superficialis': S('Fascia investiens superficialis', 'oberflächliche Rumpfwandfaszie', 'Trennt die Rumpfwandmuskulatur von Haut und Unterhaut und macht beide gegeneinander verschieblich.', 'S. 68 A'),
    'fascia-investiens-intermedia': S('Fascia investiens intermedia', 'mittlere Rumpfwandfaszie', 'Liegt zwischen den Muskelschichten der Rumpfwand.', 'S. 68 A'),
    'fascia-investiens-profunda': S('Fascia investiens profunda', 'tiefe Rumpfwandfaszie', 'Innerste Schicht der Rumpfwand; am Bauch als Fascia transversalis bezeichnet.', 'S. 68 A, 69 D'),
    'fascia-parietalis': S('Fascia parietalis', 'wandständige Körperhöhlenfaszie', 'Äußerste Begrenzung der Körperhöhle, oft mit der tiefen Rumpfwandfaszie verwachsen; innen liegt das parietale Peritoneum.', 'S. 68 A'),
    'fascia-visceralis': S('Fascia visceralis', 'organständige Faszie', 'Umhüllt Organe, besonders kräftig im Becken um Harnblase und Rectum.', 'S. 68 A'),
    'fascia-extraperitonealis': S('Fascia extraperitonealis', 'extraperitoneale Faszie', 'Bindegewebe zwischen parietaler und viszeraler Faszie, führt Leitungsbahnen; im Thorax entsprechend Fascia extraserosalis.', 'S. 68 A, 69 B'),
    'fascia-transversalis': S('Fascia transversalis', 'Fascia transversalis', 'Historischer Name der tiefen Rumpfwandfaszie am Bauch; am Leistenkanal als Fascia spermatica interna fortgesetzt.', 'S. 69 D'),
    'fascia-endothoracica': S('Fascia endothoracica', 'Fascia endothoracica', 'Faszie auf der Innenseite der Thoraxwand; über dem Zwerchfell Fascia phrenicopleuralis.', 'S. 69 D'),
    'fascia-clavipectoralis': S('Fascia clavipectoralis', 'Fascia clavipectoralis', 'Mittlere Faszie für M. pectoralis minor und M. subclavius.', 'S. 69 D'),
    'thoraxwand-zwei-muskelwaende': S('Parietes musculares thoracis', 'zwei Muskelwände am Thorax', 'Innen die dreischichtigen Interkostalmuskeln (entsprechen der Bauchwand), außen die Muskeln für Arm und Schultergürtel.', 'S. 69 B'),

    /* 7.1 Kreislauf */
    'arteria-vena': S('Arteria / Vena', 'Arterie und Vene', 'Benannt nach der Flussrichtung: Arterien führen vom Herzen weg, Venen zum Herzen – unabhängig vom Sauerstoffgehalt.', 'S. 70 A'),
    'lungenkreislauf': S('Circulatio pulmonalis', 'kleiner Kreislauf', 'Aa. und Vv. pulmonales: sauerstoffarmes Blut zur Lunge, sauerstoffreiches zum linken Vorhof.', 'S. 70 A'),
    'koerperkreislauf': S('Circulatio systemica', 'großer Kreislauf', 'Aorta und Hohlvenen mit allen Ästen.', 'S. 70 A'),
    'hochdrucksystem': S('Systema pressionis altae', 'Hochdrucksystem', 'Arterien des Körperkreislaufs (ca. 100 mmHg); Versorgungsfunktion.', 'S. 70 B, 72 B'),
    'niederdrucksystem': S('Systema pressionis humilis', 'Niederdrucksystem', 'Venen (ca. 20 mmHg) und auch die Lungenarterien; Reservoir für rund 80 % des Blutvolumens.', 'S. 70 B, 72 B'),
    'windkessel': S('Functio cisternae aeris', 'Windkesselfunktion', 'Herznahe elastische Arterien dehnen sich in der Systole und geben das Volumen in der Diastole gleichmäßig weiter – keine Druckspitzen.', 'S. 70 B'),
    'arterie-elastischer-typ': S('Arteria typi elastici', 'Arterie vom elastischen Typ', 'Herznah (z. B. Aorta); wandreich an elastischen Fasern, Windkessel.', 'S. 70 B, 72 A a'),
    'arterie-muskulaerer-typ': S('Arteria typi muscularis', 'Arterie vom muskulären Typ', 'Herzfern; regelt durch Vasokonstriktion und -dilatation Widerstand und lokale Durchblutung.', 'S. 70 B, 72 A b–c'),
    'kapazitaetsgefaesse': S('Vasa capacitatis', 'Kapazitätsgefäße', 'Venen als Blutspeicher dank hoher Dehnbarkeit.', 'S. 70 B'),
    'pfortader': S('Vena portae hepatis', 'Pfortader', 'Führt nährstoffreiches Blut aus den unpaaren Bauchorganen zuerst zur Leber.', 'S. 71 D'),
    'venen-ober-tief': S('Venae superficiales / profundae / perforantes', 'oberflächliche, tiefe und Perforansvenen', 'Oberflächliche (epifasziale) und tiefe Venen sind über Perforansvenen verbunden.', 'S. 71 D'),

    /* 7.2 Wandbau */
    'tunica-intima': S('Tunica intima', 'Intima', 'Endothel auf Basalmembran mit dünnem subendothelialem Bindegewebe; bei muskulären Arterien durch die Membrana elastica interna begrenzt.', 'S. 72 C'),
    'tunica-media': S('Tunica media', 'Media', 'Überwiegend zirkuläre glatte Muskulatur mit elastischen und kollagenen Fasern; bei Venen locker und bindegewebsreich.', 'S. 72 C, 73 D'),
    'tunica-adventitia': S('Tunica externa (adventitia)', 'Adventitia', 'Längsorientiertes Bindegewebe; führt vegetative Nerven und bei großen Gefäßen die Vasa vasorum.', 'S. 72 C'),
    'membrana-elastica-interna': S('Membrana elastica interna', 'Membrana elastica interna', 'Grenze zwischen Intima und Media bei muskulären Arterien; fehlt den Venen.', 'S. 72 C, 73 D'),
    'vasa-vasorum': S('Vasa vasorum', 'Gefäße der Gefäßwand', 'Ernähren die äußeren Wandschichten großer Gefäße über die Adventitia.', 'S. 72 C'),
    'venenklappen': S('Valvulae venosae', 'Venenklappen', 'Taschenklappen kleiner und mittlerer Venen; verhindern den Rückstrom.', 'S. 72 A g–h, 73 F'),
    'venoeser-rueckstrom': S('Reditus venosus', 'venöser Rückstrom', 'Venenklappen, arteriovenöse Kopplung (Pulswelle auf Begleitvene), Muskelpumpe und Sogwirkung des Herzens (Ventilebene).', 'S. 73 F'),
    'hydrostatische-indifferenzebene': S('Planum indifferentiae hydrostaticae', 'hydrostatische Indifferenzebene', 'Höhe knapp unter dem Zwerchfell, an der sich der Druck beim Aufstehen nicht ändert; beim Stehen sacken ca. 500 ml in die Beinvenen.', 'S. 73 E'),
    'varizen': S('Varices', 'Krampfadern', 'Folge von Venenklappeninsuffizienz und Rückstau, z. B. bei langem Stehen oder Sitzen ohne Muskelpumpe.', 'S. 73 F'),

    /* 7.3 Terminale Strombahn */
    'terminale-strombahn': S('Microcirculatio', 'terminale Strombahn', 'Arteriolen, Kapillaren und Venolen – Ort des Stoff-, Gas- und Flüssigkeitsaustauschs.', 'S. 72 B, 74 B'),
    'kapillare': S('Vas capillare', 'Kapillare', '5–15 µm weit, nur Endothel und Basalmembran mit aufliegenden Perizyten; Blut fließt dort ca. 0,05 cm/s.', 'S. 74 B, 75 D'),
    'perizyten': S('Pericyti', 'Perizyten', 'Zellen außen auf der Kapillarwand; u. a. an Gefäßbildung beteiligt.', 'S. 75 D'),
    'praekapillaerer-sphinkter': S('Sphincter praecapillaris', 'präkapillärer Sphinkter', 'Ringmuskel am Abgang der Kapillaren von der Metarteriole; in Ruhe sind nur 25–35 % der Kapillaren durchblutet.', 'S. 75 C'),
    'av-anastomose': S('Anastomosis arteriolovenularis', 'arteriovenöse Anastomose', 'Kurzschluss zwischen Arteriole und Venole unter Umgehung des Kapillarbetts.', 'S. 75 C'),
    'endotheltypen': S('Typi endothelii', 'Endotheltypen', 'I geschlossen (Nervensystem), II geschlossen mit Pinozytose (Herz- und Skelettmuskel), III gefenstert mit Diaphragma (Magen-Darm), IV mit Lücken ohne Basalmembran (Leber).', 'S. 75 D'),
    'filtration-resorption': S('Filtratio et resorptio', 'Filtration und Resorption', 'Arteriell überwiegt der Blutdruck (35 vs. 25 mmHg kolloidosmotisch) → Filtration; venös überwiegt der kolloidosmotische Druck (15 vs. 25) → Resorption.', 'S. 75 E'),
    'oedem': S('Oedema', 'Ödem', 'Dauerhafte Flüssigkeitsansammlung im Gewebe, wenn Filtration, Resorption oder Lymphabfluss gestört sind.', 'S. 75 E'),

    /* 8.1 Lymphatisches System */
    'lymphgefaesssystem': S('Systema lymphaticum', 'Lymphgefäßsystem', 'Dem Venensystem parallel: drainiert Gewebsflüssigkeit, transportiert Nahrungsfette (Chylomikronen) und bringt Lymphozyten ins Blut zurück.', 'S. 76 A'),
    'lymphkapillare': S('Vas lymphocapillare', 'Lymphkapillare', 'Blind beginnend, ca. 50 µm weit, unvollständige Basalmembran, über Ankerfilamente im Gewebe befestigt.', 'S. 76 A, 77 D'),
    'praekollektor': S('Praecollector', 'Präkollektor', 'Ca. 100 µm weit, schon mit Taschenklappen und Bindegewebsschicht.', 'S. 77 D'),
    'kollektor': S('Collector', 'Kollektor', '150–600 µm, venenähnlich gebaut; pumpt durch rhythmische Kontraktionen (10–12/min) der klappenfreien Segmente.', 'S. 77 D'),
    'ductus-thoracicus': S('Ductus thoracicus', 'Milchbrustgang', 'Großer Lymphstamm; leitet die Lymphe aus drei Körperquadranten in den linken Venenwinkel.', 'S. 76 A'),
    'ductus-lymphaticus-dexter': S('Ductus lymphaticus dexter', 'rechter Lymphgang', 'Leitet die Lymphe des rechten oberen Quadranten in den rechten Venenwinkel.', 'S. 76 A'),
    'lymph-kompartimente': S('Compartimenta lymphatica', 'Lymphsysteme', 'Oberflächlich (epifaszial, Haut), tief (subfaszial, Muskeln, Gelenke, Nerven) und organspezifisch; Perforansgefäße verbinden oben und tief.', 'S. 77 C'),
    'primaere-lymphorgane': S('Organa lymphatica primaria', 'primäre lymphatische Organe', 'Thymus (Prägung der T-Lymphozyten) und Knochenmark (B-Lymphozyten).', 'S. 76 B'),
    'sekundaere-lymphorgane': S('Organa lymphatica secundaria', 'sekundäre lymphatische Organe', 'Milz, Lymphknoten, Mandeln und schleimhautassoziiertes Gewebe (MALT, BALT, GALT mit Peyer-Plaques und Appendix).', 'S. 76 B'),
    'milz-blutstrom': S('Splen (Lien)', 'Milz', 'Einziges Immunorgan, das direkt in den Blutstrom eingeschaltet ist.', 'S. 76 A'),
    'nodus-lymphoideus': S('Nodus lymphoideus', 'Lymphknoten', 'Filterstation mit T- und B-Zellen; etwa 600–700, die meisten im Kopf-Hals-Bereich. Rinde, Paracortex, Mark; Vasa afferentia rein, Vas efferens am Hilum raus.', 'S. 77 E'),
    'cortex-paracortex': S('Cortex / Paracortex', 'Rinde und Parakortex', 'Sekundärfollikel der Rinde = B-Zell-Region; Paracortex = T-Zell-Region mit hochendothelialen Venolen, über die Lymphozyten einwandern.', 'S. 77 E')
  };

  const einheiten = [
    ['6.1', 'Muskelfaszien: Aufbau und Funktion', 66], ['6.2', 'Systematik der Faszien an Rumpf und Körperhöhlen', 68],
    ['7.1', 'Übersicht über das kardiovaskuläre System', 70], ['7.2', 'Aufbau von Arterien und Venen', 72],
    ['7.3', 'Terminale Strombahn und Flüssigkeitsaustausch', 74], ['8.1', 'Das lymphatische System', 76]
  ].map(([nr, titel, seite]) => ({ nr, titel, seite }));

  const karten = [
    ['Was ist eine Muskelloge (Kompartiment)?', 'Ein osteofibröser Raum aus Faszie, Septum intermusculare und Knochen, in dem Muskeln, Gefäße und Nerven liegen.', '6.1', 'S. 66 A'],
    ['Was bedeutet Scherengitteranordnung?', 'Kollagenschichten mit unterschiedlichen Steigungswinkeln: Zugfestigkeit in mehreren Richtungen und Anpassung an die wechselnde Muskelform.', '6.1', 'S. 66 B'],
    ['Wozu dient der Tractus iliotibialis?', 'Als laterale Zuggurtung mindert er die Biegebeanspruchung des Femurs.', '6.1', 'S. 66 B'],
    ['Kompartmentsyndrom: Ursache und Therapie?', 'Druckanstieg in der Loge (Hämatom, Ödem) → Ischämie von Muskeln und Nerven; sofortige Faszienspaltung.', '6.1', 'S. 67 C'],
    ['Warum sind beim Kompartmentsyndrom die distalen Pulse meist tastbar?', 'Logendrücke von 30–60 mmHg reichen nicht, um größere Arterien abzudrücken – sie stören aber die Kapillardurchblutung.', '6.1', 'S. 67 C'],
    ['Was ist besonders an der Fascia thoracolumbalis?', 'Sie ist dicht innerviert (Nozizeptoren, Propriozeptoren, viele sympathische Fasern) und schmerzempfindlicher als die Rückenmuskulatur.', '6.1', 'S. 67 D'],
    ['Welche zwei Gruppen von Rumpffaszien gibt es?', 'Rumpfwandfaszien (Fasciae investientes) und Körperhöhlenfaszien (parietal, viszeral, extraperitoneal).', '6.2', 'S. 68 A'],
    ['Welche drei Schichten haben die Rumpfwandfaszien?', 'Fascia investiens superficialis, intermedia und profunda (am Bauch: Fascia transversalis).', '6.2', 'S. 68 A, 69 D'],
    ['Warum ist die Faszienordnung am Thorax komplizierter?', 'Es gibt zwei Muskelwände: innen die Interkostalmuskeln, außen die Muskeln für Arm und Schultergürtel.', '6.2', 'S. 69 B'],
    ['Wonach werden Arterie und Vene benannt?', 'Nach der Flussrichtung zum bzw. vom Herzen, nicht nach dem Sauerstoffgehalt.', '7.1', 'S. 70 A'],
    ['Hoch- vs. Niederdrucksystem?', 'Arterien des Körperkreislaufs ca. 100 mmHg; Venen ca. 20 mmHg – zum Niederdrucksystem zählen auch die Lungenarterien.', '7.1', 'S. 70 B'],
    ['Was leistet die Windkesselfunktion?', 'Elastische herznahe Arterien speichern das Schlagvolumen und glätten die Strömung – keine Druckspitzen.', '7.1', 'S. 70 B'],
    ['Wie viel Blutvolumen fassen die Venen?', 'Etwa 80 % – sie sind Kapazitätsgefäße.', '7.1', 'S. 70 B'],
    ['Welche drei Wandschichten haben Blutgefäße?', 'Intima (Endothel), Media (glatte Muskulatur), Adventitia (Bindegewebe, Vasa vasorum, Nerven).', '7.2', 'S. 72 C'],
    ['Wie unterscheiden sich Arterie und Begleitvene histologisch?', 'Arterie: dichte Muskelmedia, Membrana elastica interna. Vene: lockere bindegewebsreiche Media, keine klare Schichtung, keine Elastica interna.', '7.2', 'S. 73 D'],
    ['Welche Mechanismen fördern den venösen Rückstrom?', 'Venenklappen, arteriovenöse Kopplung, Muskelpumpe und die Sogwirkung des Herzens.', '7.2', 'S. 73 F'],
    ['Warum sind Fußrückenvenen muskelstärker als Handrückenvenen?', 'Im Stehen lastet in den Beinen ein viel höherer hydrostatischer Druck auf den Venen.', '7.2', 'S. 73 E'],
    ['Was umfasst die terminale Strombahn?', 'Arteriolen, Kapillaren und Venolen – den Ort des Austauschs.', '7.3', 'S. 74 B'],
    ['Warum fließt das Blut in den Kapillaren so langsam?', 'Der Gesamtquerschnitt nimmt etwa 800-fach zu: von 50 cm/s in der Aorta auf 0,05 cm/s; Kontaktzeit ca. 1 s.', '7.3', 'S. 74 B'],
    ['Nenne die vier Endotheltypen mit Beispiel.', 'I geschlossen – Nervensystem; II mit Pinozytose – Herz-/Skelettmuskel; III gefenstert – Magen-Darm; IV Lücken ohne Basalmembran – Leber.', '7.3', 'S. 75 D'],
    ['Wie viel Flüssigkeit wird täglich filtriert, resorbiert, als Lymphe abgeleitet?', 'Ca. 20 l filtriert, 18 l (90 %) resorbiert, 2 l (10 %) über die Lymphe.', '7.3', 'S. 75 E'],
    ['Drei Aufgaben des Lymphgefäßsystems?', 'Drainage von Gewebsflüssigkeit, Transport von Nahrungsfetten, Rückführung von Lymphozyten ins Blut.', '8.1', 'S. 76 A'],
    ['Wohin fließt die Lymphe der vier Körperquadranten?', 'Drei Quadranten über den Ductus thoracicus in den linken Venenwinkel, der rechte obere über den Ductus lymphaticus dexter in den rechten.', '8.1', 'S. 76 A'],
    ['Primäre vs. sekundäre lymphatische Organe?', 'Primär (Bildung/Prägung): Thymus, Knochenmark. Sekundär (Abwehr): Milz, Lymphknoten, MALT/BALT/GALT, Mandeln.', '8.1', 'S. 76 B'],
    ['Wie wird Lymphe in den Kollektoren transportiert?', 'Durch rhythmische Kontraktionen der klappenfreien Segmente (10–12/min); Klappen geben die Richtung vor.', '8.1', 'S. 77 D'],
    ['Wo sitzen B- und T-Zellen im Lymphknoten?', 'B-Zellen in den Sekundärfollikeln der Rinde, T-Zellen im Paracortex.', '8.1', 'S. 77 E']
  ].map(([f, a, e, ref], i) => ({ id: 'k' + i, f, a, e, ref }));

  const fragen = [
    ['Welcher Kollagentyp überwiegt in Muskelfaszien?', ['Typ I', 'Typ II', 'Typ III', 'Typ IV'], 0, 'Etwa 90 % des Kollagens ist Typ I.', '6.1', 'S. 66 A'],
    ['Ab wann drohen beim Kompartmentsyndrom irreversible Schäden?', ['nach 30 min', 'nach etwa 4 h', 'nach 24 h', 'nach 3 Tagen'], 1, 'Ischämische Muskelnekrosen nach etwa 4 Stunden.', '6.1', 'S. 67 C'],
    ['Welche Loge ist beim häufigsten Kompartmentsyndrom betroffen?', ['Flexorenloge des Unterarms', 'Extensorenloge des Unterschenkels', 'Adduktorenloge', 'Glutealloge'], 1, 'Tibialis-anterior-Syndrom.', '6.1', 'S. 67 C'],
    ['Wie heißt die tiefe Rumpfwandfaszie am Bauch?', ['Fascia thoracolumbalis', 'Fascia transversalis', 'Fascia endothoracica', 'Fascia lata'], 1, 'Im Leistenkanal setzt sie sich als Fascia spermatica interna fort.', '6.2', 'S. 69 D'],
    ['Wo ist die Fascia visceralis besonders kräftig?', ['am Thorax', 'im Becken um Harnblase und Rectum', 'am Hals', 'am Oberschenkel'], 1, 'Im Thorax sind die Körperhöhlenfaszien schwach.', '6.2', 'S. 68 A'],
    ['Welche Aussage zu „Arterie“ trifft zu?', ['führt immer sauerstoffreiches Blut', 'führt Blut vom Herzen weg', 'hat Venenklappen', 'gehört immer zum Hochdrucksystem'], 1, 'Die A. pulmonalis führt sauerstoffarmes Blut und gehört zum Niederdrucksystem.', '7.1', 'S. 70 A–B'],
    ['Welche Gefäße regulieren vor allem die lokale Durchblutung?', ['Aorta', 'Arterien vom muskulären Typ und Arteriolen', 'große Venen', 'Lymphgefäße'], 1, 'Durch Vasokonstriktion und Vasodilatation.', '7.1', 'S. 70 B'],
    ['Was trennt bei muskulären Arterien Intima und Media?', ['Membrana elastica externa', 'Membrana elastica interna', 'Basalmembran', 'Adventitia'], 1, 'Den Venen fehlt sie.', '7.2', 'S. 72 C'],
    ['Wie viel Blut verlagert sich beim Aufstehen in die Beinvenen?', ['50 ml', '500 ml', '1,5 l', '3 l'], 1, 'Etwa 500 ml.', '7.2', 'S. 73 E'],
    ['Wie schnell fließt Blut in den Kapillaren etwa?', ['50 cm/s', '5 cm/s', '0,05 cm/s', '0,0005 cm/s'], 2, 'In der Aorta etwa 50 cm/s.', '7.3', 'S. 74 B'],
    ['Welches Organ hat Endothel mit Lücken ohne Basalmembran?', ['Gehirn', 'Skelettmuskel', 'Darm', 'Leber'], 3, 'Typ IV.', '7.3', 'S. 75 D'],
    ['Was treibt am arteriellen Kapillarende die Filtration an?', ['kolloidosmotischer Druck', 'hydrostatischer Blutdruck', 'Lymphsog', 'Perizyten'], 1, '35 mmHg Blutdruck gegen 25 mmHg kolloidosmotisch.', '7.3', 'S. 75 E'],
    ['Wie viel Prozent der filtrierten Flüssigkeit fließt als Lymphe ab?', ['1 %', '10 %', '50 %', '90 %'], 1, 'Etwa 2 von 20 Litern pro Tag.', '7.3', 'S. 75 E'],
    ['Welches Organ ist ein primäres lymphatisches Organ?', ['Milz', 'Lymphknoten', 'Thymus', 'Tonsilla palatina'], 2, 'Neben dem Knochenmark.', '8.1', 'S. 76 B'],
    ['In welchen Venenwinkel mündet der Ductus thoracicus?', ['rechts', 'links', 'in die V. cava inferior', 'in die Pfortader'], 1, 'Er drainiert drei Körperquadranten.', '8.1', 'S. 76 A'],
    ['Wo liegt im Lymphknoten die T-Zell-Region?', ['Sekundärfollikel', 'Paracortex', 'Marksinus', 'Kapsel'], 1, 'Mit hochendothelialen Venolen.', '8.1', 'S. 77 E']
  ].map(([f, o, r, x, e, ref], i) => ({ id: 'f' + i, f, o, r, x, e, ref }));

  const sortieren = {
    titel: 'Zu welchem Gefäßabschnitt?', ref: 'S. 70 B, 72 B, 76 A, 77 D',
    kategorien: ['Hochdrucksystem', 'terminale Strombahn', 'Niederdrucksystem', 'Lymphsystem'],
    items: [
      ['Aorta', 0], ['A. femoralis', 0], ['Arterien vom muskulären Typ', 0],
      ['Arteriole', 1], ['Kapillare', 1], ['Venole', 1], ['präkapillärer Sphinkter', 1],
      ['V. cava inferior', 2], ['Vene mit Venenklappen', 2], ['A. pulmonalis', 2],
      ['Ductus thoracicus', 3], ['Präkollektor', 3], ['Lymphknoten', 3]
    ].map(([t, k], i) => ({ id: 's' + i, t, k }))
  };

  const tabellen = [
    {
      id: 'kapillardruck', titel: 'Drücke an der Kapillare (mmHg)', ref: 'S. 75 E', einheit: '7.3',
      spalten: ['hydrostatisch', 'kolloidosmotisch', 'Differenz'],
      zeilen: [['arterielles Ende', ['35', '25', '10']], ['venöses Ende', ['15', '25', '-10']]],
      fuss: 'Positive Differenz = Filtration, negative = Resorption.'
    },
    {
      id: 'kreislaufzahlen', titel: 'Kennzahlen des Kreislaufs', ref: 'S. 70 B, 74 B, 75 C–E', einheit: '7.1',
      spalten: ['Wert'],
      zeilen: [['Druck im arteriellen Hochdrucksystem (mmHg)', ['100']], ['Druck im venösen Niederdrucksystem (mmHg)', ['20']], ['Blutvolumen in den Venen (%)', ['80']],
        ['Strömung in der Aorta (cm/s)', ['50']], ['Kapillardurchmesser (µm)', ['5–15']], ['in Ruhe durchblutete Kapillaren (%)', ['25–35']], ['Filtrat pro Tag (l)', ['20']], ['Lymphe pro Tag (l)', ['2']]],
      fuss: 'Gerundete Richtwerte.'
    },
    {
      id: 'endothel', titel: 'Endotheltypen', ref: 'S. 75 D', einheit: '7.3',
      spalten: ['Beispiel'],
      zeilen: [['I geschlossen, ohne Fenster', ['Nervensystem']], ['II geschlossen, mit Pinozytose', ['Muskulatur']], ['III gefenstert mit Diaphragma', ['Darm']], ['IV Lücken ohne Basalmembran', ['Leber']]],
      fuss: 'Typ II: Herz- und Skelettmuskulatur.'
    }
  ];

  (window.KAPITEL_LISTE = window.KAPITEL_LISTE || []).push({
    id: 'allg-faszien-gefaesse', start: 66,
    band: 'Allgemeine Anatomie und Bewegungssystem',
    teil: 'Allgemeine Anatomie',
    titel: 'Faszien, Gefäße und lymphatisches System',
    seiten: 'S. 66–77',
    intro: 'Muskel- und Rumpffaszien mit Kompartmentsyndrom, Kreislaufsystem, Wandbau von Arterien und Venen, Mikrozirkulation und das Lymphsystem – die prüfungsrelevanten Kernaussagen.',
    einheiten, strukturen, karten, fragen, sortieren, tabellen,
    tafeln: []
  });
})();
