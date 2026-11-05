/* Lerninhalte Rumpfwand · Kapitel 1: Knochen, Bänder und Gelenke
   Seitenangaben = Buchseiten im Prometheus (Allgemeine Anatomie und Bewegungssystem), Abb. = Abbildungsbuchstabe.
   Alle Texte sind eigene Formulierungen. */
(function () {
  const S = (lat, de, info, ref) => ({ lat, de, info, ref });

  const strukturen = {
    /* Abschnitte & Krümmungen */
    'hws': S('Pars cervicalis (HWS)', 'Halswirbelsäule', '7 Halswirbel; physiologische Krümmung: Zervikallordose.', 'S. 110 A, 111 B'),
    'bws': S('Pars thoracica (BWS)', 'Brustwirbelsäule', '12 Brustwirbel; tragen über Gelenkflächen die Rippen; Thorakalkyphose.', 'S. 110 A, 111 B'),
    'lws': S('Pars lumbalis (LWS)', 'Lendenwirbelsäule', '5 Lendenwirbel mit den kräftigsten Wirbelkörpern; Lumballordose.', 'S. 110 A, 111 B'),
    'os-sacrum': S('Os sacrum', 'Kreuzbein', 'Aus 5 Sakralwirbeln verschmolzen; fest im Beckenring eingebaut (Sakralkyphose).', 'S. 122 A–B, 146 B'),
    'zervikallordose': S('Lordosis cervicalis', 'Halslordose', 'Nach ventral konvexe Krümmung; entsteht postnatal mit der Kopfkontrolle.', 'S. 111 B, 113 C'),
    'thorakalkyphose': S('Kyphosis thoracica', 'Brustkyphose', 'Nach dorsal konvexe Krümmung der BWS; schon beim Neugeborenen angelegt.', 'S. 111 B, 113 B'),
    'lumballordose': S('Lordosis lumbalis', 'Lendenlordose', 'Entsteht mit Sitzen, Stehen und Gehen; wird erst in der Pubertät endgültig fixiert.', 'S. 111 B, 113 C'),
    'sakralkyphose': S('Kyphosis sacralis', 'Sakralkyphose', 'Nach dorsal konvexe Krümmung des Kreuzbeins.', 'S. 111 B'),
    'atlas': S('Atlas (C I)', '1. Halswirbel', 'Ohne Wirbelkörper und Dornfortsatz; Ring aus vorderem und hinterem Bogen mit zwei Massae laterales.', 'S. 115 D, 116 B, 117 C'),
    'axis': S('Axis (C II)', '2. Halswirbel', 'Trägt den Dens axis, um den sich der Atlas dreht.', 'S. 116 B, 117 C'),
    'dens-axis': S('Dens axis', 'Zahn des Axis', 'Zapfen des Axis; bildet mit Fovea dentis und Lig. transversum atlantis das mediane untere Kopfgelenk. Liegt im Schwerelot.', 'S. 116 B, 130 A, 131 B'),
    'vertebra-prominens': S('Vertebra prominens (C VII)', '7. Halswirbel', 'Langer, nicht gegabelter Dornfortsatz; meist erster gut tastbarer Dornfortsatz.', 'S. 109 C, 116 A'),
    'proc-spinosus': S('Processus spinosus', 'Dornfortsatz', 'Unpaarer Fortsatz des Wirbelbogens nach dorsal; Ansatz für Bänder und Muskeln. In der BWS lang und dachziegelartig nach kaudal geneigt.', 'S. 114 A, 118 A'),
    'proc-spinosus-bifidus': S('Processus spinosus (gegabelt)', 'gegabelter Dornfortsatz', 'Die Dornfortsätze von C III–C VI sind kurz und gegabelt.', 'S. 116 A, 117 C'),
    'discus-intervertebralis': S('Discus intervertebralis', 'Bandscheibe', 'Faserknorpelige Verbindung zweier Wirbelkörper aus Anulus fibrosus und Nucleus pulposus.', 'S. 124 A, 125 D'),
    'foramen-intervertebrale': S('Foramen intervertebrale', 'Zwischenwirbelloch', 'Gebildet von Incisura vertebralis inferior und superior zweier Nachbarwirbel; Austritt des Spinalnervs.', 'S. 110 A c, 118 B'),
    'promontorium': S('Promontorium', 'Vorberg', 'Vorderer oberer Rand der Basis ossis sacri; Bezugspunkt für Beckenmaße.', 'S. 122 A, 149 B'),
    'os-coccygis': S('Os coccygis', 'Steißbein', '3–4 Wirbelrudimente; meist über eine Knorpelhafte (Art. sacrococcygea) mit dem Kreuzbein verbunden.', 'S. 122 A–B'),

    /* Grundbauplan Wirbel */
    'corpus-vertebrae': S('Corpus vertebrae', 'Wirbelkörper', 'Tragender Teil des Wirbels; wird von kranial nach kaudal größer.', 'S. 114 A, 115 D'),
    'epiphysis-anularis': S('Epiphysis anularis', 'Randleiste', 'Knöcherner Ring am Rand der Wirbelkörper-Endfläche; hier ist die Außenzone des Anulus fibrosus verankert.', 'S. 124 A, 125 D'),
    'pediculus': S('Pediculus arcus vertebrae', 'Bogenwurzel', 'Verbindet den Wirbelbogen mit dem Wirbelkörper; begrenzt oben und unten die Incisurae vertebrales.', 'S. 114 A, 119 C'),
    'lamina': S('Lamina arcus vertebrae', 'Bogenplatte', 'Hinterer, platter Teil des Wirbelbogens; zwischen benachbarten Laminae spannen die Ligg. flava.', 'S. 114 A, 119 C'),
    'foramen-vertebrale': S('Foramen vertebrale', 'Wirbelloch', 'Von Wirbelkörper und -bogen umschlossen; alle zusammen bilden den Canalis vertebralis. HWS dreieckig groß, BWS rund, LWS dreieckig.', 'S. 114 A, 115 D'),
    'proc-transversus': S('Processus transversus', 'Querfortsatz', 'Paariger seitlicher Fortsatz; an der BWS mit Gelenkfläche für das Tuberculum costae (Th I–X).', 'S. 114 A, 118 B'),
    'proc-costalis': S('Processus costalis', 'Rippenfortsatz', 'Sog. Querfortsatz der Lendenwirbel; entwicklungsgeschichtlich ein Rippenrudiment, daher nicht homolog zum Proc. transversus.', 'S. 110 A, 114 C, 120 A'),
    'proc-articularis-superior': S('Processus articularis superior', 'oberer Gelenkfortsatz', 'Trägt die Facies articularis superior; bildet mit dem unteren Gelenkfortsatz des Wirbels darüber ein Wirbelbogengelenk.', 'S. 114 A, 132 A'),
    'proc-articularis-inferior': S('Processus articularis inferior', 'unterer Gelenkfortsatz', 'Artikuliert mit dem oberen Gelenkfortsatz des nächsttieferen Wirbels.', 'S. 114 A, 118 B'),
    'facies-articularis-superior': S('Facies articularis superior', 'obere Gelenkfläche', 'Stellung je nach Abschnitt verschieden: HWS ca. 45° zur Horizontalen, BWS nach dorsal, LWS sagittal und nach medial.', 'S. 116 A, 118 A, 120 A, 132 A'),
    'proc-mammillaris': S('Processus mammillaris', 'Muskelhöcker', 'Höcker an der Außenseite des oberen Gelenkfortsatzes der Lendenwirbel; Ursprung/Ansatz autochthoner Rückenmuskeln.', 'S. 120 A, 121 C'),
    'proc-accessorius': S('Processus accessorius', 'Nebenfortsatz', 'Kleiner spitzer Fortsatz an der Basis des Proc. costalis; entspricht dem eigentlichen Querfortsatz des Lendenwirbels.', 'S. 120 A, 121 C'),
    'incisura-vertebralis-superior': S('Incisura vertebralis superior', 'obere Wirbeleinkerbung', 'Flache Einkerbung oberhalb der Bogenwurzel; Teil des Foramen intervertebrale.', 'S. 118 B'),
    'incisura-vertebralis-inferior': S('Incisura vertebralis inferior', 'untere Wirbeleinkerbung', 'Tiefe Einkerbung unterhalb der Bogenwurzel; Teil des Foramen intervertebrale.', 'S. 118 B'),
    'canalis-vertebralis': S('Canalis vertebralis', 'Wirbelkanal', 'Gesamtheit der Wirbellöcher; enthält Rückenmark bzw. Cauda equina mit Hüllen.', 'S. 114 A, 136 A'),

    /* BWS */
    'fovea-costalis-superior': S('Fovea costalis superior', 'obere Rippengelenkfläche', 'Am Wirbelkörper oben; bildet mit der Fovea costalis inferior des Wirbels darüber die Pfanne für den Rippenkopf.', 'S. 118 A–B'),
    'fovea-costalis-inferior': S('Fovea costalis inferior', 'untere Rippengelenkfläche', 'Am Wirbelkörper unten (Th I–IX). Th XI und XII haben je eine komplette Fovea costalis.', 'S. 118 A–B'),
    'fovea-costalis-proc-transversi': S('Fovea costalis processus transversi', 'Querfortsatz-Gelenkfläche', 'Gelenkfläche für das Tuberculum costae; fehlt an Th XI und XII.', 'S. 118 A–B, 145 C'),

    /* HWS */
    'proc-uncinatus': S('Uncus corporis vertebrae (Proc. uncinatus)', 'Wirbelkörperhaken', 'Seitliche Erhebung der oberen Endfläche von C III–C VII; entsteht erst um das 10. Lebensjahr, Grundlage der Unkovertebralgelenke.', 'S. 116 A, 134 A'),
    'foramen-transversarium': S('Foramen transversarium', 'Querfortsatzloch', 'Zwischen vorderer und hinterer Spange des Querfortsatzes; Durchtritt der A. vertebralis (ab C VI nach kranial).', 'S. 114 C, 116 A'),
    'tuberculum-anterius': S('Tuberculum anterius', 'vorderer Höcker', 'Ende der vorderen Spange des Querfortsatzes; entspricht dem Rippenrudiment.', 'S. 114 C, 117 C'),
    'tuberculum-posterius': S('Tuberculum posterius', 'hinterer Höcker', 'Ende der hinteren Spange des Querfortsatzes (eigentlicher Querfortsatz).', 'S. 114 C, 117 C'),
    'sulcus-n-spinalis': S('Sulcus nervi spinalis', 'Spinalnervenrinne', 'Rinne auf der Oberseite des Querfortsatzes (ab C III), in der der Spinalnerv nach lateral zieht.', 'S. 116 A, 134 B'),

    /* Atlas */
    'arcus-anterior': S('Arcus anterior atlantis', 'vorderer Atlasbogen', 'Trägt innen die Fovea dentis und außen das Tuberculum anterius.', 'S. 117 C a'),
    'arcus-posterior': S('Arcus posterior atlantis', 'hinterer Atlasbogen', 'Ersetzt Wirbelbogen und Dornfortsatz; oben die Rinne für die A. vertebralis.', 'S. 117 C a'),
    'tuberculum-anterius-atlantis': S('Tuberculum anterius atlantis', 'vorderer Atlashöcker', 'Höcker auf der Vorderseite des vorderen Atlasbogens.', 'S. 117 C a'),
    'tuberculum-posterius-atlantis': S('Tuberculum posterius atlantis', 'hinterer Atlashöcker', 'Rudiment des Dornfortsatzes am hinteren Atlasbogen.', 'S. 117 C a'),
    'massa-lateralis': S('Massa lateralis atlantis', 'Seitenmasse des Atlas', 'Trägt oben die Gelenkfläche für die Kondylen des Hinterhaupts, unten die für den Axis.', 'S. 117 C a, 131 B'),
    'fovea-articularis-superior': S('Facies (Fovea) articularis superior atlantis', 'obere Atlasgelenkfläche', 'Oval, leicht konkav; artikuliert mit den Condyli occipitales (oberes Kopfgelenk).', 'S. 117 C a, 128 B'),
    'fovea-dentis': S('Fovea dentis', 'Zahngrube', 'Gelenkfläche an der Innenseite des vorderen Atlasbogens für den Dens axis.', 'S. 117 C a, 131 B'),
    'sulcus-a-vertebralis': S('Sulcus arteriae vertebralis', 'Rinne der Wirbelarterie', 'Auf dem hinteren Atlasbogen; hier verläuft die A. vertebralis zum Foramen magnum.', 'S. 116 B, 117 C a'),
    'art-atlantoaxialis-mediana': S('Articulatio atlantoaxialis mediana', 'medianes unteres Kopfgelenk', 'Unpaares Gelenk mit vorderer (Dens–Fovea dentis) und hinterer Abteilung (Dens–Lig. transversum); übernimmt fast 70 % der HWS-Rotation.', 'S. 128 B, 131 B'),
    'lig-transversum-atlantis': S('Ligamentum transversum atlantis', 'Querband des Atlas', 'Spannt zwischen den Massae laterales hinter dem Dens; der druckbelastete Teil besteht aus Faserknorpel.', 'S. 130 A c, 131 B'),

    /* Kopfgelenke */
    'os-occipitale': S('Os occipitale', 'Hinterhauptsbein', 'Bildet mit den Condyli occipitales das obere Kopfgelenk.', 'S. 128 A, 130 A'),
    'foramen-magnum': S('Foramen magnum', 'großes Hinterhauptsloch', 'Am Vorderrand setzt das Lig. apicis dentis an, am Hinterrand die Membrana atlantooccipitalis posterior.', 'S. 130 A'),
    'condylus-occipitalis': S('Condylus occipitalis', 'Hinterhauptskondyle', 'Konvex; artikuliert mit der oberen Gelenkfläche des Atlas (Art. atlantooccipitalis).', 'S. 128 B, 130 A'),
    'ligg-alaria': S('Ligamenta alaria', 'Flügelbänder', 'Paarig; von den Seitenflächen des Dens zu den Innenflächen der Condyli occipitales.', 'S. 130 A d, 131 C'),
    'lig-apicis-dentis': S('Ligamentum apicis dentis', 'Zahnspitzenband', 'Unpaar; von der Densspitze zum Vorderrand des Foramen magnum.', 'S. 130 A d'),
    'fasciculi-longitudinales': S('Fasciculi longitudinales', 'Längszüge', 'Schwache vertikale Züge des Kreuzbandes vom Foramen magnum zum Axiskörper.', 'S. 130 A c'),
    'lig-cruciforme': S('Ligamentum cruciforme atlantis', 'Kreuzband des Atlas', 'Lig. transversum atlantis + Fasciculi longitudinales; wird nach Entfernen der Membrana tectoria sichtbar.', 'S. 130 A c'),
    'membrana-tectoria': S('Membrana tectoria', 'Deckmembran', 'Verbreiterte Fortsetzung des Lig. longitudinale posterius bis zum Clivus; vordere Wand des Wirbelkanals auf Höhe der Kopfgelenke.', 'S. 130 A b'),

    /* Bandscheibe & Bänder */
    'nucleus-pulposus': S('Nucleus pulposus', 'Gallertkern', 'Zu 80–85 % Wasser; wirkt als „Wasserkissen“ und verteilt den Druck auf Deck- und Bodenplatten.', 'S. 124 A, 125 E'),
    'anulus-fibrosus': S('Anulus fibrosus', 'Faserring', 'Zugfeste Hülle der Bandscheibe; wandelt Druck in Zug um.', 'S. 124 A–C'),
    'anulus-aussenzone': S('Außenzone des Anulus fibrosus', 'äußerer Faserring', 'Straffes Bindegewebe mit sich überkreuzenden Typ-I-Kollagenlamellen; in den Randleisten verankert.', 'S. 124 A–B'),
    'anulus-innenzone': S('Innenzone des Anulus fibrosus', 'innerer Faserring', 'Faserknorpel mit Typ-II-Kollagen, das in die hyalinen Deckplatten einstrahlt.', 'S. 124 A'),
    'deckplatte': S('Hyalinknorpelige Deck-/Bodenplatte', 'Abschlussplatte', 'Hyaliner Knorpel zwischen Bandscheibe und Wirbelkörper; die siebartige Knochenplatte darunter ernährt die Bandscheibe.', 'S. 124 C, 125 D'),
    'lig-longitudinale-anterius': S('Ligamentum longitudinale anterius', 'vorderes Längsband', 'Breit auf der Vorderseite der Wirbelkörper von der Schädelbasis bis zum Os sacrum; fest am Wirbelkörper, locker an der Bandscheibe.', 'S. 126 B, 127 D a'),
    'lig-longitudinale-posterius': S('Ligamentum longitudinale posterius', 'hinteres Längsband', 'Vom Clivus bis in den Sakralkanal; fest mit den Bandscheiben verwachsen, lässt seitlich aber Teile unverstärkt.', 'S. 126 B, 127 D b'),
    'lig-flavum': S('Ligamenta flava', 'gelbe Bänder', 'Elastisch, zwischen den Laminae; stabilisieren in der Sagittalebene und hemmen übermäßige Ventralflexion.', 'S. 126 C, 127 D c'),
    'lig-interspinale': S('Ligamenta interspinalia', 'Zwischendornfortsatzbänder', 'Verbinden benachbarte Dornfortsätze.', 'S. 126 B–C'),
    'lig-supraspinale': S('Ligamentum supraspinale', 'Überdornfortsatzband', 'Zieht über die Spitzen der Dornfortsätze; im Halsbereich zum Lig. nuchae verbreitert.', 'S. 126 B–C, 129 C'),

    /* Kreuzbein */
    'proc-articularis-superior-sacri': S('Processus articularis superior (Os sacrum)', 'oberer Gelenkfortsatz des Kreuzbeins', 'Nahezu frontal gestellt; artikuliert mit dem 5. Lendenwirbel.', 'S. 122 B'),
    'crista-sacralis-mediana': S('Crista sacralis mediana', 'mittlere Kreuzbeinleiste', 'Aus den verschmolzenen Dornfortsätzen.', 'S. 122 B'),
    'crista-sacralis-medialis': S('Crista sacralis medialis', 'innere Kreuzbeinleiste', 'Paarig, aus den verschmolzenen Gelenkfortsätzen; endet kaudal in den Cornua sacralia.', 'S. 122 B'),
    'crista-sacralis-lateralis': S('Crista sacralis lateralis', 'äußere Kreuzbeinleiste', 'Paarig lateral der Foramina sacralia posteriora; aus den verschmolzenen Querfortsätzen.', 'S. 122 B'),
    'foramina-sacralia-posteriora': S('Foramina sacralia posteriora', 'hintere Kreuzbeinlöcher', 'Austritt der Rr. dorsales der Sakralnerven.', 'S. 122 B, 123 E'),
    'hiatus-sacralis': S('Hiatus sacralis', 'Kreuzbeinspalt', 'Öffnung durch den fehlenden 5. Wirbelbogen; Zugang zum Canalis sacralis (Hiatus-sacralis-Anästhesie).', 'S. 122 B'),
    'cornua-sacralia': S('Cornua sacralia', 'Kreuzbeinhörner', 'Rudimentäre Gelenkfortsätze des 5. Sakralwirbels beiderseits des Hiatus sacralis.', 'S. 122 B'),
    'pars-lateralis': S('Pars lateralis', 'Seitenteil des Kreuzbeins', 'Aus Querfortsätzen und Rippenrudimenten; trägt seitlich die Facies auricularis.', 'S. 114 C d, 122 B'),
    'tuberositas-ossis-sacri': S('Tuberositas ossis sacri', 'Kreuzbeinrauigkeit', 'Ansatz der kräftigen Ligg. sacroiliaca interossea.', 'S. 123 C, 151 C'),
    /* ergänzt für die Tafeln mit echten Abbildungen (eigene Formulierungen) */
    'foramina-sacralia-anteriora': S('Foramina sacralia anteriora', 'vordere Kreuzbeinlöcher', 'Vier Lochpaare auf der Facies pelvica; Austritt der Rami anteriores der Sakralnerven.', 'S. 122 A'),
    'lineae-transversae': S('Lineae transversae', 'Querleisten', 'Quer verlaufende Leisten auf der Facies pelvica; Reste der Verschmelzung der fünf Sakralwirbelkörper.', 'S. 122 A'),
    'ala-ossis-sacri': S('Ala ossis sacri', 'Kreuzbeinflügel', 'Seitlicher Teil der Basis ossis sacri neben dem Promontorium; Teil der Pars lateralis.', 'S. 122 A'),
    'facies-auricularis': S('Facies auricularis', 'Ohrfläche', 'Ohrmuschelförmige Gelenkfläche an der Pars lateralis; bildet mit dem Os ilium das Iliosakralgelenk.', 'S. 122 B, 151 C'),
    'membrana-atlantooccipitalis-posterior': S('Membrana atlantooccipitalis posterior', 'hintere Atlas-Hinterhaupt-Membran', 'Spannt sich zwischen hinterem Atlasbogen und Hinterrand des Foramen magnum; wird seitlich von A. vertebralis und N. suboccipitalis durchbohrt.', 'S. 130 A, 131 C'),
    'sulcus-costae': S('Sulcus costae', 'Rippenfurche', 'Rinne am Unterrand der Rippeninnenseite; hier verlaufen die Interkostalgefäße und der N. intercostalis.', 'S. 143 D'),
    'apex-ossis-sacri': S('Apex ossis sacri', 'Kreuzbeinspitze', 'Kaudales schmales Ende des Kreuzbeins; Verbindung zum Steißbein.', 'S. 122 A–B'),

    /* Thorax */
    'incisura-jugularis': S('Incisura jugularis', 'Drosselgrubeneinschnitt', 'Oberrand des Manubrium; untere Begrenzung der tastbaren Drosselgrube.', 'S. 142 A'),
    'incisura-clavicularis': S('Incisura clavicularis', 'Schlüsselbeineinschnitt', 'Gelenkfläche des Manubrium für die Clavicula.', 'S. 142 A'),
    'manubrium': S('Manubrium sterni', 'Handgriff des Brustbeins', 'Oberster Teil des Sternum; Incisura costalis I für die 1. Rippe.', 'S. 142 A'),
    'angulus-sterni': S('Angulus sterni', 'Brustbeinwinkel', 'Knick zwischen Manubrium und Corpus; hier setzt die 2. Rippe an (wichtige Tastmarke).', 'S. 142 A'),
    'corpus-sterni': S('Corpus sterni', 'Brustbeinkörper', 'Mit den Incisurae costales III–VII.', 'S. 142 A'),
    'proc-xiphoideus': S('Processus xiphoideus', 'Schwertfortsatz', 'Trägt keine Rippen; sehr variabel, oft noch beim Erwachsenen knorpelig.', 'S. 142 A'),
    'sternum': S('Sternum', 'Brustbein', 'Manubrium, Corpus und Proc. xiphoideus.', 'S. 142 A'),
    'costa-prima': S('Costa prima', '1. Rippe', 'Kurz und breit, ohne Crista colli costae; synchondrotisch mit dem Manubrium verbunden.', 'S. 141 B, 143 C a'),
    'cartilago-costalis': S('Cartilago costalis', 'Rippenknorpel', 'Knorpeliger Teil der Rippe; wird von der 1. bis zur 7. Rippe länger, danach wieder kürzer.', 'S. 143 C–D'),
    'arcus-costalis': S('Arcus costalis', 'Rippenbogen', 'Aus den Knorpeln der 7.–10. Rippe; die 8.–10. Rippe legen sich jeweils der nächsthöheren an.', 'S. 140 A, 141 C'),
    'costae-verae': S('Costae verae (I–VII)', 'echte Rippen', 'Erreichen das Brustbein direkt.', 'S. 141 C'),
    'costae-spuriae': S('Costae spuriae (VIII–XII)', 'falsche Rippen', 'Erreichen das Sternum nicht direkt; VIII–X über den Rippenbogen.', 'S. 141 C'),
    'costae-fluctuantes': S('Costae fluctuantes (XI–XII)', 'freie Rippen', 'Enden frei in der seitlichen Bauchwand.', 'S. 141 C'),
    'apertura-superior': S('Apertura thoracis superior', 'obere Thoraxapertur', 'Obere Öffnung des Brustkorbs.', 'S. 140 A'),
    'apertura-inferior': S('Apertura thoracis inferior', 'untere Thoraxapertur', 'Untere Öffnung; wird mit dem Alter kleiner.', 'S. 140 A'),

    /* Rippe */
    'caput-costae': S('Caput costae', 'Rippenkopf', 'Artikuliert (2.–10. Rippe) mit zwei Wirbelkörpern; durch die Crista capitis costae geteilt.', 'S. 143 D, 145 C'),
    'collum-costae': S('Collum costae', 'Rippenhals', 'Vom Caput bis zum Tuberculum; die Bewegungsachse der Rippe verläuft parallel zum Rippenhals.', 'S. 143 C–D, 144 A'),
    'tuberculum-costae': S('Tuberculum costae', 'Rippenhöckerchen', 'Gelenkfläche für die Fovea costalis proc. transversi (1.–10. Rippe).', 'S. 143 D, 145 C'),
    'angulus-costae': S('Angulus costae', 'Rippenwinkel', 'Hier biegt der Rippenkörper nach vorn um; bildet bei Skoliose den Rippenbuckel.', 'S. 143 D, 141 D'),
    'corpus-costae': S('Corpus costae', 'Rippenkörper', 'Unten mit Sulcus costae für die Interkostalgefäße und -nerven (nicht bei 1., 11., 12. Rippe).', 'S. 143 C–D'),
    'art-capitis-costae': S('Articulatio capitis costae', 'Rippenkopfgelenk', 'Rippenkopf mit Fovea costalis; bei der 2.–10. Rippe zweikammerig durch das Lig. capitis costae intraarticulare.', 'S. 145 C'),
    'art-costotransversaria': S('Articulatio costotransversaria', 'Rippenhöckergelenk', 'Tuberculum costae mit Querfortsatz; fehlt bei der 11. und 12. Rippe.', 'S. 145 C'),
    'lig-capitis-costae-radiatum': S('Ligamentum capitis costae radiatum', 'Strahlenband des Rippenkopfes', 'Verstärkt die Kapsel aller Rippenkopfgelenke.', 'S. 145 C'),
    'lig-costotransversarium-laterale': S('Ligamentum costotransversarium laterale', 'seitliches Rippen-Querfortsatz-Band', 'Von der Querfortsatzspitze zum Tuberculum costae.', 'S. 145 C'),

    /* Becken */
    'crista-iliaca': S('Crista iliaca', 'Darmbeinkamm', 'Die Verbindungslinie der höchsten Punkte liegt auf Höhe des Dornfortsatzes L IV.', 'S. 109 C, 146 A'),
    'fossa-iliaca': S('Fossa iliaca', 'Darmbeingrube', 'Innenfläche der Darmbeinschaufel.', 'S. 146 A'),
    'sias': S('Spina iliaca anterior superior', 'vorderer oberer Darmbeinstachel', 'Gut tastbar; bei korrekter Beckenstellung auf einer Horizontalen mit der SIPS.', 'S. 111 C, 146 A'),
    'siai': S('Spina iliaca anterior inferior', 'vorderer unterer Darmbeinstachel', 'Unterhalb der SIAS am Vorderrand des Darmbeins.', 'S. 146 A'),
    'sips': S('Spina iliaca posterior superior', 'hinterer oberer Darmbeinstachel', 'Tastpunkt beim Vorlaufphänomen (Standing-Flexion-Test).', 'S. 146 A b, 150 B'),
    'art-sacroiliaca': S('Articulatio sacroiliaca', 'Iliosakralgelenk', 'Echtes Gelenk, aber durch straffe Kapsel und Bänder kaum beweglich (Amphiarthrose).', 'S. 150 A, 151 C'),
    'linea-terminalis': S('Linea terminalis', 'Grenzlinie', 'Promontorium – Linea arcuata – Pecten ossis pubis – oberer Symphysenrand; Grenze zwischen großem und kleinem Becken.', 'S. 149 B–C'),
    'spina-ischiadica': S('Spina ischiadica', 'Sitzbeinstachel', 'Ansatz des Lig. sacrospinale; Abstand beider Spinae = Diameter transversa der Beckenenge (11 cm).', 'S. 146 A, 149 C'),
    'acetabulum': S('Acetabulum', 'Hüftpfanne', 'Gelenkpfanne des Hüftgelenks, gebildet von Os ilium, ischii und pubis.', 'S. 146 A'),
    'foramen-obturatum': S('Foramen obturatum', 'Hüftbeinloch', 'Von der Membrana obturatoria verschlossen.', 'S. 146 A, 148 A'),
    'tuberculum-pubicum': S('Tuberculum pubicum', 'Schambeinhöcker', 'Höcker am Schambein seitlich der Symphyse.', 'S. 146 A'),
    'symphysis': S('Symphysis pubica', 'Schambeinfuge', 'Knorpelige Verbindung der Schambeine; schließt den Beckenring vorn.', 'S. 146 B, 149 C'),
    'tuber-ischiadicum': S('Tuber ischiadicum', 'Sitzbeinhöcker', 'Ansatz des Lig. sacrotuberale.', 'S. 146 A, 148 A'),
    'angulus-subpubicus': S('Angulus subpubicus / Arcus pubicus', 'unterer Schambeinwinkel', 'Mann ca. 70° (Angulus subpubicus), Frau 90–100° (Arcus pubicus).', 'S. 147 D, 149 D'),
    'os-ilium': S('Os ilium', 'Darmbein', 'Teil des Hüftbeins (Os coxae).', 'S. 146 A'),
    'os-pubis': S('Os pubis', 'Schambein', 'Teil des Hüftbeins mit R. superior und inferior.', 'S. 146 A, 147 C'),
    'os-ischii': S('Os ischii', 'Sitzbein', 'Teil des Hüftbeins mit Tuber und Spina ischiadica.', 'S. 146 A'),
    'lig-iliolumbale': S('Ligamentum iliolumbale', 'Darmbein-Lenden-Band', 'Vom Proc. costalis L IV/L V zur Crista iliaca; sichert dorsal das Iliosakralgelenk.', 'S. 148 A'),
    'ligg-sacroiliaca-posteriora': S('Ligamenta sacroiliaca posteriora', 'hintere Kreuz-Darmbein-Bänder', 'Bedecken die mächtigen Ligg. sacroiliaca interossea.', 'S. 148 A b, 151 C'),
    'lig-sacrotuberale': S('Ligamentum sacrotuberale', 'Kreuzbein-Sitzbeinhöcker-Band', 'Vom Kreuzbein zum Tuber ischiadicum; verhindert die dorsale Kippung des Beckens.', 'S. 148 A, 151 C'),
    'lig-sacrospinale': S('Ligamentum sacrospinale', 'Kreuzbein-Sitzbeinstachel-Band', 'Vom Kreuzbein zur Spina ischiadica; trennt Foramen ischiadicum majus und minus.', 'S. 148 A, 151 C'),
    'foramen-ischiadicum-majus': S('Foramen ischiadicum majus', 'großes Sitzbeinloch', 'Oberhalb des Lig. sacrospinale.', 'S. 148 A b'),
    'foramen-ischiadicum-minus': S('Foramen ischiadicum minus', 'kleines Sitzbeinloch', 'Zwischen Lig. sacrospinale und Lig. sacrotuberale.', 'S. 148 A b'),

    /* Beckenmaße */
    'conjugata-vera': S('Conjugata vera (Diameter conjugata)', 'wahrer gerader Durchmesser', 'Promontorium – Hinterrand der Symphyse: 11 cm; kleinster gerader Durchmesser des kleinen Beckens.', 'S. 149 B–C'),
    'conjugata-diagonalis': S('Conjugata diagonalis', 'schräger Durchmesser', 'Promontorium – Unterrand der Symphyse: 12,5–13 cm; vaginal abschätzbar.', 'S. 149 B–C'),
    'conjugata-recta': S('Conjugata recta', 'gerader Durchmesser des Beckenausgangs', 'Unterrand der Symphyse – Steißbeinspitze: 9 (+2) cm.', 'S. 149 B–C, 150 B')
  };

  const einheiten = [
    ['1.1', 'Rumpfskelett', 108], ['1.2', 'Knöcherne Wirbelsäule', 110], ['1.3', 'Entwicklung der Wirbelsäule', 112], ['1.4', 'Aufbau eines Wirbels', 114],
    ['1.5', 'Halswirbelsäule', 116], ['1.6', 'Brustwirbelsäule', 118], ['1.7', 'Lendenwirbelsäule', 120], ['1.8', 'Kreuzbein und Steißbein', 122],
    ['1.9', 'Bandscheibe', 124], ['1.10', 'Bandapparat der Wirbelsäule', 126], ['1.11', 'Bandapparat der HWS', 128], ['1.12', 'Bänder der Kopfgelenke', 130],
    ['1.13', 'Wirbelbogengelenk, Bewegungssegment, Bewegungsausmaß', 132], ['1.14', 'Unkovertebralgelenke', 134], ['1.15', 'Schnittbildanatomie der LWS', 136],
    ['1.16', 'Degenerative Veränderungen der LWS', 138], ['1.17', 'Knöcherner Brustkorb', 140], ['1.18', 'Brustbein und Rippen', 142],
    ['1.19', 'Rippenwirbelgelenke und Thoraxbewegungen', 144], ['1.20', 'Knöchernes Becken', 146], ['1.21', 'Bandapparat und Beckenmaße', 148], ['1.22', 'Iliosakralgelenk', 150]
  ].map(([nr, titel, seite]) => ({ nr, titel, seite }));

  /* Karteikarten: [Frage, Antwort, Einheit, Seite] */
  const karten = [
    ['Welche Knochen gehören zum Rumpfskelett?', 'Wirbelsäule, Rippen und Brustbein (Sternum).', '1.1', 'S. 108 A'],
    ['Welche Dornfortsätze dienen als Orientierung, und wo liegen sie?', 'C VII: Übergang HWS/BWS (Vertebra prominens) · Th III: Linie zwischen den Spinae scapulae · Th VII: Höhe der unteren Schulterblattwinkel · Th XII: knapp unterhalb des Ansatzes der 12. Rippe · L IV: Linie zwischen den höchsten Punkten der Cristae iliacae.', '1.1', 'S. 109 C'],
    ['Warum liegt der Dornfortsatz von Th V auf Höhe des 6. Brustwirbelkörpers?', 'Die Dornfortsätze der BWS verlaufen schräg abwärts.', '1.1', 'S. 109 C'],
    ['Nenne die vier Abschnitte und Krümmungen der Wirbelsäule.', 'HWS – Zervikallordose · BWS – Thorakalkyphose · LWS – Lumballordose · Os sacrum – Sakralkyphose.', '1.2', 'S. 111 B'],
    ['Lumbalisation vs. Sakralisation?', 'Lumbalisation: S I nicht mit dem Kreuzbein verschmolzen, also ein Lendenwirbel zusätzlich. Sakralisation: L V mit dem Kreuzbein synostosiert, also ein Lendenwirbel weniger.', '1.2', 'S. 111 B'],
    ['Lumbosakralwinkel, Sakralwinkel, Beckenneigungswinkel: Werte?', 'Lumbosakralwinkel ca. 143° · Sakralwinkel ca. 30° · Beckenneigungswinkel ca. 60°.', '1.2', 'S. 111 C'],
    ['Welche Strukturen liegen im Schwerelot?', 'Äußerer Gehörgang, Dens axis, die Übergänge zwischen Lordosen und Kyphosen und der Körperschwerpunkt direkt ventral des Promontorium.', '1.2', 'S. 111 C'],
    ['In welche Anteile differenzieren sich die Somiten?', 'Myotom, Dermatom und Sklerotom. Aus den Sklerotomzellen entsteht die Wirbelsäule.', '1.3', 'S. 112 A'],
    ['Wie entsteht ein Wirbelkörper aus den Sklerotomen?', 'Kaudaler und kranialer Sklerotomabschnitt benachbarter Segmente verschmelzen. Deshalb überbrücken die Myotome später die Bandscheibe und verbinden zwei Wirbel (Bewegungssegment).', '1.3', 'S. 112 A'],
    ['Spondylolyse und Spondylolisthesis?', 'Spondylolyse: meist beidseitiger Defekt der Wirbelbögen (v. a. L IV/L V). Spondylolisthesis: Abgleiten des Wirbelkörpers nach vorn (Wirbelgleiten), wenn zusätzlich die Bandscheibe geschädigt ist.', '1.3', 'S. 112 A'],
    ['Welche Krümmung hat die Wirbelsäule des Neugeborenen?', 'Sie ist durchgehend kyphosiert. Halslordose und Lendenlordose entstehen erst postnatal.', '1.3', 'S. 113 B–C'],
    ['Aus welchen Bauelementen besteht ein typischer Wirbel?', 'Wirbelkörper, Wirbelbogen, Dornfortsatz, zwei Querfortsätze (an der LWS Procc. costales) und vier Gelenkfortsätze.', '1.4', 'S. 114 A'],
    ['Wo steckt das Rippenrudiment in den einzelnen Wirbelsäulenabschnitten?', 'HWS: Tuberculum anterius · BWS: echte Rippe · LWS: Proc. costalis · Os sacrum: vorderer Teil der Pars lateralis.', '1.4', 'S. 114 C'],
    ['Warum kann eine Halsrippe Beschwerden machen?', 'Sie engt die Skalenuslücke ein und drückt auf Plexus brachialis und A. subclavia (Halsrippensyndrom).', '1.4', 'S. 114 B'],
    ['Wie verändern sich Wirbelkörper und Wirbelloch von kranial nach kaudal?', 'Die Wirbelkörper werden größer, die Wirbellöcher kleiner.', '1.4', 'S. 115 D'],
    ['Typische Merkmale der Halswirbel C III–C VII?', 'Kleiner, fast würfelförmiger Körper, großes dreieckiges Wirbelloch, Procc. uncinati, Foramen transversarium, Sulcus n. spinalis, Gelenkflächen ca. 45° geneigt, Dornfortsatz kurz und gegabelt (außer C VII).', '1.5', 'S. 116 A'],
    ['Ab welchem Halswirbel verläuft die A. vertebralis in den Foramina transversaria?', 'Ab C VI nach kranial.', '1.5', 'S. 116 A'],
    ['Wie artikulieren die Rippenköpfe mit den Brustwirbelkörpern?', 'Th I–IX haben oben und unten halbe Foveae, zwei Wirbel bilden zusammen eine Pfanne. Th I hat oben eine ganze Pfanne, Th X nur eine obere Fovea, Th XI und XII je eine komplette Fovea costalis.', '1.6', 'S. 118 A'],
    ['Welche Brustwirbel haben keine Fovea costalis proc. transversi?', 'Th XI und Th XII.', '1.6', 'S. 118 A'],
    ['Wie sind die Gelenkflächen der BWS ausgerichtet?', 'Untere Gelenkflächen nach ventral, obere nach dorsal.', '1.6', 'S. 118 A'],
    ['Typische Merkmale der Lendenwirbel?', 'Kräftiger, querovaler Körper, dreieckiges Wirbelloch, breiter abgeplatteter Dornfortsatz, Procc. costales mit Proc. accessorius, Procc. mammillares, sagittal gestellte Gelenkflächen.', '1.7', 'S. 120 A'],
    ['Welche Leisten trägt das Kreuzbein dorsal, und woraus sind sie entstanden?', 'Crista sacralis mediana aus den Dornfortsätzen, medialis aus den Gelenkfortsätzen, lateralis aus den Querfortsätzen.', '1.8', 'S. 122 B'],
    ['Was ist der Hiatus sacralis?', 'Die Öffnung durch den fehlenden 5. Sakralwirbelbogen zwischen den Cornua sacralia. Er ist Zugang zum Canalis sacralis (Hiatus-sacralis-Anästhesie).', '1.8', 'S. 122 B'],
    ['Wodurch treten die Sakralnerven aus?', 'Sie verlaufen durch T-förmige Kanäle. Die Rr. ventrales treten durch die Foramina sacralia anteriora aus, die Rr. dorsales durch die Foramina sacralia posteriora.', '1.8', 'S. 123 E'],
    ['Aufbau des Anulus fibrosus?', 'Außenzone: straffes Bindegewebe, Typ-I-Kollagen in sich überkreuzenden Lamellen, in den Randleisten verankert. Innenzone: Faserknorpel, Typ-II-Kollagen, strahlt in die hyalinen Deckplatten ein.', '1.9', 'S. 124 A'],
    ['Wie wird die Bandscheibe ernährt?', 'Durch Diffusion aus den Gefäßen der Markräume über die siebartig poröse knöcherne Abschlussplatte. Be- und Entlastung pumpen dabei Flüssigkeit hinaus und wieder hinein.', '1.9', 'S. 125 D–E'],
    ['Um wie viel nimmt die Körperlänge im Tagesverlauf ab und warum?', 'Um etwa 1 % (1,5–2 cm), weil die Bandscheiben unter Dauerbelastung Flüssigkeit abgeben.', '1.9', 'S. 125 E'],
    ['Wirbelkörperbänder und Wirbelbogenbänder: Welche gibt es?', 'Wirbelkörperbänder: Lig. longitudinale anterius und posterius. Wirbelbogenbänder: Ligg. flava, Ligg. interspinalia, Lig. supraspinale, Lig. nuchae, Ligg. intertransversaria.', '1.10', 'S. 126 B'],
    ['Warum sind die Ligg. flava gelb, und welche Funktion haben sie?', 'Sie bestehen überwiegend aus elastischen Fasern. Sie stabilisieren in der Sagittalebene, hemmen übermäßige Ventralflexion und helfen beim Aufrichten.', '1.10', 'S. 127 D'],
    ['Zwischen welchen Punkten verläuft das Lig. nuchae?', 'Zwischen der Protuberantia occipitalis externa und der Vertebra prominens. Es ist das verbreiterte Lig. supraspinale.', '1.11', 'S. 126 B, 129 C'],
    ['Aus welchen Gelenken bestehen die Kopfgelenke?', 'Oberes Kopfgelenk: Art. atlantooccipitalis (paarig). Unteres Kopfgelenk: Art. atlantoaxialis lateralis (paarig) und Art. atlantoaxialis mediana (unpaar, zwei Abteilungen). Insgesamt sechs Gelenke.', '1.11', 'S. 128 B'],
    ['Woraus besteht das Lig. cruciforme atlantis?', 'Aus dem Lig. transversum atlantis (kräftig, horizontal) und den Fasciculi longitudinales (schwach, vertikal).', '1.12', 'S. 130 A c'],
    ['Was ist die Membrana tectoria?', 'Die verbreiterte Fortsetzung des Lig. longitudinale posterius. Sie bildet die vordere Wand des Wirbelkanals auf Höhe der Kopfgelenke.', '1.12', 'S. 130 A b'],
    ['Woraus besteht ein Bewegungssegment, und wie viele gibt es?', 'Bandscheibe, paarige Wirbelbogengelenke, Bänder, Muskeln und klinisch auch der Inhalt von Foramen intervertebrale und Wirbelkanal. Insgesamt gibt es 25 Bewegungssegmente.', '1.13', 'S. 132 B'],
    ['Wie misst man die Beweglichkeit nach Schober und Ott?', 'Schober: Hautmarke an S I und 10 cm darüber, bei Vorneigung bis ca. 15 cm (LWS). Ott: von C VII 30 cm abwärts, Zunahme bis ca. 4 cm (BWS).', '1.13', 'S. 133 F'],
    ['Was sind Unkovertebralgelenke?', 'Seitliche Spalten in den Bandscheiben von C III–C VII. Sie entstehen um das 10. Lebensjahr, wenn die Procc. uncinati den Wirbelkörper darüber berühren. Beschrieben von Luschka als „Hemiarthroses laterales“.', '1.14', 'S. 134 A'],
    ['Warum ist eine Unkarthrose klinisch bedeutsam?', 'Osteophyten engen das Foramen intervertebrale (Spinalnerv) und die A. vertebralis ein. Auch eine Spinalkanalstenose ist möglich.', '1.14', 'S. 134 B, 135 D'],
    ['Auf welcher Höhe endet das Rückenmark, und wo punktiert man?', 'Der Conus medullaris liegt meist auf Höhe von L I (manchmal L II). Lumbalpunktion unterhalb von L III, der Durasack reicht bis S II.', '1.15', 'S. 136 A–B'],
    ['Welche Nervenwurzel komprimiert ein mediolateraler Bandscheibenvorfall?', 'In der Regel die tiefer liegende Wurzel. In über 90 % der Fälle sind L5 oder S1 betroffen.', '1.16', 'S. 139 D–E'],
    ['L4, L5, S1: Kennmuskel und Reflex?', 'L4: Oberschenkelstrecker, Patellarsehnenreflex · L5: Fußheber, Tibialis-posterior-Reflex · S1: Fußsenker, Achillessehnenreflex.', '1.16', 'S. 139 E'],
    ['Echte, falsche und freie Rippen?', 'Costae verae I–VII: direkt am Sternum. Costae spuriae VIII–XII: VIII–X über den Rippenbogen. Costae fluctuantes XI–XII: enden frei.', '1.17', 'S. 141 C'],
    ['Woran erkennt man eine Skoliose beim Vorbeugen?', 'Am Rippenbuckel auf der Konvexseite durch die Torsion der Wirbelkörper. Am häufigsten ist sie rechtskonvex auf Höhe Th VIII/IX.', '1.17', 'S. 141 D'],
    ['Welche Brustbein-Rippen-Verbindungen sind echte Gelenke?', 'Meist die der 2.–5. Rippe. Die 1., 6. und 7. Rippe sind synchondrotisch verbunden.', '1.18', 'S. 142 B'],
    ['Abschnitte einer Rippe von dorsal nach ventral?', 'Caput costae, Collum costae, Tuberculum costae, Corpus costae mit Angulus costae, Cartilago costalis.', '1.18', 'S. 143 D'],
    ['Welche Rippen artikulieren nur mit einem Wirbelkörper?', 'Die 1., 11. und 12. Rippe.', '1.19', 'S. 145 C'],
    ['Wie wirkt sich die Rippenhebung oben und unten am Thorax aus?', 'Oben stehen die Achsen eher frontal, der sagittale Durchmesser wird größer. Unten stehen sie eher sagittal, der transversale Durchmesser wird größer.', '1.19', 'S. 144 A'],
    ['Welche Bänder sichern die Art. costotransversaria?', 'Lig. costotransversarium laterale, Lig. costotransversarium und Lig. costotransversarium superius.', '1.19', 'S. 145 C'],
    ['Was bildet den Beckenring?', 'Die beiden Hüftbeine (Ossa coxae) und das Kreuzbein, verbunden über die Iliosakralgelenke und die Symphysis pubica.', '1.20', 'S. 146 B'],
    ['Geschlechtsunterschiede am Becken?', 'Weiblich: größer und ausladender, Beckeneingang queroval, Schambeinwinkel 90–100° (Arcus pubicus), Kreuzbein auf Höhe S3/S4 abgeknickt. Männlich: massiver, steiler und enger, Promontorium springt stärker vor, ca. 70° (Angulus subpubicus).', '1.20', 'S. 147 D'],
    ['Innere Beckenmaße der Frau?', 'Conjugata vera 11 cm · diagonalis 12,5–13 cm · recta 9 (+2) cm · Diameter transversa Eingang 13 cm · transversa Beckenenge 11 cm · obliquae 12 cm.', '1.21', 'S. 149 C'],
    ['Äußere Beckenmaße beim Mann?', 'Distantia interspinosa 25–26 cm · intercristalis 28–29 cm · Conjugata externa 20–21 cm.', '1.21', 'S. 149 C'],
    ['Was zeigt ein positives Vorlaufphänomen?', 'Eine Blockierung des Iliosakralgelenks auf dieser Seite. Beim Vorbeugen wandert die SIPS dieser Seite früher nach kranial.', '1.22', 'S. 150 B'],
    ['Welche Bänder sichern das Iliosakralgelenk?', 'Ventral die Ligg. sacroiliaca anteriora. Dorsal die Ligg. sacroiliaca interossea und posteriora sowie die Ligg. iliolumbalia. Zusätzlich Lig. sacrotuberale und Lig. sacrospinale.', '1.22', 'S. 151 C']
  ].map(([f, a, e, ref], i) => ({ id: 'k' + i, f, a, e, ref }));

  /* Prüfungsfragen: [Frage, [Optionen], richtigerIndex, Erklärung, Einheit, Seite] */
  const fragen = [
    ['Welcher Dornfortsatz liegt auf Höhe der Verbindungslinie beider Cristae iliacae?', ['L II', 'L IV', 'Th XII', 'S I'], 1, 'Die Linie zwischen den höchsten Punkten der Darmbeinkämme kreuzt den Dornfortsatz von L IV.', '1.1', 'S. 109 C'],
    ['Wie heißen die Querfortsätze der Lendenwirbel?', ['Procc. transversi', 'Procc. mammillares', 'Procc. costales', 'Procc. uncinati'], 2, 'Sie sind Rippenrudimente und heißen deshalb Procc. costales.', '1.2', 'S. 110 A, 120 A'],
    ['Welche Aussage zur Sakralisation trifft zu?', ['S I ist nicht mit dem Kreuzbein verschmolzen', 'L V ist mit dem Kreuzbein synostosiert', 'Es gibt einen zusätzlichen Lendenwirbel', 'Sie betrifft den zervikothorakalen Übergang'], 1, 'Bei der Sakralisation fehlt funktionell ein Lendenwirbel, weil L V mit dem Kreuzbein verschmolzen ist.', '1.2', 'S. 111 B'],
    ['Wie groß ist der Beckenneigungswinkel bei aufrechter Haltung etwa?', ['30°', '45°', '60°', '143°'], 2, 'Ca. 60°, gemessen zwischen Beckeneingangsebene und Horizontaler.', '1.2', 'S. 111 C'],
    ['Welche Krümmung ist schon beim Neugeborenen vorhanden?', ['Zervikallordose', 'Lumballordose', 'Kyphose der gesamten Wirbelsäule', 'Keine Krümmung'], 2, 'Durch die Haltung im Uterus ist die Wirbelsäule durchgehend kyphosiert.', '1.3', 'S. 113 B'],
    ['In welcher Entwicklungswoche beginnt die Verknöcherung im Zentrum der Wirbelkörper?', ['4. Woche', '6. Woche', '8. Woche', '12. Woche'], 2, '6. Woche: Verknorpelung · 8. Woche: Beginn der Verknöcherung · 10. Woche: Vasa nutricia.', '1.3', 'S. 112 A'],
    ['Was ist ein Rest der Chorda dorsalis in der Bandscheibe?', ['Anulus fibrosus', 'Nucleus pulposus', 'Deckplatte', 'Epiphysis anularis'], 1, 'Der Nucleus pulposus geht aus den Chordasegmenten hervor.', '1.3', 'S. 112 A e'],
    ['Welche Struktur entspricht an einem Halswirbel dem Rippenrudiment?', ['Tuberculum posterius', 'Tuberculum anterius', 'Proc. uncinatus', 'Proc. articularis superior'], 1, 'Die vordere Spange mit dem Tuberculum anterius ist das Rippenrudiment.', '1.4', 'S. 114 C'],
    ['Durch welche Öffnung zieht die A. vertebralis an der HWS?', ['Foramen vertebrale', 'Foramen intervertebrale', 'Foramen transversarium', 'Sulcus n. spinalis'], 2, 'Durch die Foramina transversaria, in der Regel ab C VI.', '1.5', 'S. 116 A'],
    ['Welcher Halswirbel hat einen langen, nicht gegabelten Dornfortsatz?', ['C II', 'C IV', 'C VI', 'C VII'], 3, 'C VII ist die Vertebra prominens.', '1.5', 'S. 116 A'],
    ['Welche Brustwirbel haben seitlich jeweils eine komplette Fovea costalis?', ['Th I und II', 'Th IX und X', 'Th XI und XII', 'Alle'], 2, 'Th XI und XII artikulieren je allein mit ihrer Rippe.', '1.6', 'S. 118 A'],
    ['Wie sind die Gelenkflächen der Wirbelbogengelenke in der LWS ausgerichtet?', ['Etwa 45° zur Horizontalen', 'Frontal', 'Nahezu sagittal und senkrecht', 'Horizontal'], 2, 'Die LWS-Facetten stehen senkrecht und nahezu sagittal, deshalb ist kaum Rotation möglich.', '1.7', 'S. 120 A, 132 A'],
    ['Welcher Fortsatz entspricht beim Lendenwirbel dem eigentlichen Querfortsatz?', ['Proc. costalis', 'Proc. accessorius', 'Proc. mammillaris', 'Proc. spinosus'], 1, 'Der kleine Proc. accessorius an der Basis des Proc. costalis.', '1.7', 'S. 120 A'],
    ['Aus welchen Fortsätzen entsteht die Crista sacralis lateralis?', ['Dornfortsätze', 'Gelenkfortsätze', 'Querfortsätze', 'Rippenrudimente'], 2, 'Mediana aus den Dornfortsätzen, medialis aus den Gelenkfortsätzen, lateralis aus den Querfortsätzen.', '1.8', 'S. 122 B'],
    ['Wie hoch ist der Wasseranteil des Nucleus pulposus?', ['40–50 %', '60–65 %', '80–85 %', '95 %'], 2, 'Die Glykosaminoglykane binden reversibel 80–85 % Wasser.', '1.9', 'S. 125 E'],
    ['Welche Aussage zum Lig. longitudinale anterius ist richtig?', ['Es ist fest mit den Bandscheiben verwachsen', 'Es entspringt am Clivus', 'Es ist fest mit den Wirbelkörpern, locker mit den Bandscheiben verbunden', 'Es ist schwächer als das hintere Längsband'], 2, 'Beim hinteren Längsband ist es umgekehrt: Es ist fest mit den Bandscheiben verwachsen.', '1.10', 'S. 127 D'],
    ['Warum kommen Bandscheibenvorfälle häufig lateral vor?', ['Das Lig. flavum fehlt dort', 'Das Lig. longitudinale posterius lässt die Bandscheibe seitlich unverstärkt', 'Der Nucleus liegt lateral', 'Die Procc. costales drücken'], 1, 'Das hintere Längsband dehnt sich nur zipfelförmig aus, seitliche Teile der Bandscheibe bleiben ohne Verstärkung.', '1.10', 'S. 127 D'],
    ['Welches Band ist das „Lig. flavum“ zwischen Atlas und Os occipitale?', ['Membrana tectoria', 'Membrana atlantooccipitalis posterior', 'Lig. apicis dentis', 'Lig. nuchae'], 1, 'Die Membrana atlantooccipitalis posterior zieht vom hinteren Atlasbogen zum Hinterrand des Foramen magnum.', '1.12', 'S. 130 A a'],
    ['Wohin ziehen die Ligg. alaria?', ['Vom Dens zum Vorderrand des Foramen magnum', 'Vom Dens zu den Innenflächen der Condyli occipitales', 'Zwischen den Massae laterales', 'Vom Axis zum Clivus'], 1, 'Zum Vorderrand des Foramen magnum zieht das unpaare Lig. apicis dentis.', '1.12', 'S. 130 A d'],
    ['Welches Gelenk übernimmt fast 70 % der Rotation der HWS?', ['Art. atlantooccipitalis', 'Art. atlantoaxialis lateralis', 'Art. atlantoaxialis mediana', 'Unkovertebralgelenke'], 2, 'Deshalb zeigt sich dort im Alter häufig eine Arthrose der vorderen Abteilung.', '1.12', 'S. 131 B'],
    ['Wie viele Bewegungssegmente hat die Wirbelsäule?', ['23', '24', '25', '33'], 2, 'Insgesamt 25 Bewegungssegmente.', '1.13', 'S. 132 B'],
    ['Welcher Wert entspricht einem normalen Schober-Zeichen?', ['10 → 12 cm', '10 → 15 cm', '30 → 34 cm', '30 → 40 cm'], 1, 'Schober (LWS): 10 → ca. 15 cm. Ott (BWS): 30 → ca. 34 cm.', '1.13', 'S. 133 F'],
    ['Wie groß ist die Rotation der LWS (zu jeder Seite) etwa?', ['5°', '20°', '35°', '50°'], 0, 'Nur etwa 5°, wegen der sagittal stehenden Gelenkfacetten.', '1.13', 'S. 133 E'],
    ['Ab welchem Alter entstehen die Unkovertebralspalten?', ['Bei Geburt', 'Etwa ab dem 10. Lebensjahr', 'In der Pubertät', 'Ab dem 30. Lebensjahr'], 1, 'Die Procc. uncinati treten etwa um das 10. Lebensjahr in Kontakt mit dem Wirbel darüber.', '1.14', 'S. 134 A'],
    ['Auf welcher Höhe endet der Durasack?', ['L I', 'L III', 'S II', 'Os coccygis'], 2, 'Der Durasack endet auf Höhe von S II, der Conus medullaris meist auf Höhe von L I.', '1.15', 'S. 136 B'],
    ['Wo liegt der Conus medullaris beim Neugeborenen?', ['Th XII', 'L I', 'L III', 'S I'], 2, 'Bei Geburt auf Höhe von L III, bis ca. zum 10. Lebensjahr wandert er nach kranial.', '1.15', 'S. 136 A'],
    ['Was beschreibt die Claudicatio spinalis?', ['Durch Schmerzen limitierte Gehstrecke bei Spinalkanalstenose', 'Durchblutungsstörung der Beine', 'Blockierung des ISG', 'Rippenbuckel'], 0, 'Die Beschwerden bessern sich bei Kyphosierung der LWS, z. B. im Sitzen mit vorgeneigtem Oberkörper.', '1.16', 'S. 138 B'],
    ['Ein Patient hat einen abgeschwächten Achillessehnenreflex und eine Fußsenkerschwäche. Welche Wurzel ist betroffen?', ['L3', 'L4', 'L5', 'S1'], 3, 'S1: Achillessehnenreflex und Fußsenker. L5: Fußheber. L4: Patellarsehnenreflex.', '1.16', 'S. 139 E'],
    ['Welche Rippen sind Costae fluctuantes?', ['VIII–X', 'XI–XII', 'I–VII', 'X–XII'], 1, 'Die 11. und 12. Rippe enden frei in der seitlichen Bauchwand.', '1.17', 'S. 141 C'],
    ['Wo setzt die 2. Rippe am Sternum an?', ['Am Manubrium oben', 'Am Angulus sterni', 'Am Proc. xiphoideus', 'Am Corpus sterni unten'], 1, 'Am Übergang Manubrium/Corpus, dem Angulus sterni, liegt die Incisura costalis II.', '1.18', 'S. 142 A'],
    ['Welche Rippe ist normalerweise am längsten?', ['1.', '5.', '7.', '10.'], 2, 'Die 1. und 12. Rippe sind am kürzesten, die 7. am längsten.', '1.18', 'S. 143 C'],
    ['Welches Band teilt das Rippenkopfgelenk der 2.–10. Rippe in zwei Kammern?', ['Lig. capitis costae radiatum', 'Lig. capitis costae intraarticulare', 'Lig. costotransversarium', 'Lig. costotransversarium laterale'], 1, 'Es zieht von der Crista capitis costae zur Bandscheibe.', '1.19', 'S. 145 C'],
    ['Warum fehlt bei der 11. und 12. Rippe das Rippenhöckergelenk?', ['Die Rippen haben keinen Hals', 'Die Querfortsätze von Th XI/XII haben keine Gelenkflächen', 'Sie sind mit dem Sternum verbunden', 'Sie besitzen kein Caput'], 1, 'An Th XI und XII fehlt die Fovea costalis proc. transversi.', '1.19', 'S. 145 C'],
    ['Wie groß ist der untere Schambeinwinkel beim Mann etwa?', ['50°', '70°', '90°', '110°'], 1, 'Beim Mann ca. 70° (Angulus subpubicus), bei der Frau 90–100° (Arcus pubicus).', '1.20', 'S. 147 D, 149 D'],
    ['Welches ist der kleinste gerade Durchmesser des kleinen Beckens?', ['Conjugata diagonalis', 'Conjugata vera', 'Conjugata recta', 'Diameter transversa'], 1, 'Die Conjugata vera (11 cm) ist geburtshilflich am wichtigsten.', '1.21', 'S. 149 C'],
    ['Zwischen welchen Punkten misst man die Conjugata diagonalis?', ['Promontorium – Hinterrand Symphyse', 'Promontorium – Unterrand Symphyse', 'Unterrand Symphyse – Steißbeinspitze', 'Zwischen den Spinae ischiadicae'], 1, '12,5–13 cm, durch vaginale Untersuchung abschätzbar.', '1.21', 'S. 149 C'],
    ['Welche Struktur trennt das Foramen ischiadicum majus vom minus?', ['Lig. sacrotuberale', 'Lig. sacrospinale', 'Lig. iliolumbale', 'Membrana obturatoria'], 1, 'Das Lig. sacrospinale zieht zur Spina ischiadica.', '1.21', 'S. 148 A'],
    ['Was passiert bei einer Nutation des Kreuzbeins nach vorn?', ['Conjugata recta wird kleiner', 'Promontorium wandert nach kranial-dorsal', 'Conjugata recta wird größer', 'Das ISG blockiert'], 2, 'Das Promontorium geht nach kaudal-ventral, das Steißbein nach kranial-dorsal, dadurch wird der Beckenausgang weiter.', '1.22', 'S. 150 B'],
    ['Welche Bänder liegen in der Tiefe direkt hinter dem Iliosakralgelenk?', ['Ligg. sacroiliaca anteriora', 'Ligg. sacroiliaca interossea', 'Lig. sacrospinale', 'Lig. inguinale'], 1, 'Die mächtigen Ligg. sacroiliaca interossea ziehen von der Tuberositas iliaca zur Tuberositas ossis sacri.', '1.22', 'S. 151 C'],
    ['Wie wird das Iliosakralgelenk funktionell eingeordnet?', ['Synchondrose', 'Syndesmose', 'Amphiarthrose', 'Kugelgelenk'], 2, 'Es ist ein echtes Gelenk, das durch Kapsel und Bänder stark eingeschränkt ist.', '1.22', 'S. 151 C']
  ].map(([f, o, r, x, e, ref], i) => ({ id: 'f' + i, f, o, r, x, e, ref }));

  /* Sortieren: Merkmal → Abschnitt */
  const sortieren = {
    titel: 'Welcher Wirbel?',
    kategorien: ['Halswirbel', 'Brustwirbel', 'Lendenwirbel', 'Os sacrum'],
    ref: 'S. 115 D, 116–123',
    items: [
      ['Foramen transversarium', 0], ['Proc. uncinatus', 0], ['Gegabelter Dornfortsatz', 0], ['Sulcus n. spinalis', 0], ['Gelenkflächen ca. 45° zur Horizontalen', 0], ['Tuberculum anterius = Rippenrudiment', 0], ['Großes, dreieckiges Wirbelloch bei kleinem Körper', 0],
      ['Fovea costalis superior und inferior', 1], ['Fovea costalis proc. transversi', 1], ['Rundes Wirbelloch', 1], ['Dachziegelartig nach kaudal geneigte Dornfortsätze', 1], ['Obere Gelenkflächen weisen nach dorsal', 1],
      ['Proc. costalis', 2], ['Proc. mammillaris', 2], ['Proc. accessorius', 2], ['Gelenkflächen sagittal und senkrecht', 2], ['Querovaler, kräftigster Wirbelkörper', 2], ['Breiter, seitlich abgeplatteter Dornfortsatz', 2],
      ['Crista sacralis mediana', 3], ['Hiatus sacralis', 3], ['Facies auricularis', 3], ['Promontorium', 3], ['Lineae transversae', 3], ['Vier Lochpaare ventral und dorsal statt Zwischenwirbellöchern', 3]
    ].map(([t, k], i) => ({ id: 's' + i, t, k }))
  };

  /* Tabellen-Drill: Lückentabellen */
  const tabellen = [
    {
      id: 'bewegung', titel: 'Bewegungsausmaß der Wirbelsäule (in Grad)', ref: 'S. 133 E', einheit: '1.13',
      spalten: ['Ventralflexion', 'Dorsalextension', 'Lateralflexion*', 'Rotation*'],
      zeilen: [['oberes Kopfgelenk', ['20', '10', '5', '–']], ['unteres Kopfgelenk', ['–', '–', '–', '35']], ['gesamte HWS', ['65', '40', '35', '50']],
        ['BWS', ['35', '25', '20', '35']], ['LWS', ['50', '35', '20', '5']], ['HWS + BWS + LWS', ['150', '100', '75', '90']]],
      fuss: '* zu jeder Seite'
    },
    {
      id: 'becken', titel: 'Beckenmaße (in cm)', ref: 'S. 149 C', einheit: '1.21',
      spalten: ['Wert'],
      zeilen: [['Conjugata vera', ['11']], ['Conjugata diagonalis', ['12,5–13']], ['Conjugata recta', ['9']], ['Diameter transversa (Beckeneingang)', ['13']],
        ['Diameter transversa (Beckenenge)', ['11']], ['Diameter obliqua', ['12']], ['Distantia interspinosa (Mann)', ['25–26']], ['Distantia intercristalis (Mann)', ['28–29']], ['Conjugata externa (Mann)', ['20–21']]],
      fuss: 'Conjugata recta: 9 (+2) cm, weil das Steißbein bei der Geburt nach hinten ausweicht.'
    },
    {
      id: 'rippen', titel: 'Rippen-Wirbel-Verbindungen', ref: 'S. 118 A, 145 C', einheit: '1.19',
      spalten: ['Rippenkopf artikuliert mit …', 'Rippenhöckergelenk?'],
      zeilen: [['1. Rippe', ['Th I', 'ja']], ['2.–10. Rippe', ['zwei Wirbelkörpern', 'ja']], ['11. Rippe', ['Th XI', 'nein']], ['12. Rippe', ['Th XII', 'nein']]],
      fuss: 'Bei der 2.–10. Rippe teilt das Lig. capitis costae intraarticulare das Gelenk in zwei Kammern.'
    }
  ];

  (window.KAPITEL_LISTE = window.KAPITEL_LISTE || []).push({
    id: 'rumpf-knochen', start: 108,
    intro: 'Lerntrainer für das Testat zum Rumpfskelett: Wirbelsäule, Bandscheibe, Bänder, Kopfgelenke, Thorax, Becken und Iliosakralgelenk. Die Tafeln sind echte anatomische Abbildungen (Gray’s Anatomy, 1918) mit abgedeckter Beschriftung.',
    band: 'Allgemeine Anatomie und Bewegungssystem',
    teil: 'Rumpfwand',
    titel: 'Knochen, Bänder und Gelenke',
    seiten: 'S. 108–151',
    einheiten, strukturen, karten, fragen, sortieren, tabellen,
    tafeln: window.TAFELN_RUMPF
  });
})();
