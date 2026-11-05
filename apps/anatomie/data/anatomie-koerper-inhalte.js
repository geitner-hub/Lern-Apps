/* ═══════════════════════════════════════════════════════
   Lernwelt – apps/anatomie/data/anatomie-koerper-inhalte.js
   Allgemeine Anatomie · Kapitel 2–3: Der menschliche Körper im Überblick, Orientierung, Haut (Prometheus S. 22–39)
   Seitenangaben = Buchseiten, Buchstabe = Abbildung/Tabelle. Alle Texte eigene Formulierungen.
   ═══════════════════════════════════════════════════════ */
(function () {
  const S = (lat, de, info, ref) => ({ lat, de, info, ref });

  const strukturen = {
    /* 2.1 Proportionen */
    'kopfhoehe-proportion': S('Proportio capitis', 'Kopfhöhe im Verhältnis zur Körperlänge', 'Embryo (Ende 2. Monat) etwa 1/2, Neugeborenes 1/4, 6-Jähriges 1/6, Erwachsener 1/8.', 'S. 22 A'),
    'koerpermitte': S('Medium corporis', 'Körpermitte', 'Beim Erwachsenen etwa auf Höhe der Schambeinfuge: Ober- und Unterlänge 1:1.', 'S. 22 B'),
    'spannweite': S('Amplitudo brachiorum', 'Spannweite (Klafter)', 'Etwas größer als die Körperlänge: Frauen ca. 103 %, Männer ca. 106 %.', 'S. 22 C'),
    'neunerregel': S('Regula novenaria (Wallace)', 'Neunerregel', 'Abschätzung verbrannter Fläche beim Erwachsenen: Kopf und jeder Arm je 9 %, Rumpf vorn, Rumpf hinten und jedes Bein je 18 %, Genitale 1 %.', 'S. 23 E'),
    'handflaechenregel': S('Regula palmae', 'Handflächenregel', 'Die Handfläche des Patienten entspricht etwa 1 % seiner eigenen Körperoberfläche.', 'S. 23 F'),
    'relative-oberflaeche': S('Superficies relativa', 'relative Körperoberfläche', 'Kleine Körper haben im Verhältnis mehr Oberfläche – daher bei Kindern mehr Wärmeverlust und höherer Stoffwechsel.', 'S. 23 G'),
    'bmi': S('Index massae corporis', 'Body-Mass-Index', 'Körpergewicht in kg geteilt durch das Quadrat der Körpergröße in m; korreliert recht gut mit dem Körperfett.', 'S. 23 H'),

    /* 2.2 Bauplan */
    'partes-corporis': S('Partes corporis', 'Körperabschnitte', 'Caput, Collum, Truncus (Thorax, Abdomen, Pelvis) sowie obere und untere Extremität mit Gürtel und freier Gliedmaße.', 'S. 24 B'),
    'bewegungsapparat': S('Apparatus locomotorius', 'Bewegungsapparat', 'Passiver Teil: Skelett und Skelettverbindungen; aktiver Teil: quergestreifte Skelettmuskulatur.', 'S. 24 C'),
    'seroese-hoehle': S('Cavitas serosa', 'seröse Höhle', 'Geschlossener Spaltraum mit glatter Serosa und wenig Flüssigkeit: Pleura-, Perikard- und Peritonealhöhle.', 'S. 24 D'),
    'lamina-visceralis-parietalis': S('Lamina visceralis / parietalis', 'viszerales und parietales Blatt', 'Das viszerale Blatt der Serosa liegt dem Organ auf, das parietale kleidet die Höhlenwand aus.', 'S. 24 D'),
    'bindegewebsraeume': S('Spatia connectiva', 'Bindegewebsräume', 'Organräume ohne Serosa, z. B. Mediastinum, Retro- und Subperitonealraum, Raum zwischen Halsfaszienblättern.', 'S. 24 D'),

    /* 3.1 Richtungen, Ebenen, Achsen */
    'cranialis-caudalis': S('cranialis / caudalis', 'kopfwärts / steißwärts', 'Richtungsangaben entlang der Körperlängsachse.', 'S. 26 A'),
    'ventralis-dorsalis': S('ventralis / dorsalis', 'bauchwärts / rückenwärts', 'Richtungsangaben nach vorn bzw. hinten am Rumpf.', 'S. 26 A'),
    'medialis-lateralis': S('medialis / lateralis', 'zur Mitte / zur Seite', 'Zur Medianebene hin bzw. von ihr weg.', 'S. 26 A'),
    'proximalis-distalis': S('proximalis / distalis', 'rumpfnah / rumpffern', 'Lagebezeichnungen an den Gliedmaßen.', 'S. 26 A'),
    'radialis-ulnaris': S('radialis / ulnaris', 'speichen- / ellenseitig', 'Seitenangaben am Unterarm und an der Hand.', 'S. 26 A'),
    'tibialis-fibularis': S('tibialis / fibularis', 'schienbein- / wadenbeinseitig', 'Seitenangaben am Unterschenkel und am Fuß.', 'S. 26 A'),
    'palmaris-plantaris': S('palmaris (volaris) / plantaris', 'hohlhand- / fußsohlenseitig', 'Gegenstück ist dorsalis (Hand- bzw. Fußrücken).', 'S. 26 A'),
    'superficialis-profundus': S('superficialis / profundus', 'oberflächlich / tief', 'Lage zur Körperoberfläche.', 'S. 26 A'),
    'normalposition': S('Positio anatomica', 'anatomische Normalposition', 'Aufrechter Stand, Blick nach vorn, Hände supiniert; links und rechts beziehen sich immer auf den Patienten.', 'S. 26 B'),
    'sagittalebene': S('Planum sagittale', 'Sagittalebene', 'Senkrechte Ebenen parallel zur Pfeilnaht von vorn nach hinten; die Medianebene teilt den Körper in zwei gleiche Hälften.', 'S. 27 D'),
    'frontalebene': S('Planum frontale (coronale)', 'Frontalebene', 'Senkrechte Ebenen parallel zur Stirn bzw. Kranznaht, von einer Seite zur anderen.', 'S. 27 D'),
    'transversalebene': S('Planum transversale', 'Transversalebene', 'Horizontale Querschnittsebenen senkrecht zur Längsachse; trennen kranial von kaudal.', 'S. 27 D'),
    'longitudinalachse': S('Axis longitudinalis', 'Längsachse', 'Verläuft kranial-kaudal; Schnittlinie von Frontal- und Sagittalebene.', 'S. 27 D'),
    'sagittalachse': S('Axis sagittalis', 'Pfeilachse', 'Verläuft ventral-dorsal; Schnittlinie von Sagittal- und Transversalebene.', 'S. 27 D'),
    'transversalachse': S('Axis transversalis', 'Querachse', 'Verläuft von links nach rechts; Schnittlinie von Frontal- und Transversalebene.', 'S. 27 D'),
    'varus-valgus': S('Positio vara / valga', 'Varus- und Valgusstellung', 'Achsabweichung in der Frontalebene. Genu varum = O-Bein (distaler Knochen zeigt zur Mitte), Genu valgum = X-Bein.', 'S. 27 E'),
    'rekurvation': S('Recurvatio / Antecurvatio', 'Rekurvation und Antekurvation', 'Achsabweichungen in der Sagittalebene.', 'S. 27 E'),
    'schwerelot': S('Linea gravitatis', 'Schwerelot', 'Läuft durch den Körperschwerpunkt (unter dem Promontorium, Höhe S II), seitlich durch Gehörgang, Dens axis, Hüft-, Knie- und Sprunggelenk.', 'S. 27 F'),

    /* 3.2 Radiologie */
    'frankfurter-horizontale': S('Planum Francofurtanum', 'Frankfurter (Deutsche) Horizontale', 'Transversale Bezugsebene am Kopf vom Oberrand des äußeren Gehörgangs zum Unterrand der Orbita.', 'S. 28 A b'),
    'kanthomeatalebene': S('Planum canthomeatale', 'Kanthomeatalebene', 'Für axiale Schädel-CTs ca. 19° gekippte Ebene vom Gehörgang zum Augenwinkel; schont die Orbita.', 'S. 28 A c–d'),
    'axiale-schnittbilder': S('Sectiones axiales', 'Betrachtung axialer Schnittbilder', 'Immer von kaudal (bzw. distal) betrachtet: rechte Körperseite erscheint links, Wirbelsäule unten.', 'S. 29 D'),

    /* 3.4–3.5 Tastpunkte und Linien */
    'linea-medioclavicularis': S('Linea medioclavicularis', 'Medioklavikularlinie', 'Senkrechte durch die Mitte der Clavicula, oft deckungsgleich mit der Mamillarlinie.', 'S. 34 A'),
    'linea-sternalis': S('Linea sternalis / parasternalis', 'Sternal- und Parasternallinie', 'Sternallinie am Brustbeinrand; Parasternallinie mitten zwischen Sternal- und Medioklavikularlinie.', 'S. 34 A'),
    'lineae-axillares': S('Lineae axillares', 'Axillarlinien', 'Vordere Linie an der vorderen Achselfalte (M. pectoralis major), hintere an der hinteren (M. latissimus dorsi), mittlere dazwischen.', 'S. 34 A'),
    'linea-scapularis': S('Linea scapularis / paravertebralis', 'Skapular- und Paravertebrallinie', 'Skapularlinie durch den Angulus inferior scapulae; Paravertebrallinie auf Höhe der Querfortsätze.', 'S. 34 A'),
    'rippen-zaehlen': S('Numeratio costarum', 'Rippen abzählen', 'Man beginnt mit der 2. Rippe am Angulus sterni, weil die 1. unter der Clavicula liegt; kaudal mit der 12. Rippe, die nur dorsal tastbar ist.', 'S. 34 B'),
    'planum-transpyloricum': S('Planum transpyloricum', 'Transpylorusebene', 'Transversalebene in der Mitte zwischen Symphysenoberrand und Manubrium-Oberrand.', 'S. 35 C'),
    'planum-subcostale': S('Planum subcostale', 'Subkostalebene', 'Transversalebene am Unterrand des 10. Rippenknorpels.', 'S. 35 C'),
    'planum-supracristale': S('Planum supracristale', 'Suprakristalebene', 'Transversalebene durch die höchsten Punkte der Darmbeinkämme (Höhe Dornfortsatz L IV).', 'S. 35 C–D'),
    'dornfortsatz-orientierung': S('Processus spinosi als Leitpunkte', 'Dornfortsätze als Orientierung', 'C VII sichtbar vorspringend; Th III auf Höhe der Spinae scapulae; Th VII auf Höhe der Anguli inferiores; Th XII knapp unter der 12. Rippe; L IV an der Cristalinie; S II an der Linie der SIPS.', 'S. 35 D'),
    'steinschnittlage': S('Positio lithotomica', 'Steinschnittlage', 'Rückenlage mit gebeugten, gespreizten Beinen; Befunde nach Uhrzeit: 12 Uhr Richtung Schambein, 6 Uhr Richtung Kreuzbein.', 'S. 35 E'),
    'tastbare-knochenpunkte': S('Puncta ossea palpabilia', 'tastbare Knochenpunkte', 'Helfen, nicht direkt tastbare Strukturen (z. B. das Hüftgelenk) indirekt zu orten.', 'S. 32'),

    /* 3.6 Regionen */
    'regio-epigastrica': S('Regio epigastrica', 'Oberbauchgegend', 'Mittlere obere Bauchregion unter dem Rippenbogen.', 'S. 36 C'),
    'regio-hypochondriaca': S('Regio hypochondriaca', 'Unterrippengegend', 'Seitliche obere Bauchregion unter dem Rippenbogen.', 'S. 36 C'),
    'regio-umbilicalis': S('Regio umbilicalis', 'Nabelgegend', 'Mittlere Region des Bauches um den Nabel.', 'S. 36 C'),
    'regio-pubica': S('Regio pubica', 'Schamgegend', 'Mittlere untere Bauchregion über der Symphyse.', 'S. 36 C'),

    /* 3.7 Haut */
    'cutis-flaeche': S('Cutis', 'Haut', 'Flächenmäßig größtes Organ (ca. 1,8 m²); Felderhaut und Leistenhaut (nur Handfläche und Fußsohle, Grundlage des Fingerabdrucks).', 'S. 38 A'),
    'epidermis': S('Epidermis', 'Oberhaut', 'Gefäßfreies, verhornendes Plattenepithel; mit der Dermis verzahnt.', 'S. 38 A, 39 C'),
    'stratum-corneum': S('Stratum corneum', 'Hornschicht', 'Äußerste Schicht; mechanischer und chemischer Schutz.', 'S. 39 C'),
    'stratum-lucidum': S('Stratum lucidum', 'Glanzschicht', 'Nur in der Leistenhaut von Hand und Fuß ausgebildet.', 'S. 39 C'),
    'stratum-granulosum': S('Stratum granulosum', 'Körnerschicht', 'Zellen mit Keratohyalingranula; dichtet ab.', 'S. 39 C'),
    'stratum-spinosum': S('Stratum spinosum', 'Stachelzellschicht', 'Meist dickste Lage lebender Zellen; viele Desmosomen; Langerhans-Zellen für die Immunabwehr.', 'S. 39 C'),
    'stratum-basale': S('Stratum basale', 'Basalschicht', 'Unterste Epidermisschicht an der Basalmembran; Melanozyten (UV-Schutz) und Merkel-Zellen.', 'S. 39 C'),
    'dermis': S('Dermis (Corium)', 'Lederhaut', 'Bindegewebiger Teil mit Stratum papillare (Zapfen, verzahnt mit Epidermis) und Stratum reticulare (straff, verursacht die Spaltlinien).', 'S. 38 A, 39 C'),
    'subcutis': S('Subcutis (Tela subcutanea)', 'Unterhaut', 'Überwiegend Fettgewebe; Energiespeicher, Polster und Verschiebeschicht bis zur Körperfaszie.', 'S. 38 A, 39 C'),
    'hautplexus': S('Plexus superficialis et profundus', 'Hautgefäßnetze', 'Oberflächlicher Plexus an der Grenze papillär/retikulär, tiefer Plexus an der Grenze Dermis/Subcutis; dazwischen wird Spalthaut entnommen.', 'S. 38 B'),
    'meissner': S('Corpusculum tactus (Meissner)', 'Meißner-Körperchen', 'Schnell adaptierende Druckrezeptoren in den Papillen der Leistenhaut und der Lippen; in behaarter Haut durch Haarfollikelrezeptoren ersetzt.', 'S. 39 C–D'),
    'merkel': S('Meniscus tactus (Merkel)', 'Merkel-Tastscheiben', 'Langsam adaptierende Druckrezeptoren im Stratum basale.', 'S. 39 C–D'),
    'ruffini': S('Corpusculum Ruffini', 'Ruffini-Körperchen', 'Langsam adaptierende Dehnungsrezeptoren in der tieferen Dermis.', 'S. 39 C–D'),
    'vater-pacini': S('Corpusculum lamellosum (Vater-Pacini)', 'Vater-Pacini-Körperchen', 'Schnell adaptierende Vibrationsrezeptoren in der Subcutis.', 'S. 39 C–D')
  };

  const einheiten = [
    ['2.1', 'Proportionen, Oberflächen und Körpergewichte', 22], ['2.2', 'Bauplan des menschlichen Körpers', 24],
    ['3.1', 'Lage- und Richtungsbezeichnungen, Hauptachsen und -ebenen', 26], ['3.2', 'Radiologische Untersuchungsebenen', 28],
    ['3.3', 'Oberflächenanatomie', 30], ['3.4', 'Oberflächenrelief und tastbare Knochenpunkte', 32],
    ['3.5', 'Orientierungslinien und Bezugspunkte', 34], ['3.6', 'Körperregionen', 36], ['3.7', 'Haut', 38]
  ].map(([nr, titel, seite]) => ({ nr, titel, seite }));

  const karten = [
    ['Wie ändert sich der Anteil der Kopfhöhe an der Körperlänge?', 'Embryo Ende 2. Monat ca. 1/2, Neugeborenes 1/4, 6-Jähriges 1/6, Erwachsener 1/8.', '2.1', 'S. 22 A'],
    ['Wo liegt beim Erwachsenen die Körpermitte?', 'Etwa auf Höhe der Schambeinfuge (Ober- zu Unterlänge 1:1).', '2.1', 'S. 22 B'],
    ['Neunerregel beim Erwachsenen?', 'Kopf 9 %, jeder Arm 9 %, Rumpf vorn 18 %, Rumpf hinten 18 %, jedes Bein 18 %, Genitale 1 %.', '2.1', 'S. 23 E'],
    ['Wie viel Körperoberfläche entspricht die Handfläche des Patienten?', 'Etwa 1 % seiner eigenen Körperoberfläche.', '2.1', 'S. 23 F'],
    ['Wie berechnet man den BMI?', 'Gewicht (kg) geteilt durch Körpergröße (m) zum Quadrat.', '2.1', 'S. 23 H'],
    ['Was ist eine seröse Höhle?', 'Ein geschlossener Spaltraum mit glatter Serosa (viszerales und parietales Blatt) und wenig Flüssigkeit – Pleura, Perikard, Peritoneum.', '2.2', 'S. 24 D'],
    ['Woraus besteht der Bewegungsapparat?', 'Passiv: Skelett und Skelettverbindungen. Aktiv: Skelettmuskulatur.', '2.2', 'S. 24 C'],
    ['Beschreibe die anatomische Normalposition.', 'Aufrechter Stand, Blick nach vorn, Hände supiniert; Seitenangaben immer vom Patienten aus.', '3.1', 'S. 26 B'],
    ['Welche drei Hauptebenen gibt es?', 'Sagittal- (mit Medianebene), Frontal- (koronare) und Transversalebene.', '3.1', 'S. 27 D'],
    ['Welche Achse liegt im Schnitt von Frontal- und Sagittalebene?', 'Die Längsachse (Longitudinalachse).', '3.1', 'S. 27 D'],
    ['Genu varum oder valgum – was ist das O-Bein?', 'Genu varum = O-Bein; Genu valgum = X-Bein.', '3.1', 'S. 27 E'],
    ['Welche Punkte liegen im Schwerelot (seitlich betrachtet)?', 'Äußerer Gehörgang, Dens axis, Übergänge der Wirbelsäule, Körperschwerpunkt, Hüft-, Knie- und Sprunggelenk.', '3.1', 'S. 27 F'],
    ['Wo liegt der Körperschwerpunkt?', 'In der Medianebene unterhalb des Promontoriums, etwa auf Höhe des 2. Sakralwirbels.', '3.1', 'S. 27 F'],
    ['Wie verläuft die Frankfurter Horizontale?', 'Vom Oberrand des äußeren Gehörgangs zum Unterrand der Orbita.', '3.2', 'S. 28 A b'],
    ['Von wo betrachtet man axiale CT- und MRT-Bilder?', 'Von kaudal (an den Extremitäten von distal): rechts liegende Strukturen erscheinen links.', '3.2', 'S. 29 D'],
    ['Mit welcher Rippe beginnt man beim Abzählen ventral?', 'Mit der 2. Rippe am Angulus sterni – die 1. ist von der Clavicula verdeckt.', '3.5', 'S. 34 B'],
    ['Wo verläuft die vordere Axillarlinie?', 'An der vorderen Achselfalte (M. pectoralis major).', '3.5', 'S. 34 A'],
    ['Welche Dornfortsätze sind Leitpunkte am Rücken?', 'C VII (prominens), Th III (Spinae scapulae), Th VII (Anguli inferiores), Th XII (unter 12. Rippe), L IV (Cristae iliacae), S II (SIPS).', '3.5', 'S. 35 D'],
    ['Wie orientiert man sich in der Steinschnittlage?', 'Nach dem Zifferblatt: 12 Uhr Richtung Schambein, 6 Uhr Richtung Kreuzbein, 3 Uhr rechts, 9 Uhr links.', '3.5', 'S. 35 E'],
    ['Wo gibt es Leistenhaut?', 'Nur an Handflächen und Fußsohlen; sie bildet den Fingerabdruck.', '3.7', 'S. 38 A'],
    ['Nenne die Epidermisschichten von außen nach innen.', 'Stratum corneum, (lucidum nur Leistenhaut), granulosum, spinosum, basale.', '3.7', 'S. 39 C'],
    ['Welche Schicht erzeugt die Spaltlinien der Haut?', 'Das Stratum reticulare der Dermis mit seinem netzförmigen straffen Bindegewebe.', '3.7', 'S. 39 C'],
    ['Wo liegen die Hautgefäße – und warum heilt Spalthaut?', 'In der Dermis (Plexus superficialis und profundus); bei der Spalthautentnahme wird zwischen den Plexus geschnitten.', '3.7', 'S. 38 B'],
    ['Welche Hautrezeptoren adaptieren schnell, welche langsam?', 'Schnell: Meißner (Druckänderung), Vater-Pacini (Vibration). Langsam: Merkel (Druck), Ruffini (Dehnung).', '3.7', 'S. 39 C–D']
  ].map(([f, a, e, ref], i) => ({ id: 'k' + i, f, a, e, ref }));

  const fragen = [
    ['Wie groß ist die Kopfhöhe beim Neugeborenen relativ zur Körperlänge?', ['1/2', '1/4', '1/6', '1/8'], 1, 'Beim Erwachsenen ist es 1/8.', '2.1', 'S. 22 A'],
    ['Nach der Neunerregel entfallen auf ein Bein beim Erwachsenen …', ['9 %', '13,5 %', '18 %', '27 %'], 2, 'Jedes Bein 18 % (2 × 9).', '2.1', 'S. 23 E'],
    ['Warum kühlen Kinder schneller aus?', ['dünnere Haut', 'relativ größere Körperoberfläche', 'weniger Schweißdrüsen', 'niedrigerer Stoffwechsel'], 1, 'Kleinere Körper haben im Verhältnis mehr Oberfläche.', '2.1', 'S. 23 G'],
    ['Welche Höhle ist KEINE seröse Höhle?', ['Cavitas pleuralis', 'Cavitas pericardiaca', 'Mediastinum', 'Cavitas peritonealis'], 2, 'Das Mediastinum ist ein Bindegewebsraum.', '2.2', 'S. 24 D'],
    ['Die Sagittalachse liegt im Schnittpunkt von …', ['Frontal- und Sagittalebene', 'Sagittal- und Transversalebene', 'Frontal- und Transversalebene', 'zwei Frontalebenen'], 1, 'Sie verläuft ventral-dorsal.', '3.1', 'S. 27 D'],
    ['Was beschreibt eine Valgusstellung im Kniegelenk?', ['O-Bein', 'X-Bein', 'überstrecktes Knie', 'Beugekontraktur'], 1, 'Die Tibia weicht von der Mittellinie weg ab.', '3.1', 'S. 27 E'],
    ['„Palmaris“ bedeutet …', ['zum Handrücken', 'zur Hohlhand', 'zur Speiche', 'zur Fußsohle'], 1, 'Synonym volaris; Fußsohle = plantaris.', '3.1', 'S. 26 A'],
    ['Auf welcher Höhe liegt der Körperschwerpunkt?', ['L III', 'Promontorium/S II', 'Th XII', 'Symphyse'], 1, 'Unterhalb des Promontoriums, etwa auf Höhe von S II.', '3.1', 'S. 27 F'],
    ['Warum wird das axiale Schädel-CT ca. 19° gekippt?', ['bessere Auflösung des Kleinhirns', 'Schutz der Orbita vor Strahlung', 'kürzere Untersuchungszeit', 'Darstellung der Halswirbel'], 1, 'Man schneidet entlang der Kanthomeatalebene.', '3.2', 'S. 28 A c–d'],
    ['Auf einem axialen CT erscheint die rechte Körperseite …', ['rechts', 'links', 'oben', 'unten'], 1, 'Die Bilder werden von kaudal betrachtet.', '3.2', 'S. 29 D'],
    ['Welche Rippe setzt am Angulus sterni an?', ['1. Rippe', '2. Rippe', '3. Rippe', '7. Rippe'], 1, 'Daher beginnt man dort mit dem Zählen.', '3.5', 'S. 34 B'],
    ['Welcher Dornfortsatz liegt auf Höhe der Spinae scapulae?', ['C VII', 'Th III', 'Th VII', 'Th XII'], 1, 'Th VII liegt auf Höhe der unteren Schulterblattwinkel.', '3.5', 'S. 35 D'],
    ['Durch welchen Punkt läuft die Skapularlinie?', ['Akromion', 'Spina scapulae', 'Angulus inferior scapulae', 'Proc. coracoideus'], 2, 'Linea scapularis = Senkrechte durch den unteren Schulterblattwinkel.', '3.5', 'S. 34 A'],
    ['In welcher Epidermisschicht liegen die Langerhans-Zellen?', ['Stratum corneum', 'Stratum granulosum', 'Stratum spinosum', 'Stratum lucidum'], 2, 'Sie dienen der Immunantwort.', '3.7', 'S. 39 C'],
    ['Wo liegen Vater-Pacini-Körperchen?', ['Epidermis', 'Stratum papillare', 'Subcutis', 'Stratum basale'], 2, 'Schnell adaptierende Vibrationsrezeptoren.', '3.7', 'S. 39 C–D'],
    ['Welche Hautschicht enthält KEINE Blutgefäße?', ['Epidermis', 'Stratum papillare', 'Stratum reticulare', 'Subcutis'], 0, 'Wie jedes Epithel ist die Epidermis gefäßfrei.', '3.7', 'S. 38 A']
  ].map(([f, o, r, x, e, ref], i) => ({ id: 'f' + i, f, o, r, x, e, ref }));

  const sortieren = {
    titel: 'In welcher Hautschicht?', ref: 'S. 38 A–B, 39 C–D',
    kategorien: ['Epidermis', 'Dermis', 'Subcutis'],
    items: [
      ['Merkel-Tastscheiben', 0], ['Langerhans-Zellen', 0], ['Melanozyten', 0], ['Stratum lucidum', 0], ['Keratohyalingranula', 0],
      ['Meißner-Körperchen', 1], ['Ruffini-Körperchen', 1], ['Schweißdrüsen', 1], ['Talgdrüsen', 1], ['Plexus superficialis', 1], ['Spaltlinien (Stratum reticulare)', 1],
      ['Vater-Pacini-Körperchen', 2], ['Fettzellen als Energiespeicher', 2], ['Verschiebeschicht zur Körperfaszie', 2]
    ].map(([t, k], i) => ({ id: 's' + i, t, k }))
  };

  const tabellen = [
    {
      id: 'neunerregel', titel: 'Neunerregel (Erwachsene)', ref: 'S. 23 E', einheit: '2.1',
      spalten: ['Anteil in %'],
      zeilen: [['Kopf', ['9']], ['ein Arm', ['9']], ['Rumpf vorn', ['18']], ['Rumpf hinten', ['18']], ['ein Bein', ['18']], ['äußeres Genitale', ['1']]],
      fuss: 'Bei Kindern und Kleinkindern muss die Regel altersabhängig korrigiert werden.'
    },
    {
      id: 'dornfortsaetze', titel: 'Dornfortsätze als Orientierung', ref: 'S. 35 D', einheit: '3.5',
      spalten: ['Dornfortsatz'],
      zeilen: [['deutlich vorspringend (Vertebra prominens)', ['C VII']], ['Linie zwischen den Spinae scapulae', ['Th III']], ['Linie zwischen den Anguli inferiores', ['Th VII']],
        ['knapp unterhalb der 12. Rippe', ['Th XII']], ['Linie der höchsten Punkte der Cristae iliacae', ['L IV']], ['Linie der Spinae iliacae posteriores superiores', ['S II']]],
      fuss: 'Römische Ziffern mit Leerzeichen, z. B. Th III.'
    },
    {
      id: 'proportionen', titel: 'Kopfhöhe zur Körperlänge', ref: 'S. 22 A', einheit: '2.1',
      spalten: ['Anteil'],
      zeilen: [['Embryo Ende 2. Monat', ['1/2']], ['Neugeborenes', ['1/4']], ['6-jähriges Kind', ['1/6']], ['Erwachsener', ['1/8']]],
      fuss: 'Als Bruch eingeben, z. B. 1/4.'
    }
  ];

  (window.KAPITEL_LISTE = window.KAPITEL_LISTE || []).push({
    id: 'allg-koerper', start: 22,
    band: 'Allgemeine Anatomie und Bewegungssystem',
    teil: 'Allgemeine Anatomie',
    titel: 'Körper im Überblick, Orientierung und Haut',
    seiten: 'S. 22–39',
    intro: 'Proportionen und Neunerregel, Bauplan und Körperhöhlen, Lage- und Richtungsbegriffe, Ebenen und Achsen, Schnittbilder, Orientierungslinien, tastbare Knochenpunkte und der Aufbau der Haut.',
    einheiten, strukturen, karten, fragen, sortieren, tabellen,
    tafeln: []
  });
})();
