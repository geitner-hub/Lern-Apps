/* ═══════════════════════════════════════════════════════
   Lernwelt – apps/anatomie/data/anatomie-entwicklung-inhalte.js
   Allgemeine Anatomie · Kapitel 1: Stammes- und Entwicklungsgeschichte (Prometheus S. 2–7 und 12–21)
   Schwerpunkt Skelett: Knochenentwicklung, Ossifikation, Gelenkentwicklung, Extremitäten.
   Seitenangaben = Buchseiten, Buchstabe = Abbildung/Tabelle. Alle Texte eigene Formulierungen.
   ═══════════════════════════════════════════════════════ */
(function () {
  const S = (lat, de, info, ref) => ({ lat, de, info, ref });

  const strukturen = {
    /* 1.1 Stammesgeschichte */
    'chordata': S('Chordata', 'Chordatiere', 'Stamm mit rund 50 000 Arten; Unterstämme: Wirbellose (Manteltiere, Schädellose) und Wirbeltiere.', 'S. 2 A'),
    'chorda-dorsalis': S('Chorda dorsalis', 'Rückensaite', 'Achsenskelett der Chordaten. Beim Menschen nur embryonal angelegt; ein Rest steckt im Nucleus pulposus. Aus Resten können Chordome entstehen.', 'S. 3 D'),
    'branchiostoma': S('Branchiostoma lanceolatum', 'Lanzettfischchen', 'Schädelloser Chordat; gilt als Modell für den Grundbauplan der Wirbeltiere.', 'S. 3 D'),
    'chordatenmerkmale': S('Characteres chordatorum', 'Chordatenmerkmale', 'Chorda dorsalis, dorsales Neuralrohr, segmentierte Muskulatur, Kiemendarm, geschlossener Kreislauf, Schwanz hinter dem After.', 'S. 3 G'),
    'wirbeltiermerkmale': S('Characteres vertebratorum', 'Wirbeltiermerkmale', 'u. a. Kopfbildung (Zephalisation), Wirbelsäule statt Chorda, meist zwei Extremitätenpaare, Neuralleiste, ventrales gekammertes Herz.', 'S. 3 H'),
    'haemalboegen': S('Arcus haemales', 'Hämalbögen', 'Ventrale Wirbelbögen der Fische: im Schwanz Kanal für große Gefäße, im Rumpf Träger der Rippen.', 'S. 3 E'),
    'schlundboegen': S('Arcus pharyngei', 'Schlund-/Kiemenbögen', 'Metamer angelegte Bögen der Kopf-Hals-Region; liefern Material für Kiefer, Mittelohr, Zungenbein, Kehlkopf, mimische Muskulatur und Schlunddarm.', 'S. 2 B, C'),
    'biogenetische-grundregel': S('Regula biogenetica', 'biogenetische Grundregel', 'Haeckels Idee: Die Keimesentwicklung wiederholt in Kürze die Stammesentwicklung – gestützt durch die Ähnlichkeit früher Wirbeltierembryonen.', 'S. 2 B'),
    'amnionei': S('Ovum amnioticum', 'amniotisches Ei', 'Embryo entwickelt sich in flüssigkeitsgefüllter Amnionhöhle; ermöglichte Reptilien, Vögeln und Säugern ein Leben ganz an Land.', 'S. 2 A'),

    /* 1.2 Frühentwicklung */
    'ontogenese': S('Ontogenesis', 'Entwicklungsgeschichte', 'Individualentwicklung mit Histogenese (Gewebe), Organogenese (Organe) und Morphogenese (Gestalt).', 'S. 4'),
    'carnegie-stadien': S('Stadia Carnegie', 'Carnegie-Stadien', '23 Stadien für Frühentwicklung und Embryonalperiode, definiert über Befruchtungsalter, Größe (ab Woche 5 als Scheitel-Steiß-Länge) und Entwicklungsstand.', 'S. 4 A, C'),
    'embryonalperiode': S('Periodus embryonalis', 'Embryonalperiode', '4.–8. Woche: Abfaltung, Achsenorgane, Organogenese – Phase höchster Empfindlichkeit gegenüber Teratogenen.', 'S. 4 C, D'),
    'fetalperiode': S('Periodus fetalis', 'Fetalperiode', 'Ab der 9. Woche: Organwachstum und funktionelle Reifung; Empfindlichkeit für Fehlbildungen nimmt ab.', 'S. 4 B–D'),
    'meiose': S('Meiosis', 'Reifeteilung', 'Zwei Teilungen halbieren den Chromosomensatz und mischen das Erbgut neu; aus einer Oozyte entstehen eine Eizelle und drei Polkörperchen.', 'S. 5 E'),
    'befruchtung': S('Fertilisatio', 'Befruchtung', 'Spermium durchdringt Corona radiata, Akrosom löst sich und verdaut die Zona pellucida, dann verschmelzen die Membranen.', 'S. 5 F'),
    'blastozyste': S('Blastocystis', 'Blastozyste', 'Bläschenstadium (4.–5. Tag) mit Embryoblast (innere Zellmasse) und Trophoblast; Implantation ab dem 5.–6. Tag.', 'S. 5 G, H'),
    'morula': S('Morula', 'Maulbeerkeim', 'Zellhaufen am 3. Tag nach der Befruchtung, noch im Eileiter.', 'S. 5 H'),

    /* 1.3 Gastrulation, Neurulation, Somiten */
    'gastrulation': S('Gastrulatio', 'Gastrulation', 'Zu Beginn der 3. Woche: aus der zweiblättrigen wird die dreiblättrige Keimscheibe (Ekto-, Meso-, Endoderm); die Körperachsen werden festgelegt.', 'S. 6 A'),
    'primitivstreifen': S('Linea primitiva', 'Primitivstreifen', 'Rinne im Epiblast, über die Mesodermzellen zwischen die Keimblätter einwandern; am kranialen Ende der Primitivknoten.', 'S. 6 A b–d'),
    'chordafortsatz': S('Processus notochordalis', 'Chordafortsatz', 'Wächst vom Primitivknoten nach kranial bis zur Oropharyngealmembran; Vorstufe der Chorda.', 'S. 6 A b–c'),
    'neurulation': S('Neurulatio', 'Neurulation', 'Unter dem Einfluss der Chorda trennt sich das Neuroektoderm vom Oberflächenektoderm; Neuralplatte → Neuralrinne → Neuralrohr (ab Tag 19–22).', 'S. 6 B'),
    'neuralleiste': S('Crista neuralis', 'Neuralleiste', 'Auswandernde Zellen am Rand des Neuralrohrs; bilden u. a. Spinalganglien, periphere Glia, Nebennierenmark, Pigmentzellen.', 'S. 6 B, 7 D'),
    'somit': S('Somitus', 'Somit (Ursegment)', 'Ab Tag 20 entstehen paarige Somiten, bis Tag 30 etwa 34–35 Paare; jeder gliedert sich in Dermatom, Myotom und Sklerotom.', 'S. 7 C'),
    'sklerotom': S('Sclerotomus', 'Sklerotom', 'Wandert Ende der 4. Woche zur Chorda und bildet die Anlage von Wirbelkörper, -bogen und Fortsätzen.', 'S. 7 C'),
    'myotom': S('Myotomus', 'Myotom', 'Muskelanlage; dorsal Epimer (epaxone, autochthone Rückenmuskulatur), ventral Hypomer (hypaxone Muskulatur von Leibeswand und Extremitäten).', 'S. 7 C'),
    'dermatom-embryo': S('Dermatomus', 'Dermatom (embryonal)', 'Liefert Dermis und Subcutis des Rückens.', 'S. 7 C'),
    'ramus-dorsalis-ventralis': S('Ramus dorsalis / ventralis n. spinalis', 'Spinalnervenäste', 'Der R. dorsalis versorgt die epaxone, der R. ventralis die hypaxone Muskulatur.', 'S. 7 C'),
    'ektoderm': S('Ectodermum', 'Ektoderm', 'Oberflächenektoderm: Epidermis, Haare, Nägel, Hautdrüsen, Zahnschmelz; Neuroektoderm: ZNS; Plakoden: Linse, Innenohr, Riechepithel.', 'S. 7 D'),
    'mesoderm': S('Mesodermum', 'Mesoderm', 'Paraxial: Wirbelsäule, Rippen, Skelettmuskulatur; intermediär: Nieren, Keimdrüsen; Seitenplatten: Herz, Gefäße, Blut, Sternum, Extremitätenskelett.', 'S. 7 D'),
    'endoderm': S('Endodermum', 'Endoderm', 'Epithel von Darmrohr, Atemwegen, Verdauungsdrüsen, Harnblase sowie Thymus, Schild- und Nebenschilddrüsen.', 'S. 7 D'),
    'mesenchym': S('Mesenchyma', 'Mesenchym', 'Embryonales Bindegewebe, überwiegend aus dem Mesoderm; daraus entstehen Knorpel und Knochen.', 'S. 14 A'),

    /* 1.6 Kreislauf */
    'schlundbogenarterien': S('Arteriae arcuum pharyngeorum', 'Schlundbogenarterien', '1., 2. und 5. bilden sich zurück; 3. → A. carotis communis und Anfang der A. carotis interna; linke 4. → Aortenbogen; rechte 4. → Truncus brachiocephalicus + A. subclavia dextra; 6. → Truncus pulmonalis + Ductus arteriosus.', 'S. 12 B'),
    'ductus-arteriosus': S('Ductus arteriosus', 'Ductus arteriosus (Botalli)', 'Aus der 6. Schlundbogenarterie; nach der Geburt verschlossen als Lig. arteriosum.', 'S. 12 B'),
    'kardinalvenen': S('Venae cardinales', 'Kardinalvenen', 'Embryonale Rumpfvenen; aus ihnen und Supra-, Sub- und Sakrokardinalvenen entstehen V. cava superior, Azygossystem und Abschnitte der V. cava inferior.', 'S. 13 C'),
    'ductus-venosus': S('Ductus venosus', 'Ductus venosus', 'Kurzschluss, über den Nabelvenenblut an der Leber vorbei zur V. cava inferior fließt.', 'S. 13 D'),

    /* 1.7 Skelett- und Gelenkentwicklung */
    'primordialskelett': S('Skeleton primordiale', 'Primordialskelett', 'Knorpeliges Miniaturmodell des Skeletts aus hyalinem Knorpel; wird später durch Knochen ersetzt.', 'S. 14 A'),
    'chondrale-osteogenese': S('Osteogenesis chondralis', 'chondrale (indirekte) Osteogenese', 'Knochen entsteht über eine Knorpelvorstufe; gilt für den größten Teil des Skeletts (Rumpf, Extremitäten, Schädelbasis).', 'S. 14 A, 17 E'),
    'desmale-osteogenese': S('Osteogenesis desmalis', 'desmale (direkte) Osteogenese', 'Mesenchymzellen werden direkt zu Osteoblasten; Schädeldach, Teile des Gesichtsschädels und Schlüsselbein.', 'S. 14 A, 17 E'),
    'perichondrale-ossifikation': S('Ossificatio perichondralis', 'perichondrale Ossifikation', 'Knochenmanschette um die Diaphyse, direkt aus dem Mesenchym gebildet; sorgt für das Dickenwachstum (appositionell).', 'S. 14 A, 16 A'),
    'enchondrale-ossifikation': S('Ossificatio enchondralis', 'enchondrale Ossifikation', 'Knochenbildung im Inneren der Knorpelanlage; sorgt über die Epiphysenfugen für das Längenwachstum (interstitiell).', 'S. 14 A, 17 E'),
    'primaerer-knochenkern': S('Centrum ossificationis primarium', 'primärer Knochenkern', 'Entsteht fetal in der Diaphyse; bis zur 12. Woche in allen Röhrenknochen vorhanden.', 'S. 14 A, 18 A'),
    'sekundaerer-knochenkern': S('Centrum ossificationis secundarium', 'sekundärer Knochenkern', 'Entsteht meist nach der Geburt in Epi- und Apophysen; schon bei Geburt vorhanden: distale Femur- und proximale Tibiaepiphyse.', 'S. 14 A, 18 A'),
    'extremitaetenknospe': S('Gemma membri', 'Extremitätenknospe', 'Ende der 4. Woche paddelförmig; mesenchymaler Kern mit ektodermaler Hülle und apikaler Randleiste.', 'S. 14 B'),
    'syndaktylie': S('Syndactylia', 'Syndaktylie', 'Verschmelzung von Fingern oder Zehen, wenn die interdigitale Apoptose ausbleibt.', 'S. 14 B'),
    'amelie-meromelie': S('Amelia / Meromelia', 'Amelie und Meromelie', 'Amelie: Gliedmaße fehlt ganz; Meromelie: nur Teile fehlen.', 'S. 14 B'),
    'achondroplasie': S('Achondroplasia', 'Achondroplasie', 'Erbliche Störung der enchondralen Ossifikation: kurze Gliedmaßen, relativ großer Schädel; desmale Knochenbildung bleibt normal.', 'S. 14 B'),
    'gelenkzwischenzone': S('Zona interzonalis', 'Gelenkzwischenzone', 'Ab Woche 6 verdichtete Zone dreier Schichten; ab Woche 8 entsteht durch Apoptose der Gelenkspalt; bis Woche 12 ist die Gelenkentwicklung abgeschlossen.', 'S. 15 C'),
    'gelenk-abgliederung': S('Articulatio per segmentationem', 'Gelenkbildung durch Abgliederung', 'Häufigster Weg: Spaltbildung in einer zunächst einheitlichen Skelettanlage (z. B. Hüft-, Schulter-, Ellenbogengelenk).', 'S. 15 C'),
    'gelenk-anlagerung': S('Articulatio per appositionem', 'Gelenkbildung durch Anlagerung', 'Zwei getrennte Anlagen wachsen aufeinander zu (Kiefer-, Sternoklavikular-, Iliosakralgelenk); typisch mit Discus, außer im ISG.', 'S. 15 C'),

    /* 1.8 Knochenentwicklung und Umbau */
    'epiphysenfuge': S('Lamina epiphysialis', 'Epiphysenfuge (Wachstumsfuge)', 'Knorpelplatte zwischen Epi- und Metaphyse für das Längenwachstum; schließt bei den meisten Röhrenknochen zwischen 18 und 23 Jahren.', 'S. 16 A–B'),
    'saeulenknorpel': S('Zona proliferativa', 'Säulenknorpelzone', 'Proliferationszone der Wachstumsfuge, in der sich die Chondrozyten in Säulen teilen.', 'S. 16 B b, C'),
    'blasenknorpel': S('Zona hypertrophica', 'Blasenknorpelzone', 'Hypertrophe Chondrozyten; die Längssepten der Matrix mineralisieren, danach Eröffnung durch Gefäße.', 'S. 16 B b, C'),
    'geflechtknochen': S('Os membranaceum reticulofibrosum', 'Geflechtknochen', 'Unreifer, zuerst gebildeter Knochen; wird beim Umbau durch Lamellenknochen ersetzt.', 'S. 16, 17 D'),
    'remodelling': S('Remodelling ossis', 'Knochenumbau', 'Lebenslanger Umbau – beim Erwachsenen etwa 10 % des Skeletts pro Jahr; dient Anpassung, Reparatur von Mikroschäden und Calciumbereitstellung.', 'S. 16'),
    'osteoid': S('Osteoidum', 'Osteoid', 'Noch unverkalkte Knochenmatrix, von Osteoblasten abgelagert.', 'S. 17 D, F'),
    'howship-lakune': S('Lacuna resorptionis (Howship)', 'Howship-Lakune', 'Resorptionsbucht, in der ein Osteoklast Knochen abbaut.', 'S. 17 F'),
    'osteon-entwicklung': S('Osteogenesis osteonis', 'Entwicklung eines Osteons', 'Osteoklasten bohren mit einem Gefäß einen Resorptionskanal; dahinter bauen Osteoblasten die Lamellen konzentrisch auf.', 'S. 17 D'),

    /* 1.9 Ossifikation der Extremitäten */
    'skelettalter': S('Aetas ossea', 'Skelettalter (Knochenalter)', 'Aus dem Auftreten der Knochenkerne ablesbar; zeigt die biologische Reife. Geröntgt wird die linke bzw. Nicht-Gebrauchshand.', 'S. 18 A, 19'),
    'handwurzel-ossifikation': S('Ossificatio carpi', 'Verknöcherung der Handwurzel', 'Über etwa neun Jahre: zuerst Os capitatum (1. Lebensjahr), zuletzt Os pisiforme (ca. 9. Jahr).', 'S. 18 B, 19'),
    'synostosierung': S('Synostosis laminae epiphysialis', 'Fugenschluss', 'Mit der knöchernen Überbrückung der Epiphysenfuge endet das Längenwachstum; danach wächst der Knochen nur noch appositionell.', 'S. 18 A'),

    /* 1.10 Bauplan der Extremitäten */
    'stylopodium': S('Stylopodium', 'Stylopodium', 'Proximales Extremitätensegment aus einem Knochen: Humerus bzw. Femur.', 'S. 20 A–B'),
    'zeugopodium': S('Zeugopodium', 'Zeugopodium', 'Mittleres Segment aus zwei Knochen: Radius und Ulna bzw. Tibia und Fibula.', 'S. 20 A–B'),
    'autopodium': S('Autopodium', 'Autopodium', 'Hand bzw. Fuß; gegliedert in Basi-, Meta- und Acropodium.', 'S. 20 A, C'),
    'praeaxial-postaxial': S('Pars praeaxialis / postaxialis', 'prä- und postaxial', 'Am Arm: Radius und Strahlen 1–3 präaxial (kranial), Ulna und Strahlen 4–5 postaxial (kaudal).', 'S. 14 B'),
    'extremitaetenrotation': S('Rotatio membrorum', 'Rotation der Gliedmaßen', 'Bei den Säuger-Vorfahren drehte sich das Bein nach vorn (Knie kopfwärts), der Arm nach hinten (Ellenbogen schwanzwärts).', 'S. 21 E'),
    'pronation-unterarm': S('Pronatio antebrachii', 'Pronationsstellung des Unterarms', 'Damit die Hand trotz rückwärts zeigendem Ellenbogen mit den Fingern nach vorn aufsetzt, überkreuzen sich Radius und Ulna.', 'S. 21 F'),
    'extensoren-bein': S('Extensores membri inferioris', 'Streckerlage am Bein', 'Durch die Vorwärtsdrehung liegen die genetisch dorsalen Strecker am Bein vorn – daher dort besser „vorn/hinten“ statt „ventral/dorsal“.', 'S. 21 F')
  };

  const einheiten = [
    ['1.1', 'Stammesgeschichte des Menschen', 2], ['1.2', 'Entwicklungsgeschichte: Überblick, Befruchtung, früheste Stadien', 4],
    ['1.3', 'Gastrulation, Neurulation und Somitenbildung', 6], ['1.6', 'Frühembryonaler Kreislauf und Gefäßentwicklung', 12],
    ['1.7', 'Entwicklung des Skelettsystems: Primordialskelett, Extremitäten, Gelenke', 14], ['1.8', 'Knochenentwicklung und Knochenumbau', 16],
    ['1.9', 'Ossifikation der Extremitäten', 18], ['1.10', 'Bauplan und Stellung der Extremitäten', 20]
  ].map(([nr, titel, seite]) => ({ nr, titel, seite }));

  const karten = [
    ['Welche Merkmale haben alle Chordaten?', 'Chorda dorsalis, dorsales Neuralrohr, segmentierte Muskulatur, Kiemendarm, geschlossener Kreislauf und ein Schwanz hinter dem After.', '1.1', 'S. 3 G'],
    ['Wo findet sich beim Erwachsenen ein Rest der Chorda dorsalis?', 'Im Nucleus pulposus der Bandscheiben.', '1.1', 'S. 3 D'],
    ['Was liefern die Schlundbögen?', 'Material für Kiefer, Mittelohr, Zungenbein, Kehlkopf, die zugehörige Gesichtsmuskulatur und den Schlunddarm.', '1.1', 'S. 2 C'],
    ['Wie gliedert man die Entwicklung zeitlich?', '1.–3. Woche Frühentwicklung, 4.–8. Woche Embryonalperiode, ab 9. Woche Fetalperiode.', '1.2', 'S. 4 C'],
    ['Wann ist der Keim am empfindlichsten für Teratogene?', 'In der Embryonalperiode (4.–8. Woche), weil jedes Organsystem dann seine sensible Phase hat.', '1.2', 'S. 4 D'],
    ['Was entsteht aus einer primären Oozyte durch die Meiose?', 'Eine reife Eizelle und drei Polkörperchen, alle haploid (22 X).', '1.2', 'S. 5 E'],
    ['Was geschieht am 5.–6. Tag nach der Befruchtung?', 'Die Blastozyste beginnt sich in die Uterusschleimhaut einzunisten.', '1.2', 'S. 5 G–H'],
    ['Was ist das Ergebnis der Gastrulation?', 'Die dreiblättrige Keimscheibe aus Ekto-, Meso- und Endoderm; außerdem sind alle Körperachsen festgelegt.', '1.3', 'S. 6 A'],
    ['In welche drei Teile gliedert sich ein Somit?', 'Dermatom (Haut), Myotom (Muskel), Sklerotom (Wirbel).', '1.3', 'S. 7 C'],
    ['Welcher Spinalnervenast versorgt die autochthone Rückenmuskulatur?', 'Der R. dorsalis (epaxone Muskulatur); der R. ventralis versorgt die hypaxone Muskulatur.', '1.3', 'S. 7 C'],
    ['Was bildet die Neuralleiste?', 'u. a. Spinal- und autonome Ganglien, periphere Glia, Nebennierenmark, Pigmentzellen, im Kopf auch Knochen und Bindegewebe.', '1.3', 'S. 7 D'],
    ['Was wird aus der linken 4. Schlundbogenarterie, was aus der 6.?', 'Links 4.: Aortenbogen. 6.: Truncus pulmonalis und Ductus arteriosus.', '1.6', 'S. 12 B'],
    ['Woraus entsteht die A. subclavia sinistra?', 'Aus der 7. Segmentarterie.', '1.6', 'S. 12 B'],
    ['Was ist das Primordialskelett?', 'Ein knorpeliges Modell des Skeletts aus hyalinem Knorpel, das später durch Knochen ersetzt wird.', '1.7', 'S. 14 A'],
    ['Welche Knochen entstehen desmal?', 'Schädeldach, Teile des Gesichtsschädels und die Clavicula; außerdem die perichondrale Knochenmanschette der Röhrenknochen.', '1.7', 'S. 14 A, 17 E'],
    ['Welche Epiphysenkerne sind bei der Geburt schon vorhanden?', 'Distale Femur- und proximale Tibiaepiphyse (Reifezeichen).', '1.7', 'S. 14 A'],
    ['Was ist Achondroplasie?', 'Eine erbliche Störung der enchondralen Ossifikation mit kurzen Gliedmaßen und relativ großem Schädel; desmale Knochen wachsen normal.', '1.7', 'S. 14 B'],
    ['Wie entsteht ein Gelenk – zwei Wege?', 'Meist durch Abgliederung (Spalt in einer Anlage), selten durch Anlagerung zweier Anlagen (Kiefer-, Sternoklavikular-, Iliosakralgelenk).', '1.7', 'S. 15 C'],
    ['Wann ist die Gelenkentwicklung abgeschlossen?', 'Am Ende der 12. Woche; der Gelenkspalt entsteht um die 8. Woche durch Apoptose.', '1.7', 'S. 15 C'],
    ['Osteogenese vs. Ossifikation?', 'Osteogenese = Bildung eines einzelnen Knochens. Ossifikation = Bildung von Knochengewebe.', '1.8', 'S. 16 A'],
    ['Wofür sorgen perichondrale und enchondrale Ossifikation?', 'Perichondral: Dickenwachstum (appositionell). Enchondral: Längenwachstum (interstitiell) über die Epiphysenfugen.', '1.8', 'S. 17 E'],
    ['Wann schließen die meisten Epiphysenfugen?', 'Etwa zwischen 18 und 23 Jahren.', '1.8', 'S. 16 A'],
    ['Wie viel Skelett wird beim Erwachsenen jährlich umgebaut?', 'Etwa 10 % – das ganze Skelett also in rund zehn Jahren.', '1.8', 'S. 16'],
    ['Wie entsteht ein Osteon?', 'Osteoklasten bohren zusammen mit einem Gefäß einen Resorptionskanal; Osteoblasten bauen dahinter die Lamellen auf.', '1.8', 'S. 17 D'],
    ['Welcher Handwurzelknochen verknöchert zuerst, welcher zuletzt?', 'Zuerst Os capitatum (1. Lebensjahr), zuletzt Os pisiforme (ca. 9. Jahr).', '1.9', 'S. 19'],
    ['Wozu bestimmt man das Skelettalter?', 'Es zeigt die biologische Reife und Wachstumsreserve – wichtig für Kinderorthopädie und die Vorhersage der Endgröße.', '1.9', 'S. 19'],
    ['Welche drei Segmente hat jede Tetrapodenextremität?', 'Stylopodium (1 Knochen), Zeugopodium (2 Knochen), Autopodium (Hand/Fuß).', '1.10', 'S. 20 A'],
    ['Warum liegen die Strecker am Bein vorn, am Arm hinten?', 'Das Bein wurde stammesgeschichtlich nach vorn gedreht, der Arm behielt die ursprüngliche dorsale Streckerlage.', '1.10', 'S. 21 E–F']
  ].map(([f, a, e, ref], i) => ({ id: 'k' + i, f, a, e, ref }));

  const fragen = [
    ['Welches Merkmal ist KEIN Chordatenmerkmal?', ['dorsales Neuralrohr', 'Chorda dorsalis', 'ventral gelegenes Nervensystem', 'postanaler Schwanz'], 2, 'Bei Chordaten liegt das Neuralrohr dorsal.', '1.1', 'S. 3 G'],
    ['In welcher Struktur ist beim Erwachsenen ein Chorda-Rest erhalten?', ['Anulus fibrosus', 'Nucleus pulposus', 'Lig. longitudinale anterius', 'Wirbelbogen'], 1, 'Der Gallertkern der Bandscheibe enthält Chordareste.', '1.1', 'S. 3 D'],
    ['Welcher Zeitraum ist die Embryonalperiode?', ['1.–3. Woche', '4.–8. Woche', '9.–12. Woche', '13.–38. Woche'], 1, 'Danach beginnt die Fetalperiode.', '1.2', 'S. 4 C'],
    ['Was entsteht bei der Oogenese aus einer primären Oozyte?', ['vier Eizellen', 'eine Eizelle und drei Polkörperchen', 'zwei Eizellen', 'eine Eizelle und ein Polkörperchen'], 1, 'Die Spermatogenese liefert dagegen vier Spermatiden.', '1.2', 'S. 5 E'],
    ['Wann beginnt die Implantation?', ['am 1. Tag', 'am 3. Tag', 'am 5.–6. Tag', 'in der 3. Woche'], 2, 'Die Blastozyste nistet sich ab Tag 5–6 ein.', '1.2', 'S. 5 G–H'],
    ['Aus welchem Somitenteil entstehen die Wirbel?', ['Dermatom', 'Myotom', 'Sklerotom', 'Neuralleiste'], 2, 'Sklerotomzellen wandern zur Chorda.', '1.3', 'S. 7 C'],
    ['Welche Struktur stammt aus der Neuralleiste?', ['Nebennierenrinde', 'Nebennierenmark', 'Schilddrüsenepithel', 'Linse'], 1, 'Die Rinde stammt aus dem Mesoderm, die Linse aus einer ektodermalen Plakode.', '1.3', 'S. 7 D'],
    ['Aus welchem Keimblatt stammt das Brustbein?', ['Ektoderm', 'Mesoderm (Seitenplatten)', 'Endoderm', 'Neuralleiste'], 1, 'Sternum und Extremitätenskelett entstehen aus dem parietalen Seitenplattenmesoderm.', '1.3', 'S. 7 D'],
    ['Was wird aus der 3. Schlundbogenarterie?', ['Aortenbogen', 'A. carotis communis', 'Ductus arteriosus', 'A. subclavia sinistra'], 1, 'Zusätzlich der Anfangsteil der A. carotis interna.', '1.6', 'S. 12 B'],
    ['Welcher Knochen entsteht überwiegend desmal?', ['Femur', 'Clavicula', 'Wirbelkörper', 'Os coxae'], 1, 'Neben Schädeldach und Teilen des Gesichtsschädels.', '1.7', 'S. 14 A'],
    ['Bis wann haben alle Röhrenknochen primäre Knochenkerne?', ['bis zur 8. Woche', 'bis zur 12. Woche', 'bis zur Geburt', 'bis zum 1. Lebensjahr'], 1, 'Die Verknöcherung beginnt in der 8. Woche.', '1.7', 'S. 14 A'],
    ['Welches Gelenk entsteht durch Anlagerung?', ['Hüftgelenk', 'Schultergelenk', 'Kiefergelenk', 'Ellenbogengelenk'], 2, 'Ebenso Sternoklavikular- und Iliosakralgelenk.', '1.7', 'S. 15 C'],
    ['Wodurch entsteht der Gelenkspalt?', ['Nekrose nach Verletzung', 'Apoptose in der Intermediärschicht', 'Einwachsen von Gefäßen', 'Muskelzug'], 1, 'Um die 8. Woche.', '1.7', 'S. 15 C'],
    ['Wofür ist die perichondrale Knochenmanschette verantwortlich?', ['Längenwachstum', 'Dickenwachstum', 'Bildung des roten Marks', 'Gelenkbildung'], 1, 'Sie wächst appositionell.', '1.8', 'S. 16 A, 17 E'],
    ['In welcher Zone der Epiphysenfuge teilen sich die Chondrozyten?', ['Reservezone', 'Säulenknorpel-(Proliferations-)zone', 'Blasenknorpelzone', 'Eröffnungszone'], 1, 'In der Blasenknorpelzone hypertrophieren sie.', '1.8', 'S. 16 B'],
    ['Welche Zellen „bohren“ beim Osteonumbau den Resorptionskanal?', ['Osteoblasten', 'Osteozyten', 'Osteoklasten', 'Chondrozyten'], 2, 'Osteoblasten bauen danach die Lamellen auf.', '1.8', 'S. 17 D'],
    ['Welcher Handwurzelknochen verknöchert als letzter?', ['Os capitatum', 'Os hamatum', 'Os scaphoideum', 'Os pisiforme'], 3, 'Etwa im 9. Lebensjahr.', '1.9', 'S. 19'],
    ['Was bildet das Zeugopodium der oberen Extremität?', ['Humerus', 'Radius und Ulna', 'Handwurzel', 'Schultergürtel'], 1, 'Das Stylopodium ist der Humerus.', '1.10', 'S. 20 A–B'],
    ['Wohin zeigt nach der Rotation der Hinterextremität das Knie?', ['nach hinten', 'nach außen', 'kopfwärts', 'nach medial'], 2, 'Der Ellenbogen zeigt dagegen nach hinten.', '1.10', 'S. 21 E']
  ].map(([f, o, r, x, e, ref], i) => ({ id: 'f' + i, f, o, r, x, e, ref }));

  const sortieren = {
    titel: 'Aus welchem Keimblatt?', ref: 'S. 7 D',
    kategorien: ['Ektoderm', 'Mesoderm', 'Endoderm', 'Neuralleiste'],
    items: [
      ['Epidermis, Haare, Nägel', 0], ['Augenlinse', 0], ['Innenohr', 0], ['Zahnschmelz', 0],
      ['Wirbelsäule und Rippen', 1], ['Skelettmuskulatur', 1], ['Nieren und Keimdrüsen', 1], ['Herz und Blut', 1], ['Nebennierenrinde', 1], ['Sternum und Extremitätenskelett', 1],
      ['Darmepithel', 2], ['Epithel der Atemwege', 2], ['Schilddrüse', 2], ['Thymus', 2], ['Harnblasenepithel', 2],
      ['Spinalganglien', 3], ['Nebennierenmark', 3], ['Pigmentzellen', 3], ['periphere Glia', 3]
    ].map(([t, k], i) => ({ id: 's' + i, t, k }))
  };

  const tabellen = [
    {
      id: 'carnegie', titel: 'Carnegie-Stadien (Auswahl)', ref: 'S. 4 A', einheit: '1.2',
      spalten: ['Woche', 'SSL (mm)'],
      zeilen: [['Stadium 14', ['5', '8']], ['Stadium 17', ['6', '13']], ['Stadium 20', ['7', '18']], ['Stadium 23', ['8', '30']]],
      fuss: 'SSL = Scheitel-Steiß-Länge; Alter als Befruchtungsalter (p. o.).'
    },
    {
      id: 'extremitaet', titel: 'Bauplan der Extremitäten', ref: 'S. 20 A–B', einheit: '1.10',
      spalten: ['obere Extremität', 'untere Extremität'],
      zeilen: [['Stylopodium', ['Humerus', 'Femur']], ['Zeugopodium', ['Radius und Ulna', 'Tibia und Fibula']], ['Autopodium', ['Hand', 'Fuß']]],
      fuss: 'Das Autopodium gliedert sich in Basi-, Meta- und Acropodium.'
    },
    {
      id: 'zeiten', titel: 'Zeitpunkte der Entwicklung', ref: 'S. 4 C, 5 H, 7 C, 14 A, 15 C, 16 A', einheit: '1.7',
      spalten: ['Zeitpunkt'],
      zeilen: [['Morula (Tag)', ['3']], ['Beginn der Implantation (Tag)', ['5–6']], ['erste Somiten (Tag)', ['20']], ['Beginn der Verknöcherung (Woche)', ['8']],
        ['Gelenkentwicklung abgeschlossen (Woche)', ['12']], ['Schluss der meisten Epiphysenfugen (Jahre)', ['18–23']]],
      fuss: 'Tage und Wochen nach der Befruchtung.'
    }
  ];

  (window.KAPITEL_LISTE = window.KAPITEL_LISTE || []).push({
    id: 'allg-entwicklung', start: 2,
    band: 'Allgemeine Anatomie und Bewegungssystem',
    teil: 'Allgemeine Anatomie',
    titel: 'Stammes- und Entwicklungsgeschichte',
    seiten: 'S. 2–7, 12–21',
    intro: 'Chordaten- und Wirbeltiermerkmale, Frühentwicklung, Keimblätter und Somiten, Gefäßentwicklung sowie – als Schwerpunkt – Knochen-, Gelenk- und Extremitätenentwicklung.',
    einheiten, strukturen, karten, fragen, sortieren, tabellen,
    tafeln: []
  });
})();
