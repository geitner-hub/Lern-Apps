/* ═══════════════════════════════════════════════════════
   Lernwelt – apps/anatomie/data/anatomie-knochen-gelenke-inhalte.js
   Allgemeine Anatomie · Kapitel 4: Knochen und Knochenverbindungen (Prometheus S. 40–49)
   Seitenangaben = Buchseiten im Prometheus LernAtlas (Allgemeine Anatomie und Bewegungssystem),
   Buchstabe = Abbildung/Tabelle. Alle Texte eigene Formulierungen. Tafeln folgen in einem späteren Schritt.
   ═══════════════════════════════════════════════════════ */
(function () {
  const S = (lat, de, info, ref) => ({ lat, de, info, ref });

  const strukturen = {
    /* 4.1 Knochentypen und Röhrenknochen */
    'ossa-longa': S('Ossa longa', 'lange Knochen', 'Röhrenknochen der Gliedmaßen mit Schaft und zwei Enden, z. B. Femur oder Humerus.', 'S. 40 C'),
    'ossa-brevia': S('Ossa brevia', 'kurze Knochen', 'Würfel- oder klötzchenförmige Knochen, typisch für Hand- und Fußwurzel.', 'S. 40 C'),
    'ossa-plana': S('Ossa plana', 'platte Knochen', 'Flächige Knochen wie Schulterblatt, Darmbein oder die Knochen des Schädeldachs.', 'S. 40 C'),
    'ossa-irregularia': S('Ossa irregularia', 'unregelmäßige Knochen', 'Knochen ohne regelhafte Grundform, als Beispiel nennt das Buch Knochen der Schädelbasis.', 'S. 40 C'),
    'ossa-pneumatica': S('Ossa pneumatica', 'lufthaltige Knochen', 'Knochen mit luftgefüllten, schleimhautausgekleideten Räumen, z. B. Gesichtsschädel mit Nasennebenhöhlen.', 'S. 40 C'),
    'ossa-sesamoidea': S('Ossa sesamoidea', 'Sesambeine', 'In Sehnen eingelagerte Knochen; größtes Beispiel ist die Kniescheibe.', 'S. 40 C'),
    'ossa-accessoria': S('Ossa accessoria', 'akzessorische Knochen', 'Überzählige Knochen, meist weil einzelne Knochenkerne nicht miteinander verschmelzen; häufig an Schädeldach und Fuß.', 'S. 40 C'),
    'epiphysis': S('Epiphysis', 'Epiphyse (Knochenende)', 'Gelenknahes Ende eines Röhrenknochens: innen Spongiosa mit rotem Mark, außen dünne Compacta, an der Gelenkfläche hyaliner Knorpel.', 'S. 41 D a'),
    'diaphysis': S('Diaphysis', 'Diaphyse (Schaft)', 'Mittelstück des Röhrenknochens mit dicker Compacta und Markhöhle voller Fettmark.', 'S. 41 D a'),
    'apophysis': S('Apophysis', 'Apophyse', 'Knochenvorsprung mit eigenem Knochenkern, an dem Sehnen und Bänder ansetzen, z. B. Trochanter major.', 'S. 41 D a, 19 D'),
    'linea-epiphysialis': S('Linea epiphysialis', 'knöcherne Epiphysenlinie', 'Verknöcherter Rest der Wachstumsfuge nach Abschluss des Längenwachstums.', 'S. 41 D a'),
    'substantia-compacta': S('Substantia compacta', 'Kompakta', 'Dichte Rindenschicht, aus Osteonen aufgebaut; besonders kräftig im Schaft.', 'S. 41 D a, c'),
    'substantia-spongiosa': S('Substantia spongiosa', 'Spongiosa', 'Schwammartiges Bälkchenwerk aus Lamellenknochen. Die Trabekel sind nur 200–300 µm dick, weil sie ohne eigene Gefäße per Diffusion aus dem Markraum ernährt werden.', 'S. 41 D b'),
    'medulla-ossium-rubra': S('Medulla ossium rubra', 'rotes Knochenmark', 'Blutbildendes Mark in den Räumen der Spongiosa, z. B. in den Epiphysen.', 'S. 41 D a'),
    'medulla-ossium-flava': S('Medulla ossium flava', 'gelbes Knochenmark (Fettmark)', 'Fettmark in der Markhöhle des Schafts beim Erwachsenen.', 'S. 41 D a'),
    'osteon': S('Osteon', 'Osteon (Havers-System)', 'Baueinheit der Compacta: etwa 1 cm lang, 250–350 µm dick, aus 5–20 konzentrischen Lamellen um einen zentralen Kanal.', 'S. 41 D c–d'),
    'canalis-haversi': S('Canalis centralis (Havers-Kanal)', 'Havers-Kanal', 'Zentraler, überwiegend längs laufender Gefäßkanal eines Osteons.', 'S. 41 D c–d'),
    'canalis-volkmanni': S('Canalis perforans (Volkmann-Kanal)', 'Volkmann-Kanal', 'Quer oder schräg laufender Kanal; verbindet Havers-Kanäle untereinander sowie mit Periost- und Markgefäßen.', 'S. 41 D c'),
    'lamellae': S('Lamellae generales et interstitiales', 'General- und Schaltlamellen', 'Äußere und innere Generallamellen ziehen parallel unter dem Periost bzw. an der Markhöhle entlang; Schaltlamellen sind Reste umgebauter Osteone.', 'S. 41 D c'),
    'periosteum': S('Periosteum', 'Knochenhaut', 'Außen das kollagenreiche Stratum fibrosum, innen die Kambiumschicht mit Osteoblasten; am Knochen über Sharpey-Fasern verankert.', 'S. 41 D e'),
    'fibrae-perforantes': S('Fibrae perforantes (Sharpey-Fasern)', 'Sharpey-Fasern', 'Kollagenfasern, die vom Periost in die Compacta einstrahlen und die Knochenhaut fest verankern.', 'S. 41 D e'),
    'foramen-nutricium': S('Foramen nutricium', 'Ernährungsloch', 'Öffnung im Schaft, durch die A. und V. nutricia in die Markhöhle ziehen.', 'S. 41 D a'),
    'osteoblast': S('Osteoblastus', 'Osteoblast', 'Knochenbildende Zelle, z. B. in der Kambiumschicht des Periosts; legt neue Matrix (zunächst Osteoid) an.', 'S. 41 D e, 17 D'),
    'osteozyt': S('Osteocytus', 'Osteozyt', 'In die Matrix eingemauerter, ehemaliger Osteoblast; steht über feine Fortsätze mit Nachbarzellen in Verbindung.', 'S. 41 D d'),
    'osteoklast': S('Osteoclastus', 'Osteoklast', 'Mehrkernige Abbauzelle („Knochenfresszelle“); liegt in Resorptionsbuchten (Howship-Lakunen).', 'S. 17 D, F'),

    /* 4.2 Knochenverbindungen */
    'synarthrosis': S('Synarthrosis', 'unechtes Gelenk (Haft)', 'Kontinuierliche Verbindung über Bindegewebe, Knorpel oder Knochen ohne Gelenkspalt; höchstens mäßig beweglich.', 'S. 42 A'),
    'syndesmosis': S('Syndesmosis', 'Bandhaft', 'Verbindung durch kollagenes oder elastisches Bindegewebe, z. B. Membrana interossea, Syndesmosis tibiofibularis, Fontanellen, Ligg. flava.', 'S. 42 A, 43 E'),
    'membrana-interossea': S('Membrana interossea', 'Zwischenknochenmembran', 'Straffe Bindegewebsplatte zwischen zwei Röhrenknochen (z. B. Radius und Ulna) – eine Syndesmose.', 'S. 43 E a'),
    'fonticuli': S('Fonticuli cranii', 'Fontanellen', 'Bindegewebige Lücken zwischen den Schädelknochen des Neugeborenen – Syndesmosen.', 'S. 42 A, 43 E c'),
    'gomphosis': S('Gomphosis', 'Einzapfung', 'Sonderform der Syndesmose: der Zahn ist über den Zahnhalteapparat in seiner Alveole verankert.', 'S. 43 E d'),
    'synchondrosis': S('Synchondrosis', 'Knorpelhaft', 'Verbindung durch Knorpel, z. B. Epiphysenfugen vor dem Schluss, Y-Fuge des Hüftbeins, Rippenknorpel.', 'S. 42 A, 43 F'),
    'symphysis': S('Symphysis', 'Symphyse', 'Knorpelhaft, deren Füllgewebe überwiegend aus Faserknorpel besteht: Symphysis pubica und Bandscheiben.', 'S. 42 A, 43 F d'),
    'synostosis': S('Synostosis', 'Knochenhaft', 'Knöcherne Verschmelzung, unbeweglich, z. B. Kreuzbein, Hüftbein, geschlossene Epiphysenfugen.', 'S. 42 A, 43 G'),
    'diarthrosis': S('Diarthrosis', 'echtes Gelenk', 'Diskontinuierliche Verbindung mit Gelenkspalt; eingeteilt nach Form der Gelenkkörper, Zahl der Achsen und Freiheitsgrade.', 'S. 42 A, 44 A'),
    'amphiarthrosis': S('Amphiarthrosis', 'straffes Gelenk', 'Echtes Gelenk, dessen Beweglichkeit durch straffe Bänder fast aufgehoben ist, z. B. Iliosakralgelenk.', 'S. 42 A'),
    'pseudarthrose': S('Pseudarthrosis', 'Falschgelenk', 'Instabile, nicht knöchern verheilte Stelle nach missglückter Frakturheilung.', 'S. 42 B'),
    'ankylose': S('Ankylosis', 'Ankylose', 'Krankhafte knöcherne Versteifung eines echten Gelenks; der Gelenkspalt füllt sich nach Knorpelverlust mit Knochen.', 'S. 42 B, C'),
    'arthrodese': S('Arthrodesis', 'Arthrodese', 'Operative Gelenkversteifung (an der Wirbelsäule: Spondylodese) in Funktionsstellung – Schmerzfreiheit und Stabilität statt Beweglichkeit.', 'S. 42 B, D'),
    'arthroskopie': S('Arthroscopia', 'Gelenkspiegelung', 'Endoskopische Untersuchung eines Gelenks, meist zugleich mit Behandlung (z. B. Bandrekonstruktion, Entfernung freier Gelenkkörper).', 'S. 42 B'),
    'synovektomie': S('Synovectomia', 'Synovektomie', 'Operative Entfernung der Gelenkinnenhaut, z. B. bei chronischer Polyarthritis; die Membran bildet sich danach neu.', 'S. 42 B, 46 A'),

    /* 4.3 Bauelemente echter Gelenke */
    'cavitas-articularis': S('Cavitas articularis', 'Gelenkhöhle', 'Von der Kapsel umschlossener Raum mit Ausbuchtungen (Recessus), gefüllt mit Synovia.', 'S. 44 A'),
    'facies-articularis': S('Facies articularis', 'Gelenkfläche', 'Mit hyalinem Knorpel überzogene Fläche der Gelenkkörper; die Flächen sind durch einen Spalt von wenigen Zehntelmillimetern getrennt.', 'S. 44 A'),
    'capsula-articularis': S('Capsula articularis', 'Gelenkkapsel', 'Allseits geschlossene Hülle aus Membrana fibrosa und Membrana synovialis; bildet die Synovia.', 'S. 44 A, 46 A'),
    'plicae-villi': S('Plicae et villi synoviales', 'Synovialfalten und -zotten', 'Oberflächenvergrößerungen der Kapselinnenseite (Wülste wie Plicae alares, Falten, Zotten).', 'S. 44 A'),
    'meniscus-articularis': S('Meniscus articularis', 'Gelenkmeniskus', 'Sichelförmig, im Querschnitt keilförmig; regelmäßig nur im Kniegelenk. Außen über Kapselgefäße, innen über die Synovia ernährt.', 'S. 44 B a'),
    'discus-articularis': S('Discus articularis', 'Gelenkzwischenscheibe', 'Scheibe aus Bindegewebe und Faserknorpel, die das Gelenk in zwei Kammern teilt: Kiefer-, Sternoklavikular- und proximales Handgelenk.', 'S. 44 B b'),
    'labrum-articulare': S('Labrum articulare', 'Gelenklippe', 'Faserknorpeliger Keil am Pfannenrand von Hüft- und Schultergelenk (Labrum acetabuli bzw. glenoidale); vergrößert die Pfanne.', 'S. 44 B c'),
    'bursa-synovialis': S('Bursa synovialis', 'Schleimbeutel', 'Gelenknaher, mit Synovia gefüllter Beutel; kann mit der Gelenkhöhle verbunden sein.', 'S. 44 A'),
    'ligg-intracapsularia': S('Ligamenta intracapsularia', 'Kapselbänder', 'Bänder in der Membrana fibrosa (z. B. Ligg. iliofemorale, ischiofemorale, pubofemorale) oder in der Subintima (Kreuzbänder); führen und hemmen das Gelenk.', 'S. 45 C'),
    'ligg-extracapsularia': S('Ligamenta extracapsularia', 'kapselferne Bänder', 'Bänder ohne direkten Kontakt zur Kapsel, z. B. Lig. collaterale fibulare des Kniegelenks.', 'S. 45 C'),
    'ligg-cruciata-lage': S('Ligamenta cruciata genus (Lage)', 'Kreuzbänder – Lage', 'Liegen scheinbar in der Gelenkhöhle, sind aber von synovialer Intima überzogen: intrakapsulär, aber extraartikulär.', 'S. 45 C'),
    'synovia': S('Synovia', 'Gelenkflüssigkeit', 'Klar, gelblich und zäh (pH 7,4–7,7); im Kniegelenk nur 3–5 ml. Enthält Hyaluronat, Lubricin, Phospholipide, Plasmabestandteile und wenige Abwehrzellen.', 'S. 45 D'),
    'kontraktur': S('Contractura articularis', 'Gelenkkontraktur', 'Bewegungseinschränkung, weil Bänder und Kapsel bei Ruhigstellung oder Fehlhaltung schrumpfen.', 'S. 45 C'),

    /* 4.4 Gelenkkapsel und Gelenkknorpel */
    'membrana-fibrosa': S('Membrana fibrosa', 'äußere Kapselschicht', 'Straffes kollagenes Bindegewebe, geht ins Periost über und wird oft durch Kapselbänder verstärkt („Wand“).', 'S. 46 A'),
    'membrana-synovialis': S('Membrana synovialis', 'innere Kapselschicht', 'Kleidet die Kapsel innen aus und haftet am Knorpelrand („Tapete“); aus Intima und Subintima, sehr regenerationsfähig.', 'S. 46 A'),
    'synovialozyten-a': S('Synoviocyti A', 'A-Synovialozyten', 'Makrophagenähnliche Deckzellen an der Grenze zur Gelenkhöhle: räumen verbrauchte Synovia, Bakterien und Zelltrümmer ab.', 'S. 46 A'),
    'synovialozyten-b': S('Synoviocyti B', 'B-Synovialozyten', 'Fibroblastenähnliche Zellen unter den A-Zellen: bilden vor allem die Synovia.', 'S. 46 A'),
    'subintima': S('Subintima (Subsynovialis)', 'Subintima', 'Bindegewebe mit Blut- und Lymphgefäßen, Schmerz- und Mechanorezeptoren (Pacini, Ruffini); areolär, adipös oder fibrös gebaut.', 'S. 46 A'),
    'cartilago-articularis': S('Cartilago articularis', 'Gelenkknorpel', 'Meist hyalin, gefäßfrei und ohne Perichondrium, daher kaum regenerationsfähig; 1–2 mm (Finger) bis 5–7 mm (Patella) dick.', 'S. 46 A'),
    'knorpel-faserknorpel': S('Cartilago fibrosa articularis', 'Faserknorpel als Gelenküberzug', 'Ausnahme vom hyalinen Überzug: Kiefer- und Sternoklavikulargelenk tragen Faserknorpel.', 'S. 46 A'),
    'knorpelzonen': S('Zonae cartilaginis I–IV', 'Zonen des Gelenkknorpels', 'Kollagenfibrillen verlaufen arkadenförmig: in Zone IV am Knochen verankert, in III radiär, in II umbiegend, in I tangential zur Oberfläche.', 'S. 46 A a'),
    'chondrozyt': S('Chondrocytus', 'Knorpelzelle', 'Macht nur etwa 5 % des Knorpelvolumens aus; ernährt sich ausschließlich aus der Synovia (Diffusion, Konvektion).', 'S. 46 A'),
    'ezm-knorpel': S('Matrix extracellularis', 'Extrazellulärmatrix des Knorpels', 'Kollagen Typ II, IX und XI, Proteoglykane (v. a. Aggrekan), Glykoproteine wie Chondronektin sowie Wasser mit Kationen.', 'S. 47 B'),
    'kollagen-tripelhelix': S('Tropocollagenum', 'Kollagenmolekül', 'Drei α-Ketten bilden eine rechtsgängige Tripelhelix; Quervernetzung macht die Fibrillen sehr zugfest.', 'S. 47 B'),
    'aggrekan': S('Aggrecanum', 'Aggrekan', 'Wichtigstes Proteoglykan des Gelenkknorpels: „Flaschenbürste“ aus über 100 Glykosaminoglykan-Ketten an einem Hyaluronat-Faden; bindet viel Wasser.', 'S. 47 C'),
    'schwellungsdruck': S('Modellum biphasicum', 'biphasisches viskoelastisches Modell', 'Kollagen begrenzt die Quellung der Proteoglykane auf etwa ein Fünftel; Belastung presst Flüssigkeit heraus, Entlastung saugt sie zurück (Konvektion).', 'S. 47 D'),

    /* 4.5 Arthrose */
    'arthrose': S('Arthrosis deformans', 'Arthrose', 'Degenerative Gelenkerkrankung durch ein Missverhältnis von Belastung und Belastbarkeit des Knorpels; Knorpelschäden sind nicht umkehrbar.', 'S. 48 A'),
    'arthrose-primaer-sekundaer': S('Arthrosis primaria / secundaria', 'primäre und sekundäre Arthrose', 'Primär: keine erkennbare Ursache. Sekundär: Folge ungünstiger Biomechanik, z. B. Dysplasie, Achsfehlstellung, Instabilität, Unfallfolgen.', 'S. 48 A'),
    'arthritis-abgrenzung': S('Arthritis (Abgrenzung)', 'Arthritis', 'Bei der Arthritis geht der Knorpel erst sekundär als Folge einer Entzündung der Gelenkkapsel verloren.', 'S. 48 A'),
    'osteophyten': S('Osteophyta marginalia', 'Randosteophyten', 'Knöcherne Randanbauten, die die Kraft aufnehmende Fläche vergrößern; ab Stadium III.', 'S. 49 D, E'),
    'subchondrale-sklerose': S('Sclerosis subchondralis', 'subchondrale Sklerosierung', 'Verdichtung des Knochens unter dem schwindenden Knorpel; im Röntgenbild hell.', 'S. 49 D, E'),
    'geroellzysten': S('Cystae subchondrales', 'Geröllzysten', 'Resorptionshöhlen im Knochen unter der Gelenkfläche; im Röntgenbild Aufhellungen.', 'S. 49 D, E'),
    'tep': S('Endoprothesis totalis', 'Totalendoprothese (TEP)', 'Ersatz von Gelenkkopf und Pfanne; zementiert sofort belastbar, zementfrei erst nach Wochen, dafür leichter zu wechseln.', 'S. 48 C')
  };

  const einheiten = [
    ['4.1', 'Knöchernes Skelett und Bau eines Röhrenknochens', 40], ['4.2', 'Knochenverbindungen: Übersicht und unechte Gelenke', 42],
    ['4.3', 'Echte Gelenke: Bauelemente, intra- und extraartikuläre Strukturen', 44], ['4.4', 'Echte Gelenke: Gelenkkapsel und hyaliner Gelenkknorpel', 46],
    ['4.5', 'Degenerative Gelenkerkrankungen am Beispiel der Koxarthrose', 48]
  ].map(([nr, titel, seite]) => ({ nr, titel, seite }));

  /* Karteikarten: [Frage, Antwort, Einheit, Seite] */
  const karten = [
    ['Welche sieben Knochentypen werden unterschieden?', 'Lange, kurze, platte, unregelmäßige, lufthaltige Knochen, Sesambeine und akzessorische Knochen.', '4.1', 'S. 40 C'],
    ['Wie entstehen akzessorische Knochen?', 'Meist dadurch, dass einzelne Knochenkerne bei der Verknöcherung nicht miteinander verschmelzen.', '4.1', 'S. 40 C'],
    ['Nenne ein Sesambein und seine Lage.', 'Die Patella – sie ist in die Sehne des M. quadriceps femoris eingelagert.', '4.1', 'S. 40 C'],
    ['Welche Abschnitte hat ein Röhrenknochen?', 'Zwei Epiphysen (Enden), die Diaphyse (Schaft) und Apophysen als Knochenvorsprünge; dazwischen beim Erwachsenen die Epiphysenlinie.', '4.1', 'S. 41 D a'],
    ['Wo liegt rotes, wo gelbes Knochenmark?', 'Rotes, blutbildendes Mark in der Spongiosa (z. B. Epiphysen), Fettmark in der Markhöhle des Schafts.', '4.1', 'S. 41 D a'],
    ['Warum sind Spongiosabälkchen höchstens 200–300 µm dick?', 'Sie haben keine eigenen Gefäße und werden per Diffusion aus dem Markraum ernährt.', '4.1', 'S. 41 D b'],
    ['Beschreibe ein Osteon.', 'Ca. 1 cm lang, 250–350 µm dick, 5–20 konzentrische Lamellen um einen Havers-Kanal; Osteozyten in den Lamellen über Fortsätze verbunden.', '4.1', 'S. 41 D c–d'],
    ['Wie unterscheiden sich Havers- und Volkmann-Kanäle?', 'Havers-Kanäle laufen längs im Zentrum der Osteone; Volkmann-Kanäle laufen quer/schräg und verbinden sie untereinander sowie mit Periost- und Markgefäßen.', '4.1', 'S. 41 D c'],
    ['Wie ist das Periost aufgebaut?', 'Außen Stratum fibrosum, innen die Kambiumschicht mit Osteoblasten; Sharpey-Fasern verankern es im Knochen.', '4.1', 'S. 41 D e'],
    ['Unechte vs. echte Gelenke – der Kernunterschied?', 'Unechte (Synarthrosen) sind kontinuierlich über Gewebe verbunden; echte (Diarthrosen) haben einen Gelenkspalt.', '4.2', 'S. 42 A'],
    ['Welche drei Formen von Synarthrosen gibt es?', 'Syndesmosen (Bandhaften), Synchondrosen (Knorpelhaften, Sonderform Symphyse) und Synostosen (Knochenhaften).', '4.2', 'S. 42 A'],
    ['Nenne fünf Beispiele für Syndesmosen.', 'Membrana interossea, Syndesmosis tibiofibularis, Fontanellen, Gomphosis (Zahn), Ligg. flava/interspinalia/supraspinale.', '4.2', 'S. 43 E'],
    ['Was ist eine Symphyse?', 'Eine Knorpelhaft mit überwiegend Faserknorpel – z. B. Symphysis pubica und die Bandscheiben.', '4.2', 'S. 42 A, 43 F d'],
    ['Nenne drei Synostosen.', 'Kreuzbein (verschmolzene Sakralwirbel), Hüftbein (Ilium + Ischium + Pubis), geschlossene Epiphysenfugen.', '4.2', 'S. 43 G'],
    ['Ankylose, Arthrodese, Pseudarthrose – was ist was?', 'Ankylose: krankhafte knöcherne Gelenkversteifung. Arthrodese: operative Versteifung. Pseudarthrose: Falschgelenk nach missglückter Frakturheilung.', '4.2', 'S. 42 B'],
    ['In welcher Stellung wird bei einer Arthrodese versteift?', 'In Funktionsstellung: am Arm zum Greifen, am Bein zum Stehen und Gehen.', '4.2', 'S. 42 B'],
    ['Welche Bauelemente hat ein echtes Gelenk?', 'Knorpelüberzogene Gelenkflächen, Gelenkspalt und -höhle, Kapsel, Synovia, ggf. Menisken/Disci/Labra, Bänder, Muskeln, Schleimbeutel.', '4.3', 'S. 44 A'],
    ['Wo kommen Disci articulares regelmäßig vor?', 'Im Kiefergelenk, Sternoklavikulargelenk und im proximalen Handgelenk.', '4.3', 'S. 44 B b'],
    ['Wie werden Menisken ernährt?', 'Der äußere, mit der Kapsel verwachsene Teil über Kapselgefäße, der innere faserknorpelige Teil über die Synovia.', '4.3', 'S. 44 B a'],
    ['Wozu dienen intraartikuläre Hilfseinrichtungen?', 'Sie gleichen Inkongruenzen aus, vergrößern die Kraft aufnehmende Fläche und senken so die Knorpelbelastung.', '4.3', 'S. 44 B'],
    ['Liegen die Kreuzbänder in der Gelenkhöhle?', 'Nein – sie sind von synovialer Intima bedeckt, liegen also intrakapsulär, aber extraartikulär.', '4.3', 'S. 45 C'],
    ['Drei Aufgaben der Synovia?', 'Ernährung des gefäßfreien Knorpels, Schmierung der Gelenkflächen, Stoßdämpfung durch Druckverteilung.', '4.3', 'S. 45 D'],
    ['Was ist eine Gelenkkontraktur?', 'Eine Bewegungseinschränkung, weil sich Bänder bei Ruhigstellung oder Fehlhaltung verkürzen.', '4.3', 'S. 45 C'],
    ['Aus welchen Schichten besteht die Gelenkkapsel?', 'Membrana fibrosa („Wand“, straffes Bindegewebe) und Membrana synovialis („Tapete“, mit Intima und Subintima).', '4.4', 'S. 46 A'],
    ['A- vs. B-Synovialozyten?', 'A: makrophagenähnlich, resorbieren und phagozytieren. B: fibroblastenähnlich, produzieren die Synovia.', '4.4', 'S. 46 A'],
    ['Warum regeneriert sich Gelenkknorpel kaum?', 'Er ist gefäßfrei, hat kein Perichondrium und ernährt sich nur aus der Synovia.', '4.4', 'S. 46 A'],
    ['Welche Gelenke sind mit Faserknorpel statt hyalinem Knorpel überzogen?', 'Kiefergelenk und Sternoklavikulargelenk.', '4.4', 'S. 46 A'],
    ['Wie verlaufen die Kollagenfibrillen im Gelenkknorpel?', 'Arkadenförmig: aus Zone IV radiär nach oben (III), umbiegend (II), tangential an der Oberfläche (I) und wieder in die Tiefe.', '4.4', 'S. 46 A a'],
    ['Wie ist Aggrekan aufgebaut?', 'Wie eine Flaschenbürste: zahlreiche Glykosaminoglykan-Ketten an einem zentralen Hyaluronat; viele negative Ladungen binden Kationen und Wasser.', '4.4', 'S. 47 C'],
    ['Wie federt Gelenkknorpel Druck ab?', 'Belastung presst Flüssigkeit aus der Matrix, bis Gegendruck entsteht; bei Entlastung quillt sie wieder auf – dieser Wechsel (Konvektion) ernährt zugleich den Knorpel.', '4.4', 'S. 47 D'],
    ['Hauptursache der Arthrose?', 'Ein Missverhältnis zwischen Belastung und Belastbarkeit des Gelenkknorpels.', '4.5', 'S. 48 A'],
    ['Vier typische Röntgenzeichen der Arthrose?', 'Gelenkspaltverschmälerung, subchondrale Sklerosierung, Geröllzysten, Osteophyten.', '4.5', 'S. 49 E'],
    ['Zementierte vs. zementfreie Hüft-TEP?', 'Zementiert: sofort belastbar. Zementfrei: braucht Wochen zum Einwachsen, ist aber leichter zu wechseln.', '4.5', 'S. 48 C']
  ].map(([f, a, e, ref], i) => ({ id: 'k' + i, f, a, e, ref }));

  /* Prüfungsfragen: [Frage, [Optionen], richtigerIndex, Erklärung, Einheit, Seite] */
  const fragen = [
    ['Zu welchem Knochentyp gehört das Schulterblatt?', ['Os breve', 'Os planum', 'Os pneumaticum', 'Os sesamoideum'], 1, 'Scapula, Darmbein und Schädeldach sind platte Knochen.', '4.1', 'S. 40 C'],
    ['Welche Aussage zur Spongiosa trifft zu?', ['Sie enthält Osteone mit Havers-Kanälen', 'Ihre Bälkchen werden per Diffusion ernährt', 'Sie liegt vor allem im Schaft', 'Sie enthält nur Fettmark'], 1, 'Die Trabekel haben keine eigenen Gefäße; deshalb bleiben sie dünn.', '4.1', 'S. 41 D b'],
    ['Wie viele Lamellen umgeben den Havers-Kanal eines Osteons etwa?', ['1–2', '5–20', '50–100', 'über 200'], 1, 'Etwa 5–20 konzentrische Lamellen.', '4.1', 'S. 41 D d'],
    ['Was verbinden die Volkmann-Kanäle?', ['Osteozyten untereinander', 'Havers-Kanäle untereinander und mit Periost- und Markgefäßen', 'Epiphyse und Diaphyse', 'Gelenkknorpel und Knochen'], 1, 'Sie laufen quer bzw. schräg zur Längsachse.', '4.1', 'S. 41 D c'],
    ['Welche Struktur verankert das Periost im Knochen?', ['Sharpey-Fasern', 'Ligg. intracapsularia', 'Volkmann-Kanäle', 'Generallamellen'], 0, 'Kollagenfasern strahlen vom Periost in die Compacta ein.', '4.1', 'S. 41 D e'],
    ['Welche Verbindung ist eine Syndesmose?', ['Symphysis pubica', 'Membrana interossea antebrachii', 'Epiphysenfuge vor dem Schluss', 'Os sacrum'], 1, 'Bandhaft zwischen Radius und Ulna.', '4.2', 'S. 43 E a'],
    ['Die Gomphosis ist eine …', ['Synchondrose', 'Synostose', 'Syndesmose', 'Diarthrose'], 2, 'Die Einzapfung des Zahns ist eine Sonderform der Bandhaft.', '4.2', 'S. 43 E d'],
    ['Woraus besteht das Füllgewebe einer Symphyse überwiegend?', ['hyalinem Knorpel', 'Faserknorpel', 'elastischem Knorpel', 'straffem Bindegewebe'], 1, 'Symphysen sind Knorpelhaften aus vorwiegend Faserknorpel.', '4.2', 'S. 42 A'],
    ['Das Iliosakralgelenk ist funktionell eine …', ['Synostose', 'Amphiarthrose', 'Syndesmose', 'Symphyse'], 1, 'Ein echtes, aber durch Bänder sehr straffes Gelenk.', '4.2', 'S. 42 A'],
    ['Was bezeichnet „Ankylose“?', ['operative Gelenkversteifung', 'krankhafte knöcherne Gelenkversteifung', 'Falschgelenk nach Fraktur', 'Gelenkspiegelung'], 1, 'Nach vollständigem Knorpelabbau wächst der Gelenkspalt knöchern zu.', '4.2', 'S. 42 B, C'],
    ['In welchem Gelenk gibt es regelmäßig einen Discus articularis?', ['Hüftgelenk', 'Schultergelenk', 'Sternoklavikulargelenk', 'Ellenbogengelenk'], 2, 'Disci: Kiefer-, Sternoklavikular- und proximales Handgelenk.', '4.3', 'S. 44 B b'],
    ['Wo liegt ein Labrum articulare?', ['am Tibiaplateau', 'am Rand der Hüft- und Schulterpfanne', 'im Kiefergelenk', 'zwischen den Wirbelkörpern'], 1, 'Labrum acetabuli und Labrum glenoidale vergrößern die Pfannen.', '4.3', 'S. 44 B c'],
    ['Das Lig. collaterale fibulare des Kniegelenks ist ein …', ['intrakapsuläres Band in der Membrana fibrosa', 'subintimales Band', 'extrakapsuläres Band', 'intraartikuläres Band'], 2, 'Es hat keinen direkten Kontakt zur Gelenkkapsel.', '4.3', 'S. 45 C'],
    ['Wie viel Synovia enthält ein Kniegelenk etwa?', ['unter 0,5 ml', '3–5 ml', '20–30 ml', '100 ml'], 1, 'Selbst große Gelenke enthalten nur wenige Milliliter.', '4.3', 'S. 45 D'],
    ['Welche Zellen bilden vor allem die Synovialflüssigkeit?', ['A-Synovialozyten', 'B-Synovialozyten', 'Chondrozyten', 'Osteoblasten'], 1, 'Die fibroblastenähnlichen B-Zellen sezernieren; die A-Zellen resorbieren.', '4.4', 'S. 46 A'],
    ['Wodurch wird hyaliner Gelenkknorpel ernährt?', ['eigene Kapillaren', 'Perichondrium', 'Synovia per Diffusion und Konvektion', 'Markraumgefäße'], 2, 'Er ist gefäßfrei und hat kein Perichondrium.', '4.4', 'S. 46 A, 47 D'],
    ['Welcher Kollagentyp überwiegt im hyalinen Gelenkknorpel?', ['Typ I', 'Typ II', 'Typ III', 'Typ IV'], 1, 'Vor allem Kollagen II, daneben IX und XI.', '4.4', 'S. 47 B'],
    ['Was bewirken die negativen Ladungen der Proteoglykane?', ['Sie lösen Kollagen auf', 'Sie binden Kationen und damit Wasser', 'Sie verkalken den Knorpel', 'Sie leiten Schmerz'], 1, 'Daraus entsteht der Schwellungsdruck des Knorpels.', '4.4', 'S. 47 C–D'],
    ['Welche Arthrose betrifft das Daumensattelgelenk?', ['Heberden-Arthrose', 'Bouchard-Arthrose', 'Rhizarthrose', 'Omarthrose'], 2, 'Heberden: Fingerendgelenke, Bouchard: Mittelgelenke, Omarthrose: Schulter.', '4.5', 'S. 48 B'],
    ['Was gehört NICHT zu den typischen Röntgenzeichen der Arthrose?', ['Gelenkspaltverschmälerung', 'subchondrale Sklerosierung', 'Gelenkspaltverbreiterung', 'Osteophyten'], 2, 'Der Spalt wird durch Knorpelverlust schmaler, nicht breiter.', '4.5', 'S. 49 E'],
    ['Was spricht für eine zementierte TEP?', ['einfacherer Prothesenwechsel', 'sofortige Belastbarkeit', 'kein Infektionsrisiko', 'hält garantiert lebenslang'], 1, 'Die zementfreie braucht Wochen zum Einwachsen.', '4.5', 'S. 48 C']
  ].map(([f, o, r, x, e, ref], i) => ({ id: 'f' + i, f, o, r, x, e, ref }));

  /* Sortieren: Verbindung → Art */
  const sortieren = {
    titel: 'Welche Art von Knochenverbindung?', ref: 'S. 42 A, 43 E–G',
    kategorien: ['Syndesmose', 'Synchondrose / Symphyse', 'Synostose', 'echtes Gelenk'],
    items: [
      ['Membrana interossea antebrachii', 0], ['Fontanellen des Neugeborenen', 0], ['Zahn in der Alveole (Gomphosis)', 0], ['Syndesmosis tibiofibularis', 0], ['Lig. flavum', 0],
      ['Epiphysenfuge vor dem Schluss', 1], ['Y-Fuge des Hüftbeins beim Kind', 1], ['Rippenknorpel', 1], ['Symphysis pubica', 1], ['Bandscheibe', 1],
      ['Os sacrum beim Erwachsenen', 2], ['Os coxae beim Erwachsenen', 2], ['geschlossene Epiphysenfuge', 2],
      ['Hüftgelenk', 3], ['Kniegelenk', 3], ['Iliosakralgelenk (Amphiarthrose)', 3]
    ].map(([t, k], i) => ({ id: 's' + i, t, k }))
  };

  /* Lückentabellen */
  const tabellen = [
    {
      id: 'knochentypen', titel: 'Knochentypen', ref: 'S. 40 C', einheit: '4.1',
      spalten: ['Fachbegriff', 'Beispiel'],
      zeilen: [['lange Knochen', ['Ossa longa', 'Femur']], ['kurze Knochen', ['Ossa brevia', 'Handwurzel']], ['platte Knochen', ['Ossa plana', 'Scapula']],
        ['lufthaltige Knochen', ['Ossa pneumatica', 'Maxilla']], ['Sesambeine', ['Ossa sesamoidea', 'Patella']]],
      fuss: 'Weitere Beispiele zählen inhaltlich ebenso (Prüfen vergleicht aber mit dem hinterlegten Wort).'
    },
    {
      id: 'gelenkzahlen', titel: 'Zahlen zu Gelenk und Knorpel', ref: 'S. 45 D, 46 A', einheit: '4.3',
      spalten: ['Wert'],
      zeilen: [['Synovia im Kniegelenk (ml)', ['3–5']], ['pH-Wert der Synovia', ['7,4–7,7']], ['Abwehrzellen in der Synovia (pro µl)', ['60–150']],
        ['Knorpeldicke Fingergelenk (mm)', ['1–2']], ['Knorpeldicke Patella (mm)', ['5–7']], ['Volumenanteil der Chondrozyten (%)', ['5']]],
      fuss: 'Bereiche mit Bindestrich eingeben, z. B. 3-5.'
    },
    {
      id: 'arthrosen', titel: 'Arthrose: Bezeichnung nach Gelenk', ref: 'S. 48 B', einheit: '4.5',
      spalten: ['Bezeichnung'],
      zeilen: [['Schultergelenk', ['Omarthrose']], ['Hüftgelenk', ['Koxarthrose']], ['Wirbelgelenke', ['Spondylarthrose']],
        ['Daumensattelgelenk', ['Rhizarthrose']], ['Fingermittelgelenke (PIP)', ['Bouchard-Arthrose']], ['Fingerendgelenke (DIP)', ['Heberden-Arthrose']]],
      fuss: 'PIP = proximale, DIP = distale Interphalangealgelenke.'
    }
  ];

  (window.KAPITEL_LISTE = window.KAPITEL_LISTE || []).push({
    id: 'allg-knochen', start: 40,
    band: 'Allgemeine Anatomie und Bewegungssystem',
    teil: 'Allgemeine Anatomie',
    titel: 'Knochen und Knochenverbindungen',
    seiten: 'S. 40–49',
    intro: 'Knochentypen und Bau des Röhrenknochens, unechte und echte Gelenke, Gelenkkapsel, Gelenkknorpel und Synovia sowie die Arthrose.',
    einheiten, strukturen, karten, fragen, sortieren, tabellen,
    tafeln: []
  });
})();
