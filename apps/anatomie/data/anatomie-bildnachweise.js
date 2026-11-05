/* ═══════════════════════════════════════════════════════
   Lernwelt – apps/anatomie/data/anatomie-bildnachweise.js
   Bildnachweise der Tafeln. Alle Bilder: Wikimedia Commons, Tafeln aus
   Henry Gray, Anatomy of the Human Body, 20. Auflage, Lea & Febiger, Philadelphia 1918
   (Abbildungen u. a. von Henry Vandyke Carter) – gemeinfrei (Public Domain, Urheberrecht abgelaufen).
   Gespeichert: unverändert (verlustfrei neu komprimiert) in apps/anatomie/bilder/;
   die App legt Masken über die englische Originalbeschriftung.
   Neues Bild: Eintrag mit bild, titel, seite (Dateiseite auf Commons), autor, lizenz, lizenzUrl, aenderung.
   ═══════════════════════════════════════════════════════ */
(function () {
  const g = (nr, titel) => ({
    bild: 'bilder/gray' + nr + '.png',
    titel: 'Gray’s Anatomy (1918), Fig. ' + nr + ': ' + titel,
    seite: 'https://commons.wikimedia.org/wiki/File:Gray' + nr + '.png',
    autor: 'Henry Gray, Anatomy of the Human Body (20. Aufl. 1918), Zeichnung Henry Vandyke Carter u. a.',
    lizenz: 'gemeinfrei (Public Domain)',
    lizenzUrl: 'https://commons.wikimedia.org/wiki/Commons:Licensing',
    aenderung: 'Originalbeschriftung in der App abgedeckt, Pins ergänzt'
  });
  window.ANATOMIE_BILDNACHWEISE = {
    gray84: g(84, "A cervical vertebra."),
    gray85: g(85, "Side view of a typical cervical vertebra."),
    gray86: g(86, "First cervical vertebra, or atlas."),
    gray87: g(87, "Second cervical vertebra, or epistropheus, from above."),
    gray88: g(88, "Second cervical vertebra, epistropheus, or axis, from the side."),
    gray89: g(89, "Seventh cervical vertebra (vertebra prominens)."),
    gray90: g(90, "A thoracic vertebra."),
    gray91: g(91, "Peculiar thoracic vertebræ."),
    gray93: g(93, "A lumbar vertebra from above and behind."),
    gray94: g(94, "A lumbar vertebra from above."),
    gray95: g(95, "Sacrum, pelvic surface."),
    gray96: g(96, "Sacrum, dorsal surface."),
    gray97: g(97, "Lateral surfaces of sacrum and coccyx."),
    gray98: g(98, "Base of sacrum."),
    gray112: g(112, "The thorax from in front. (Spalteholz.)"),
    gray114: g(114, "The thorax from the right. (Spalteholz.)"),
    gray115: g(115, "Anterior surface of sternum and costa cartilages."),
    gray116: g(116, "Posterior surface of sternum."),
    gray117: g(117, "Lateral border of sternum."),
    gray118: g(118, "Ossification of the sternum."),
    gray121: g(121, ""),
    gray122: g(122, "A central rib of the left side. Inferior aspect."),
    gray241: g(241, "Male pelvis"),
    gray242: g(242, "Female pelvis"),
    gray300: g(300, "Synovial joint."),
    gray301: g(301, "Median sagittal section of two lumbar vertebræ and their ligaments."),
    gray302: g(302, "Posterior longitudinal ligament, in the thoracic region."),
    gray303: g(303, "Vertebral arches of three thoracic vertebrae viewed from the front."),
    gray304: g(304, "Anterior atlantoöccipital membrane and atlantoaxial ligament."),
    gray305: g(305, "Posterior atlantoöccipital membrane and atlantoaxial ligament."),
    gray306: g(306, "Articulation between odontoid process and atlas."),
    gray307: g(307, "Membrana tectoria, transverse, and alar ligaments."),
    gray308: g(308, "Median sagittal section through the occipital bone and first three cervical vertebræ. (Spalteholz.)"),
    gray309: g(309, "Articulation of the mandible. Lateral aspect."),
    gray310: g(310, "Articulation of the mandible. Medial aspect."),
    gray311: g(311, "Sagittal section of the articulation of the mandible."),
    gray312: g(312, "Costovertebral articulations. Anterior view."),
    gray313: g(313, "Costotransverse articulation. Seen from above."),
    gray314: g(314, "Section of the costotransverse joints from the third to the ninth inclusive. Constrast the concave facets on the upper with the flattened facets on the lower transverse processes."),
    gray319: g(319, "Anterior articulations of pelvis (Quain)"),
    gray320: g(320, "Posterior articulations of pelvis (Quain)"),
  };
})();
