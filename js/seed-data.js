const DATA_VER=4;
// Tarifs transitaire TOUT-COMPRIS (fret + douane + taxes) — la TVA n'est jamais ajoutée par-dessus.
// trf  : frais de transfert de fonds {mode:'pct'|'fixe', val} appliqués sur le coût d'achat HT
// assu : Trade Assurance optionnelle (désactivée par défaut), même structure + interrupteur `on`
// tvaInterne : TVA affichée séparément UNIQUEMENT pour les clients professionnels assujettis
const DS={tauxChange:95,tarifAerien:11000,tarifMaritime:230000,tauxMarge:35,tvaInterne:18,trf:{mode:'pct',val:0},assu:{on:false,mode:'pct',val:1.5}};
const CATS={Hydrafacial:'HYD','Picolaser/Tatouage':'PCL','Analyse de peau':'ADP','RF Microneedling':'RFM',HIFU:'HIF',Dentaire:'DEN','Photothérapie LED':'PDT','Équipement & Accessoires':'EQP'};
const ICO=(n,c='')=>`<svg class="ic${c?' '+c:''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const TRI=t=>t==='Aérien'?ICO('plane'):ICO('ship');
const PH_LG='<span class="ph-lg">'+ICO('box')+'</span>';
const PH_SM='<span class="ph-sm">'+ICO('box')+'</span>';
function phFallback(img){const w=img.parentElement;if(w)w.innerHTML=PH_LG;}

const RAWBASE='https://raw.githubusercontent.com/dinaagz/Go-Flow/main/';
const IMG=n=>RAWBASE+'assets/Products%20images/1%20('+n+').jpeg';
const IMG2=n=>RAWBASE+'assets/Products%20images/2%20('+n+').jpeg';

// Fournisseurs réels
const DF=[
  {
    id:'F001',
    nom:'Shaanxi Yateli Technology Limited',
    contact:'Bailey',
    email:'bailey@hkyateli.com',
    pays:'Chine',
    wa:'+86 187 9265 6926',
    wc:'+852 46655289',
    dom:'Équipement esthétique & médical professionnel',
    an:'',eval:4,
    ali:'Vérifié',
    ali_url:'https://yatelihk.m.en.alibaba.com/',
    lang:'Chinois, Anglais',
    mkt:'Afrique, Moyen-Orient, Europe',
    desc:'Fabricant spécialisé en équipements esthétiques et médicaux professionnels. Référence Alibaba : yatelihk.',
    com:'',
    logo:RAWBASE+'assets/supplier/Logo%20Yateli.avif',
    devis:RAWBASE+'assets/Quotes/Quotes7.6_Shaanxi%20Yateli%20Technology%20Limited.pdf'
  },
  {
    id:'F002',
    nom:'Oman Medical Beauty Manufacture',
    contact:'Clara Xiang',
    email:'clara@omancn.com',
    pays:'Chine',
    wa:'+86 173 9193 0659',
    wc:'+852 46655289',
    dom:'Équipement esthétique & beauté professionnels',
    an:'',eval:4,
    ali:'Vérifié',
    ali_url:'https://omanbeauty.en.alibaba.com/',
    lang:'Chinois, Anglais',
    mkt:'Afrique, Europe, Asie',
    desc:'Fabricant d\'équipements esthétiques et de beauté professionnels. Référence Alibaba : omanbeauty.',
    com:'',
    logo:RAWBASE+'assets/supplier/logo%20Oman%20Beauty.png',
    devis:RAWBASE+'assets/Quotes/Quotes7.7_Oman%20Medical%20Beauty%20Manufacture.pdf'
  },
  {
    id:'F003',
    nom:'Paine Agent Sourcing',
    contact:'Paine',
    email:'',
    pays:'Chine',
    wa:'+86 185 3719 5235',
    wc:'+86 185 3719 5235',
    dom:'Agent sourcing multi-catégories (beauté & bien-être, équipement maison, textile, électronique, sport)',
    an:'2024',eval:4,
    ali:'Non disponible',
    ali_url:'',
    lang:'Anglais, Français (traduction), Chinois',
    mkt:'Togo (Lomé), Afrique de l\'Ouest',
    desc:'Agent de sourcing basé en Chine, actif depuis mai 2024. Sans usine propre : recherche produits via son réseau de fournisseurs, négocie les prix et MOQ, contrôle la qualité (photos/vidéos) et expédie via cargo (TAKLEE CARGO, YongHai). Paiements via Eugène (Togo) ou WeChat/Alipay.',
    com:'Regroupe les petits articles dans les grands cartons pour réduire le CBM. Maritime ~2 mois (CBM), aérien ~2 semaines (kg), fret payé à l\'arrivée à Lomé.',
    logo:RAWBASE+'assets/supplier/Paine%20Agent/Image%20Paine%20Agent.png',
    devis:RAWBASE+'assets/Quotes/Quotes%201.%20Paine%20Agent.xlsx'
  }
];

// Mapping correct images ↔ produits (basé sur analyse visuelle)
// img1=RF chariot, img2=RF stylo, img3=Skin compact dome, img4=Pico compact SL,
// img5=Hydrafacial dome LED, img6=Hydrafacial 17en1, img7=Skin grand ecran,
// img8=Pico grand SANO, img9=HIFU, img10=Hydrafacial dome+lit LED, img11=Pico compact SANO
const DP=[
  {grp:'hydrafacial-14en1',   cat:'Hydrafacial',fn:'Shaanxi Yateli Technology Limited',nom:'Hydrafacial 14-en-1',l:49,la:54,h:92,kg:48,prix:2999,tr:'Maritime',specs:'49×54×92 cm',imgs:[IMG(6),IMG2(38),IMG2(39)]},
  {grp:'hydrafacial-17en1',   cat:'Hydrafacial',fn:'Shaanxi Yateli Technology Limited',nom:'Hydrafacial 17-en-1',l:54,la:122,h:60,kg:55,prix:5200,tr:'Maritime',specs:'54×122×60 cm',img:IMG(6)},
  {grp:'hydrafacial-17en1',   cat:'Hydrafacial',fn:'Oman Medical Beauty Manufacture',nom:'Hydrafacial 17-en-1',l:54,la:122,h:60,kg:55,prix:6372,tr:'Maritime',specs:'54×122×60 cm',img:IMG(6)},
  {grp:'hydrafacial-dome-led',cat:'Hydrafacial',fn:'Shaanxi Yateli Technology Limited',nom:'Hydrafacial dôme LED + masque',l:65,la:62,h:122,kg:55,prix:6200,tr:'Maritime',specs:'65×62×122 cm (50 kg) + masque 55×48×46 cm (5 kg)',img:IMG(5)},
  {grp:'hydrafacial-dome-led',cat:'Hydrafacial',fn:'Oman Medical Beauty Manufacture',nom:'Hydrafacial dôme LED + masque',l:65,la:62,h:122,kg:55,prix:7390,tr:'Maritime',specs:'65×62×122 cm (50 kg) + masque 5 kg',img:IMG(10)},
  {grp:'hydrafacial-compact',  cat:'Hydrafacial',fn:'Oman Medical Beauty Manufacture',nom:'Hydrafacial compact écran tactile',l:54,la:51,h:101,kg:48,prix:4198,tr:'Maritime',specs:'54×51×101 cm',img:IMG(5)},
  {grp:'picolaser-grand',      cat:'Picolaser/Tatouage',fn:'Shaanxi Yateli Technology Limited',nom:'Picolaser grand modèle écran 15.6"',l:57,la:52,h:55,kg:35,prix:8999,tr:'Maritime',specs:'57×52×55 cm',img:IMG(8)},
  {grp:'picolaser-grand',      cat:'Picolaser/Tatouage',fn:'Oman Medical Beauty Manufacture',nom:'Picolaser ND YAG format 15.6"',l:57,la:52,h:55,kg:35,prix:10109,tr:'Maritime',specs:'57×52×55 cm',img:IMG(8)},
  {grp:'picolaser-compact',    cat:'Picolaser/Tatouage',fn:'Shaanxi Yateli Technology Limited',nom:'Picolaser compact écran tactile',l:43,la:57,h:56,kg:24.5,prix:3000,tr:'Maritime',specs:'43×57×56 cm',img:IMG(4)},
  {grp:'skin-compact-13',      cat:'Analyse de peau',fn:'Shaanxi Yateli Technology Limited',nom:'Skin Analysis compact 13.3"',l:56,la:65,h:57,kg:11,prix:4500,tr:'Maritime',specs:'56×65×57 cm',img:IMG(3)},
  {grp:'skin-compact-13',      cat:'Analyse de peau',fn:'Oman Medical Beauty Manufacture',nom:'Skin Analysis compact 13.3"',l:68,la:62,h:55,kg:10,prix:5558,tr:'Maritime',specs:'68×62×55 cm',img:IMG(3)},
  {grp:'skin-grand-15',        cat:'Analyse de peau',fn:'Shaanxi Yateli Technology Limited',nom:'Skin Analysis grand écran 15.6"',l:68,la:59,h:44,kg:18,prix:5500,tr:'Maritime',specs:'68×59×44 cm',img:IMG(7)},
  {grp:'skin-grand-15',        cat:'Analyse de peau',fn:'Oman Medical Beauty Manufacture',nom:'Skin Analysis grand écran 15.6"',l:67,la:59,h:44,kg:20,prix:5829,tr:'Maritime',specs:'67×59×44 cm',img:IMG(7)},
  {grp:'rf-stylo',             cat:'RF Microneedling',fn:'Shaanxi Yateli Technology Limited',nom:'RF Microneedle stylo portable',l:24,la:38,h:43,kg:4,prix:1500,tr:'Maritime',specs:'24×38×43 cm',img:IMG(2)},
  {grp:'rf-stylo',             cat:'RF Microneedling',fn:'Oman Medical Beauty Manufacture',nom:'RF Microneedle stylo portable',l:18,la:7,h:4,kg:0.16,prix:2025,tr:'Aérien',specs:'18×7×4 cm — très léger (160 g)',img:IMG(2)},
  {grp:'rf-chariot',           cat:'RF Microneedling',fn:'Shaanxi Yateli Technology Limited',nom:'RF Microneedle sur chariot',l:50,la:50,h:103,kg:28,prix:3300,tr:'Maritime',specs:'50×50×103 cm',img:IMG(1)},
  {grp:'rf-chariot',           cat:'RF Microneedling',fn:'Oman Medical Beauty Manufacture',nom:'RF Microneedle sur chariot',l:50,la:50,h:103,kg:28,prix:3730,tr:'Maritime',specs:'50×50×103 cm',img:IMG(1)},
  {grp:'hifu',                 cat:'HIFU',fn:'Shaanxi Yateli Technology Limited',nom:'HIFU liftant visage/corps',l:66,la:59,h:55,kg:22,prix:3900,tr:'Maritime',specs:'66×59×55 cm',img:IMG(9)},
  {grp:'hifu',                 cat:'HIFU',fn:'Oman Medical Beauty Manufacture',nom:'HIFU liftant visage/corps',l:62,la:55,h:56,kg:27,prix:6726,tr:'Maritime',specs:'62×55×56 cm',img:IMG(9)},
  // Quote Yateli 7.6 — images assets/Products images/2 (n).jpeg
  {grp:'pdt-grand',cat:'Photothérapie LED',fn:'Shaanxi Yateli Technology Limited',nom:'Lampe PDT professionnelle sur pied',l:116.5,la:52.5,h:60,kg:21.2,prix:1699,tr:'Maritime',specs:'Unité 116.5×52.5×60 cm (16.7 kg) + lampe 80.5×30×37 cm (4.5 kg)',imgs:[IMG2(13),IMG2(26)]},
  {grp:'',cat:'RF Microneedling',fn:'Shaanxi Yateli Technology Limited',nom:'Hydra.Pen stylo microneedling',l:20,la:11,h:14,kg:0.4,prix:240,tr:'Aérien',specs:'20×11×14 cm — 0.4 kg',imgs:[IMG2(19),IMG2(35)]},
  {grp:'',cat:'Équipement & Accessoires',fn:'Shaanxi Yateli Technology Limited',nom:'Refroidisseur d\'air sur pied',l:37.5,la:27,h:101.2,kg:6.3,prix:1699,tr:'Maritime',specs:'37.5×27×101.2 cm — 6.3 kg · 55 W · rotation 270°',imgs:[IMG2(15),IMG2(37),IMG2(16)]},
  {grp:'',cat:'Équipement & Accessoires',fn:'Shaanxi Yateli Technology Limited',nom:'Parasol déporté professionnel',l:270,la:40,h:16,kg:45,prix:1299,tr:'Maritime',specs:'270×40×16 cm + 84×82×20 cm — 45 kg',imgs:[IMG2(20),IMG2(36)]},
  {grp:'',cat:'Équipement & Accessoires',fn:'Shaanxi Yateli Technology Limited',nom:'Support inox à roulettes',l:0,la:0,h:0,kg:4,prix:99,tr:'Aérien',specs:'4 kg — base 5 pieds à roulettes',imgs:[IMG2(11),IMG2(33)]},
  {grp:'',cat:'Équipement & Accessoires',fn:'Shaanxi Yateli Technology Limited',nom:'Écran LED rotatif sur pied',l:81,la:68,h:21,kg:20,prix:3399,tr:'Maritime',specs:'81×68×21 cm — 20 kg',imgs:[IMG2(14)]},
  {grp:'pdt-dome',cat:'Photothérapie LED',fn:'Shaanxi Yateli Technology Limited',nom:'Dôme LED photothérapie PDT',l:34.5,la:27.5,h:20,kg:2.1,prix:249,tr:'Aérien',specs:'34.5×27.5×20 cm — 2.1 kg',imgs:[IMG2(8)]},
  {grp:'',cat:'Équipement & Accessoires',fn:'Shaanxi Yateli Technology Limited',nom:'Gel conducteur MELAO (lot de 3)',l:0,la:0,h:0,kg:1,prix:40,tr:'Aérien',moq:3,specs:'Tube 1 kg — lot de 3',imgs:[IMG2(9),IMG2(23),IMG2(24)]},
  {grp:'',cat:'Dentaire',fn:'Shaanxi Yateli Technology Limited',nom:'Protège-dents silicone',l:0,la:0,h:0,kg:0.5,prix:13,tr:'Aérien',specs:'0.5 kg',imgs:[IMG2(21),IMG2(18)]},
  {grp:'',cat:'Dentaire',fn:'Shaanxi Yateli Technology Limited',nom:'Kit blanchiment dentaire GlorySmile',l:0,la:0,h:0,kg:0.5,prix:19,tr:'Aérien',specs:'0.5 kg — seringues de gel + applicateur',imgs:[IMG2(4),IMG2(29),IMG2(30)]},
  {grp:'',cat:'Dentaire',fn:'Shaanxi Yateli Technology Limited',nom:'Dentifrice correcteur V34 GlorySmile',l:0,la:0,h:0,kg:0.5,prix:12,tr:'Aérien',specs:'0.5 kg — correcteur de teinte violet',imgs:[IMG2(6),IMG2(27)]},
  // Quote Oman 7.7
  {grp:'',cat:'Dentaire',fn:'Oman Medical Beauty Manufacture',nom:'Détartreur ultrasonique compact',l:37,la:10,h:36,kg:4,prix:1490,tr:'Maritime',specs:'37×10×36 cm — 4 kg · détartrage + traitement canalaire',imgs:[IMG2(2),IMG2(3),IMG2(41)]},
  {grp:'',cat:'Dentaire',fn:'Oman Medical Beauty Manufacture',nom:'Détartreur ultrasonique écran tactile',l:45,la:40,h:35,kg:9,prix:5000,tr:'Maritime',specs:'45×40×35 cm — 9 kg · détartrage + traitement canalaire',imgs:[IMG2(42),IMG2(1)]},
  {grp:'pdt-dome',cat:'Photothérapie LED',fn:'Oman Medical Beauty Manufacture',nom:'Dôme LED spectromètre',l:36,la:29,h:22,kg:4,prix:880,tr:'Aérien',specs:'36×29×22 cm — 4 kg · peau + pousse des cheveux',imgs:[IMG2(7)]},
  {grp:'pdt-grand',cat:'Photothérapie LED',fn:'Oman Medical Beauty Manufacture',nom:'Lampe PDT spectromètre sur pied',l:116.5,la:52.5,h:60,kg:21.2,prix:2000,tr:'Maritime',specs:'Lampe 80.5×30×37 cm (4.5 kg) + unité principale (16.7 kg)',imgs:[IMG2(26),IMG2(13)]}
];

// Transitaire par défaut — E & C Logistics (groupage.cn), spécialiste Chine → Afrique de l'Ouest
// Tarifs tout-compris corridor Chine–Lomé (fret + douane + taxes), modifiables dans l'onglet Transitaires
const DT=[{
  id:'T001',nom:'E & C Logistics',dep:'Chine',arr:'Togo',
  contact:'easyway@ewchina.net',wa:'+86 159 2035 6527',tel:'400-900-9962',
  type:'Multimodale',ent:0,
  mar:230000,mard:60,aer:11000,aerd:7,ass:'0',
  logo:RAWBASE+'assets/Freight%20Forwarders/E%20%26%20C%20Logistics/images/logo2.d70eae83.png'
}];
